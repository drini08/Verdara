import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import { signup, login, getUserById, getUserAnalysisHistory, saveAnalysisResult } from './users.js';
import { authMiddleware, optionalAuthMiddleware } from './auth.js';
import { analyzeCropImage } from './analysisEngine.js';
import { getMarketplacePosts, createMarketplacePost, addComment, getPostComments, updateMarketplacePost, deletePost, markPostAsCompleted } from './marketplace.js';
import { initializeDatabase } from './database.js';

dotenv.config();

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
    const postId = await createMarketplacePost(req.userId, {
      type, title, description, quantity, price, location, category
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

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

async function startServer() {
  try {
    await initializeDatabase();

    app.listen(PORT, () => {
      console.log(`Verdara backend running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start Verdara backend:', err.message);
    process.exit(1);
  }
}

startServer();
