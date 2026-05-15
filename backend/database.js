import { Buffer } from 'node:buffer';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';

let firebaseDb = null;
let firebaseInitPromise = null;

function normalizePath(pathValue) {
  if (Array.isArray(pathValue)) {
    return pathValue.filter(Boolean).join('/');
  }

  if (typeof pathValue === 'string') {
    return pathValue.replace(/^\/+|\/+$/g, '');
  }

  throw new Error('Firebase path must be a string or an array of path segments.');
}

function cleanBase64Value(value) {
  return value.replace(/\s+/g, '');
}

function decodeFirebaseServiceAccount() {
  const encodedKey = process.env.FIREBASE_DB_KEY?.trim();
  if (!encodedKey) {
    throw new Error('FIREBASE_DB_KEY is required to initialize Firebase Realtime Database.');
  }

  const compactKey = cleanBase64Value(encodedKey);
  const decodedJson = Buffer.from(compactKey, 'base64').toString('utf8');
  const reencoded = Buffer.from(decodedJson, 'utf8').toString('base64').replace(/=+$/g, '');
  const normalizedInput = compactKey.replace(/=+$/g, '');

  if (!decodedJson || reencoded !== normalizedInput) {
    throw new Error('FIREBASE_DB_KEY must be a valid Base64-encoded Firebase service account JSON key.');
  }

  let serviceAccount;
  try {
    serviceAccount = JSON.parse(decodedJson);
  } catch {
    throw new Error('FIREBASE_DB_KEY must decode to valid Firebase service account JSON.');
  }

  if (
    !serviceAccount ||
    typeof serviceAccount !== 'object' ||
    typeof serviceAccount.project_id !== 'string' ||
    typeof serviceAccount.client_email !== 'string' ||
    typeof serviceAccount.private_key !== 'string'
  ) {
    throw new Error('FIREBASE_DB_KEY must decode to a Firebase service account JSON object with project_id, client_email, and private_key.');
  }

  return serviceAccount;
}

function resolveDatabaseUrl(serviceAccount) {
  const configuredUrl = process.env.FIREBASE_DB_URL?.trim();
  if (configuredUrl) {
    return configuredUrl;
  }

  if (typeof serviceAccount.databaseURL === 'string' && serviceAccount.databaseURL.trim()) {
    return serviceAccount.databaseURL.trim();
  }

  if (typeof serviceAccount.database_url === 'string' && serviceAccount.database_url.trim()) {
    return serviceAccount.database_url.trim();
  }

  return `https://${serviceAccount.project_id}-default-rtdb.firebaseio.com`;
}

function removeUndefinedValues(value) {
  if (Array.isArray(value)) {
    return value.map((item) => removeUndefinedValues(item));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, nestedValue]) => nestedValue !== undefined)
        .map(([key, nestedValue]) => [key, removeUndefinedValues(nestedValue)])
    );
  }

  return value;
}

function withTimeout(promise, timeoutMs, timeoutMessage) {
  let timeoutId;

  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  });
}

async function initializeFirebaseApp() {
  const serviceAccount = decodeFirebaseServiceAccount();
  const databaseURL = resolveDatabaseUrl(serviceAccount);

  if (!getApps().length) {
    initializeApp({
      credential: cert(serviceAccount),
      databaseURL
    });
  }

  const database = getDatabase();

  try {
    await withTimeout(
      database.ref('__startup__/connection-check').get(),
      15000,
      'Timed out while connecting to Firebase Realtime Database.'
    );
  } catch (err) {
    throw new Error(`Failed to connect to Firebase Realtime Database: ${err.message}`);
  }

  firebaseDb = database;
  return firebaseDb;
}

export async function initializeDatabase() {
  return ensureFirebaseReady();
}

export async function ensureFirebaseReady() {
  if (firebaseDb) {
    return firebaseDb;
  }

  if (!firebaseInitPromise) {
    firebaseInitPromise = initializeFirebaseApp().catch((err) => {
      firebaseInitPromise = null;
      throw err;
    });
  }

  return firebaseInitPromise;
}

export async function getRecord(pathValue) {
  const database = await ensureFirebaseReady();
  const snapshot = await database.ref(normalizePath(pathValue)).get();

  if (!snapshot.exists()) {
    return null;
  }

  const value = snapshot.val();
  return {
    id: snapshot.key ?? normalizePath(pathValue).split('/').pop(),
    ...(value && typeof value === 'object' && !Array.isArray(value) ? value : { value })
  };
}

export async function getCollection(pathValue) {
  const database = await ensureFirebaseReady();
  const snapshot = await database.ref(normalizePath(pathValue)).get();

  if (!snapshot.exists()) {
    return [];
  }

  const value = snapshot.val();
  if (!value || typeof value !== 'object') {
    return [];
  }

  return Object.entries(value)
    .map(([id, record]) => ({
      id,
      ...(record && typeof record === 'object' && !Array.isArray(record) ? record : { value: record })
    }));
}

export async function setRecord(pathValue, value) {
  const database = await ensureFirebaseReady();
  await database.ref(normalizePath(pathValue)).set(removeUndefinedValues(value));
}

export async function updateRecord(pathValue, value) {
  const database = await ensureFirebaseReady();
  await database.ref(normalizePath(pathValue)).update(removeUndefinedValues(value));
}

export async function removeRecord(pathValue) {
  const database = await ensureFirebaseReady();
  await database.ref(normalizePath(pathValue)).remove();
}

export async function pushRecord(collectionPath, value) {
  const database = await ensureFirebaseReady();
  const collectionRef = database.ref(normalizePath(collectionPath));
  const recordRef = collectionRef.push();
  await recordRef.set(removeUndefinedValues(value));
  return recordRef.key;
}

export function toMillis(value) {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}
