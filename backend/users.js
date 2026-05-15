import bcrypt from 'bcryptjs';
import { generateToken } from './auth.js';
import { getCollection, getRecord, pushRecord } from './database.js';

const USERS_PATH = 'users';
const ANALYSIS_HISTORY_PATH = 'analysisHistory';

export async function signup(username, email, password) {
  // Validate inputs
  if (!username || !email || !password) {
    throw new Error('Username, email, and password are required');
  }

  if (password.length < 6) {
    throw new Error('Password must be at least 6 characters');
  }

  const existingUsers = await getCollection(USERS_PATH);
  const existing = existingUsers.find((user) => user.username === username || user.email === email);

  if (existing) {
    throw new Error('Username or email already exists');
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  const userId = await pushRecord(USERS_PATH, {
    username,
    email,
    password: hashedPassword,
    location: null,
    createdAt: new Date().toISOString()
  });

  if (!userId) {
    throw new Error('Failed to create user');
  }

  const token = generateToken(userId);
  return { id: userId, username, email, token };
}

export async function login(email, password) {
  // Validate inputs
  if (!email || !password) {
    throw new Error('Email and password are required');
  }

  const users = await getCollection(USERS_PATH);
  const user = users.find((entry) => entry.email === email);

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
  const user = await getRecord(`${USERS_PATH}/${userId}`);
  if (!user) {
    return null;
  }

  const { password, ...safeUser } = user;
  return {
    id: safeUser.id ?? userId,
    username: safeUser.username,
    email: safeUser.email,
    createdAt: safeUser.createdAt
  };
}

export async function getUserAnalysisHistory(userId) {
  const history = await getCollection(`${ANALYSIS_HISTORY_PATH}/${userId}`);
  return history.sort((left, right) => new Date(right.createdAt ?? 0) - new Date(left.createdAt ?? 0));
}

export async function saveAnalysisResult(userId, analysisData) {
  if (!userId) {
    return null;
  }

  const existingUser = await getRecord(`${USERS_PATH}/${userId}`);
  if (!existingUser) {
    return null;
  }

  const record = {
    userId,
    imageName: analysisData.imageName,
    disease: analysisData.disease,
    severity: analysisData.severity,
    confidence: analysisData.confidence,
    notes: analysisData.notes,
    createdAt: new Date().toISOString()
  };

  const recordId = await pushRecord(`${ANALYSIS_HISTORY_PATH}/${userId}`, record);
  return { id: recordId, ...record };
}
