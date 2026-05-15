# Verdara - Crop Disease Analysis Platform

## Setup Instructions

### 1. Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Start the backend server:
```bash
npm run dev
```

The backend server will run on `http://localhost:5000`

### 2. Frontend Setup

1. From the root directory, install dependencies:
```bash
npm install
```

2. Start the frontend development server:
```bash
npm run dev
```

The frontend will run on `http://localhost:5173`

## Features

### Authentication
- **Signup**: Create a new account
- **Login**: Sign in to your account
- **Logout**: Sign out from your account
- Protected routes with JWT tokens

### Crop Disease Analysis
- Upload crop/plant images
- AI-powered disease detection using image analysis
- Confidence scores for disease predictions
- Detailed symptom descriptions
- Management recommendations
- Severity assessment

## Authentication Flow

1. Users can create an account or log in
2. Upon successful authentication, a JWT token is stored in localStorage
3. Token is sent with API requests for authenticated endpoints
4. Analysis history is saved per user (requires login)

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/user` - Get current user (requires auth)

### Analysis
- `POST /api/analyze-disease` - Analyze crop image (multipart form data)
- `GET /api/analysis-history` - Get user's analysis history (requires auth)

## Database

SQLite database is automatically initialized when the backend starts. The database file is created at `backend/verdara.db`

### Tables
- `users` - User accounts and authentication
- `analysis_history` - Analysis results per user

## Environment Variables

### Backend (.env)
```
PORT=5000
JWT_SECRET=your_secret_key_here
NODE_ENV=development
GEMINI_API_KEY=your_api_key_here
# or, for Vertex AI
GOOGLE_CLOUD_PROJECT=your_project_id
GOOGLE_CLOUD_LOCATION=us-central1
```

## Technologies Used

### Frontend
- React 18
- Vite
- CSS (CSS Variables)

### Backend
- Node.js with Express
- SQLite3
- bcryptjs (password hashing)
- jsonwebtoken (JWT authentication)
- sharp (image processing)
- multer (file uploads)

## Enhanced Crop Analysis

The analysis engine now includes:
- Improved color pixel analysis
- Multi-disease detection database
- Confidence scoring based on image characteristics
- Detailed symptom descriptions
- Actionable management recommendations
- Detection of: Early Blight, Late Blight, Powdery Mildew, Rust, Leaf Spot, Mosaic Virus, and Healthy plants

## Next Steps for Enhancement

1. Integrate real ML model (TensorFlow.js, ONNX, etc.)
2. Add more disease categories
3. Implement image caching and optimization
4. Add weather integration for better recommendations
5. Create mobile app
6. Add batch analysis for multiple images
7. Implement user profile and analytics dashboard
