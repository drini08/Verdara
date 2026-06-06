import './env.js';
import { initializeDatabase, getCollection } from './database.js';

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
