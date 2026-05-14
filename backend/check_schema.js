import sqlite3 from 'sqlite3';
import path from 'path';

const dbPath = path.resolve('verdara.db');
const db = new sqlite3.Database(dbPath);

db.all("PRAGMA table_info(users)", [], (err, rows) => {
  if (err) console.error(err);
  else console.log('USERS TABLE COLUMNS:', rows.map(r => r.name));
  
  db.all("PRAGMA table_info(marketplace_posts)", [], (err, rows) => {
    if (err) console.error(err);
    else console.log('MARKETPLACE_POSTS TABLE COLUMNS:', rows.map(r => r.name));
    db.close();
  });
});
