import dotenv from 'dotenv';
import { initializeDatabase, getCollection } from './database.js';

dotenv.config();

async function main() {
  await initializeDatabase();

  const [users, analysisHistory, posts, comments] = await Promise.all([
    getCollection('users'),
    getCollection('analysisHistory'),
    getCollection('marketplacePosts'),
    getCollection('marketplaceComments')
  ]);

  console.log('FIREBASE ROOT NODES:', {
    users: users.length,
    analysisHistoryUsers: analysisHistory.length,
    marketplacePosts: posts.length,
    marketplaceCommentThreads: comments.length
  });
}

main().catch((err) => {
  console.error('Schema check failed:', err.message);
  process.exit(1);
});
