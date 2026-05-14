import sqlite3 from 'sqlite3';
import path from 'path';

const dbPath = path.resolve('verdara.db');
const db = new sqlite3.Database(dbPath);

const query = `
    SELECT
      mp.*,
      u.username,
      u.email,
      u.location AS userProfileLocation,
      COUNT(mc.id) as commentCount
    FROM marketplace_posts mp
    JOIN users u ON mp.userId = u.id
    LEFT JOIN marketplace_comments mc ON mp.id = mc.postId
    GROUP BY mp.id
    ORDER BY mp.createdAt DESC
`;

db.all(query, [], (err, rows) => {
  if (err) {
    console.error('QUERY FAILED:', err);
  } else {
    console.log('QUERY SUCCESS:', rows.length, 'rows');
  }
  db.close();
});
