const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'database.db');

let db = null;

const init = () => {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        reject(err);
        return;
      }
      console.log('Datenbank verbunden');
      createTables().then(resolve).catch(reject);
    });
  });
};

const createTables = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // DJs Tabelle
      db.run(`
        CREATE TABLE IF NOT EXISTS djs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Veranstaltungen Tabelle
      db.run(`
        CREATE TABLE IF NOT EXISTS events (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          dj_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          code TEXT UNIQUE NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (dj_id) REFERENCES djs(id)
        )
      `);

      // Liedwünsche Tabelle
      db.run(`
        CREATE TABLE IF NOT EXISTS requests (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          event_id INTEGER NOT NULL,
          title TEXT NOT NULL,
          artist TEXT NOT NULL,
          spotify_id TEXT,
          votes INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (event_id) REFERENCES events(id)
        )
      `);

      // Votes Tabelle (um Doppel-Votes zu verhindern)
      db.run(`
        CREATE TABLE IF NOT EXISTS votes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          request_id INTEGER NOT NULL,
          ip_address TEXT NOT NULL,
          vote_type TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (request_id) REFERENCES requests(id),
          UNIQUE(request_id, ip_address)
        )
      `, (err) => {
        if (err) {
          reject(err);
        } else {
          // Standard-DJ erstellen (Username: admin, Password: admin - sollte geändert werden!)
          createDefaultDJ().then(resolve).catch(reject);
        }
      });
    });
  });
};

const createDefaultDJ = () => {
  return new Promise((resolve, reject) => {
    db.get('SELECT id FROM djs WHERE username = ?', ['admin'], (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      if (!row) {
        const hashedPassword = bcrypt.hashSync('admin', 10);
        db.run(
          'INSERT INTO djs (username, password) VALUES (?, ?)',
          ['admin', hashedPassword],
          (err) => {
            if (err) reject(err);
            else {
              console.log('Standard-DJ erstellt (Username: admin, Password: admin)');
              resolve();
            }
          }
        );
      } else {
        resolve();
      }
    });
  });
};

// Database Helper Functions
const getDb = () => db;

const query = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

const get = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const run = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
};

module.exports = {
  init,
  getDb,
  query,
  get,
  run
};
