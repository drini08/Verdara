import './env.js';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { signup, login, getUserById, getUserAnalysisHistory, saveAnalysisResult } from './users.js';
import { authMiddleware, optionalAuthMiddleware } from './auth.js';
import { analyzeCropImage } from './analysisEngine.js';
import { analyzeFieldPolygon } from './fieldAnalysis.js';
import { getMoistureGrid, getRadarOverlay, getRainForecastGrid, getWeatherRisk } from './weatherService.js';
import { getMarketplacePosts, createMarketplacePost, addComment, getPostComments, updateMarketplacePost, deletePost, markPostAsCompleted } from './marketplace.js';
import { generateMarketplaceItemImage } from './openaiService.js';
import { initializeDatabase, getCollection, updateRecord, removeRecord } from './database.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true
}));
app.use(express.json());

// Upload configuration
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP allowed.'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Verdara backend is running' });
});

// Authentication routes
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const user = await signup(username, email, password);
    res.status(201).json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await login(email, password);
    res.json(user);
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

app.get('/api/auth/user', authMiddleware, async (req, res) => {
  try {
    const user = await getUserById(req.userId);
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Analysis routes
app.post('/api/analyze-disease', optionalAuthMiddleware, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image provided' });
    }

    const result = await analyzeCropImage(req.file.buffer, req.file.originalname);

    // Save to history if user is authenticated
    if (req.userId) {
      await saveAnalysisResult(req.userId, {
        imageName: req.file.originalname,
        disease: result.disease,
        severity: result.severity,
        confidence: result.confidence / 100,
        notes: result.notes
      });
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/analysis-history', authMiddleware, async (req, res) => {
  try {
    const history = await getUserAnalysisHistory(req.userId);
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/gee/analyze', async (req, res) => {
  try {
    console.log('[api] /api/gee/analyze request received', {
      crop: req.body?.crop || null,
      pointCount: Array.isArray(req.body?.polygon) ? req.body.polygon.length : 0
    });
    const result = await analyzeFieldPolygon(req.body?.polygon, { crop: req.body?.crop });
    console.log('[api] /api/gee/analyze request succeeded', {
      crop: result.crop,
      imageCount: result.satelliteMetrics?.imageCount ?? 0,
      healthScore: result.healthScore
    });
    res.json(result);
  } catch (err) {
    console.error('[api] /api/gee/analyze request failed', {
      error: err.message
    });
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/weather/field', async (req, res) => {
  try {
    const weather = await getWeatherRisk(req.query);
    res.json(weather);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/weather/radar', async (req, res) => {
  try {
    const radar = await getRadarOverlay();
    res.json(radar);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/weather/moisture', async (req, res) => {
  try {
    const moisture = await getMoistureGrid(req.query);
    res.json(moisture);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/weather/rain-forecast', async (req, res) => {
  try {
    const forecast = await getRainForecastGrid(req.query);
    res.json(forecast);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Marketplace routes
app.get('/api/marketplace/posts', async (req, res) => {
  try {
    const status = req.query.status || 'active';
    const posts = await getMarketplacePosts(status);
    res.json(posts);
  } catch (err) {
    console.error('Failed to fetch marketplace posts:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/marketplace/posts', authMiddleware, async (req, res) => {
  try {
    const { type, title, description, quantity, price, location, category } = req.body;

    // Generate an AI image for the listing (non-blocking on failure)
    const imageUrl = await generateMarketplaceItemImage(title, description);

    const postId = await createMarketplacePost(req.userId, {
      type, title, description, quantity, price, location, category, imageUrl
    });
    res.status(201).json({ id: postId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/marketplace/posts/:id/comments', async (req, res) => {
  try {
    const comments = await getPostComments(req.params.id);
    res.json(comments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/marketplace/posts/:id/comments', authMiddleware, async (req, res) => {
  try {
    const commentId = await addComment(req.params.id, req.userId, req.body.comment);
    res.status(201).json({ id: commentId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/marketplace/posts/:id', authMiddleware, async (req, res) => {
  try {
    const { type, title, description, quantity, price, location, category } = req.body;
    const success = await updateMarketplacePost(req.params.id, req.userId, {
      type, title, description, quantity, price, location, category
    });
    if (success) {
      res.json({ message: 'Post updated successfully' });
    } else {
      res.status(403).json({ error: 'Not authorized or post not found' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/marketplace/posts/:id', authMiddleware, async (req, res) => {
  try {
    const success = await deletePost(req.params.id, req.userId);
    if (success) {
      res.json({ message: 'Post deleted successfully' });
    } else {
      res.status(403).json({ error: 'Not authorized or post not found' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/marketplace/posts/:id/complete', authMiddleware, async (req, res) => {
  try {
    const success = await markPostAsCompleted(req.params.id, req.userId);
    if (success) {
      res.json({ message: 'Post marked as completed' });
    } else {
      res.status(403).json({ error: 'Not authorized or post not found' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

async function migrateMarketplaceImages() {
  console.log('Running marketplace image migration/cleanup...');
  try {
    const posts = await getCollection('marketplacePosts');
    console.log(`Found ${posts.length} posts to verify.`);
    for (const post of posts) {
      if (!post.imageUrl) {
        console.log(`Generating image for post ${post.id}: "${post.title}"`);
        const imageUrl = await generateMarketplaceItemImage(post.title, post.description);
        if (imageUrl) {
          await updateRecord(`marketplacePosts/${post.id}`, { imageUrl });
          console.log(`Updated post ${post.id} with generated image.`);
        } else {
          console.log(`Failed to generate image for post ${post.id}. Deleting post.`);
          await removeRecord(`marketplacePosts/${post.id}`);
          await removeRecord(`marketplaceComments/${post.id}`);
        }
      }
    }
    console.log('Marketplace image migration/cleanup completed.');
  } catch (err) {
    console.error('Error during marketplace image migration:', err.message);
  }
}

async function startServer() {
  try {
    await initializeDatabase();

    app.listen(PORT, () => {
      console.log(`Verdara backend running on http://localhost:${PORT}`);
      // Run migration in background
      migrateMarketplaceImages();
    });
  } catch (err) {
    console.error('Failed to start Verdara backend:', err.message);
    process.exit(1);
  }
}

startServer();
