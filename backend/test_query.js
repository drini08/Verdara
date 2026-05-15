import dotenv from 'dotenv';
import { getMarketplacePosts } from './marketplace.js';

dotenv.config();

async function main() {
  const posts = await getMarketplacePosts('active');
  console.log('QUERY SUCCESS:', posts.length, 'rows');
}

main().catch((err) => {
  console.error('QUERY FAILED:', err.message);
  process.exit(1);
});
