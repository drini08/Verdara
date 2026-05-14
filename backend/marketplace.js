import { getAsync, runAsync, allAsync } from './database.js';

export async function getMarketplacePosts(status = 'active') {
  const posts = await allAsync(`
    SELECT
      mp.*,
      u.username,
      u.email,
      u.location AS userProfileLocation,
      COUNT(mc.id) as commentCount
    FROM marketplace_posts mp
    JOIN users u ON mp.userId = u.id
    LEFT JOIN marketplace_comments mc ON mp.id = mc.postId
    WHERE mp.status = ?
    GROUP BY mp.id
    ORDER BY mp.createdAt DESC
  `, [status]);
  
  // Fetch comments for each post
  if (posts && posts.length > 0) {
    for (let post of posts) {
      const comments = await getPostComments(post.id);
      post.comments = comments || [];
    }
  }
  
  return posts || [];
}

export async function createMarketplacePost(userId, postData) {
  const result = await runAsync(
    `INSERT INTO marketplace_posts (userId, type, title, description, quantity, price, location, category, imageUrl)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      postData.type,
      postData.title,
      postData.description,
      postData.quantity,
      postData.price,
      postData.location,
      postData.category,
      postData.imageUrl
    ]
  );
  return result.lastID;
}

export async function getMarketplacePostById(postId) {
  const post = await getAsync(`
    SELECT
      mp.*,
      u.username,
      u.email
    FROM marketplace_posts mp
    JOIN users u ON mp.userId = u.id
    WHERE mp.id = ?
  `, [postId]);
  return post;
}

export async function getPostComments(postId) {
  const comments = await allAsync(`
    SELECT
      mc.*,
      u.username,
      u.location
    FROM marketplace_comments mc
    JOIN users u ON mc.userId = u.id
    WHERE mc.postId = ?
    ORDER BY mc.createdAt ASC
  `, [postId]);
  return comments || [];
}


export async function addComment(postId, userId, comment) {
  const result = await runAsync(
    'INSERT INTO marketplace_comments (postId, userId, comment) VALUES (?, ?, ?)',
    [postId, userId, comment]
  );
  return result.lastID;
}

export async function getUserPosts(userId) {
  const posts = await allAsync(`
    SELECT
      mp.*,
      COUNT(mc.id) as commentCount
    FROM marketplace_posts mp
    LEFT JOIN marketplace_comments mc ON mp.id = mc.postId
    WHERE mp.userId = ?
    GROUP BY mp.id
    ORDER BY mp.createdAt DESC
  `, [userId]);
  return posts || [];
}

export async function deletePost(postId, userId) {
  // Only allow users to delete their own posts
  const result = await runAsync(
    'DELETE FROM marketplace_posts WHERE id = ? AND userId = ?',
    [postId, userId]
  );
  return result.changes > 0;
}

export async function updateMarketplacePost(postId, userId, postData) {
  const result = await runAsync(
    `UPDATE marketplace_posts 
     SET type = ?, title = ?, description = ?, quantity = ?, price = ?, location = ?, category = ?
     WHERE id = ? AND userId = ?`,
    [
      postData.type,
      postData.title,
      postData.description,
      postData.quantity,
      postData.price,
      postData.location,
      postData.category,
      postId,
      userId
    ]
  );
  return result.changes > 0;
}

export async function markPostAsCompleted(postId, userId) {
  const result = await runAsync(
    'UPDATE marketplace_posts SET status = \'completed\' WHERE id = ? AND userId = ?',
    [postId, userId]
  );
  return result.changes > 0;
}
