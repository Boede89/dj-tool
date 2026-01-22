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
          spotify_client_id TEXT,
          spotify_client_secret TEXT,
          music_source TEXT DEFAULT 'itunes',
          is_superadmin INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) {
          console.error('Fehler beim Erstellen der djs Tabelle:', err);
        } else {
          // Spalten hinzufügen falls Tabelle bereits existiert (SQLite unterstützt kein IF NOT EXISTS für ALTER TABLE)
          db.run(`ALTER TABLE djs ADD COLUMN spotify_client_id TEXT`, (err) => {
            if (err && !err.message.includes('duplicate column')) {
              console.error('Fehler beim Hinzufügen der spotify_client_id Spalte:', err);
            }
          });
          db.run(`ALTER TABLE djs ADD COLUMN spotify_client_secret TEXT`, (err) => {
            if (err && !err.message.includes('duplicate column')) {
              console.error('Fehler beim Hinzufügen der spotify_client_secret Spalte:', err);
            }
          });
          db.run(`ALTER TABLE djs ADD COLUMN music_source TEXT DEFAULT 'itunes'`, (err) => {
            if (err && !err.message.includes('duplicate column')) {
              console.error('Fehler beim Hinzufügen der music_source Spalte:', err);
            }
          });
          db.run(`ALTER TABLE djs ADD COLUMN is_superadmin INTEGER DEFAULT 0`, (err) => {
            if (err && !err.message.includes('duplicate column')) {
              console.error('Fehler beim Hinzufügen der is_superadmin Spalte:', err);
            }
          });
        }
      });

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
          votes INTEGER DEFAULT 1,
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
      `);

      // Archiv Tabelle für gelöschte Liedwünsche
      db.run(`
        CREATE TABLE IF NOT EXISTS archive (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          dj_id INTEGER NOT NULL,
          event_name TEXT,
          event_code TEXT,
          title TEXT NOT NULL,
          artist TEXT NOT NULL,
          spotify_id TEXT,
          final_votes INTEGER,
          created_at DATETIME,
          archived_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (dj_id) REFERENCES djs(id)
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
            if (err) {
              reject(err);
              return;
            }
            console.log('Standard-DJ erstellt (Username: admin, Password: admin)');
            
            // Superadmin erstellen
            db.get('SELECT id FROM djs WHERE username = ?', ['Daniel'], (err, superadminRow) => {
              if (err) {
                reject(err);
                return;
              }
              if (!superadminRow) {
                const superadminPassword = bcrypt.hashSync('6466', 10);
                db.run(
                  'INSERT INTO djs (username, password, is_superadmin) VALUES (?, ?, 1)',
                  ['Daniel', superadminPassword],
                  (err) => {
                    if (err) reject(err);
                    else {
                      console.log('Superadmin erstellt (Username: Daniel, Password: 6466)');
                      resolve();
                    }
                  }
                );
              } else {
                resolve();
              }
            });
          }
        );
      } else {
        // Prüfen ob Superadmin existiert
        db.get('SELECT id FROM djs WHERE username = ?', ['Daniel'], (err, superadminRow) => {
          if (err) {
            reject(err);
            return;
          }
          if (!superadminRow) {
            const superadminPassword = bcrypt.hashSync('6466', 10);
            db.run(
              'INSERT INTO djs (username, password, is_superadmin) VALUES (?, ?, 1)',
              ['Daniel', superadminPassword],
              (err) => {
                if (err) reject(err);
                else {
                  console.log('Superadmin erstellt (Username: Daniel, Password: 6466)');
                  resolve();
                }
              }
            );
          } else {
            resolve();
          }
        });
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
