import { getAsync, runAsync, allAsync } from './database.js';
import bcrypt from 'bcryptjs';
import { generateToken } from './auth.js';

export async function signup(username, email, password) {
  // Validate inputs
  if (!username || !email || !password) {
    throw new Error('Username, email, and password are required');
  }

  if (password.length < 6) {
    throw new Error('Password must be at least 6 characters');
  }

  // Check if user exists
  const existing = await getAsync(
    'SELECT * FROM users WHERE username = ? OR email = ?',
    [username, email]
  );

  if (existing) {
    throw new Error('Username or email already exists');
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create user
  const result = await runAsync(
    'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
    [username, email, hashedPassword]
  );

  const token = generateToken(result.lastID);
  return { id: result.lastID, username, email, token };
}

export async function login(email, password) {
  // Validate inputs
  if (!email || !password) {
    throw new Error('Email and password are required');
  }

  // Find user
  const user = await getAsync(
    'SELECT * FROM users WHERE email = ?',
    [email]
  );

  if (!user) {
    throw new Error('Invalid email or password');
  }

  // Check password
  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    throw new Error('Invalid email or password');
  }

  const token = generateToken(user.id);
  return { id: user.id, username: user.username, email: user.email, token };
}

export async function getUserById(userId) {
  const user = await getAsync(
    'SELECT id, username, email, createdAt FROM users WHERE id = ?',
    [userId]
  );
  return user || null;
}

export async function getUserAnalysisHistory(userId) {
  const history = await allAsync(
    'SELECT * FROM analysis_history WHERE userId = ? ORDER BY createdAt DESC',
    [userId]
  );
  return history || [];
}

export async function saveAnalysisResult(userId, analysisData) {
  const result = await runAsync(
    `INSERT INTO analysis_history (userId, imageName, disease, severity, confidence, notes)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      userId,
      analysisData.imageName,
      analysisData.disease,
      analysisData.severity,
      analysisData.confidence,
      analysisData.notes
    ]
  );
  return result;
}
