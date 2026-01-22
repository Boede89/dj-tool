const express = require('express');
const { authenticate } = require('../middleware/auth');
const db = require('../database');
const bcrypt = require('bcryptjs');

const router = express.Router();

// Alle Routen benötigen Superadmin
router.use(authenticate);
router.use((req, res, next) => {
  if (!req.isSuperadmin) {
    return res.status(403).json({ error: 'Zugriff verweigert - Superadmin erforderlich' });
  }
  next();
});

// Alle DJs abrufen
router.get('/djs', async (req, res) => {
  try {
    const djs = await db.query(
      'SELECT id, username, is_superadmin, created_at FROM djs ORDER BY created_at DESC'
    );
    res.json(djs);
  } catch (error) {
    console.error('Fehler beim Abrufen der DJs:', error);
    res.status(500).json({ error: 'Fehler beim Abrufen der DJs' });
  }
});

// DJ Passwort ändern
router.put('/djs/:id/password', async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Passwort erforderlich' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    await db.run('UPDATE djs SET password = ? WHERE id = ?', [hashedPassword, id]);

    res.json({ message: 'Passwort erfolgreich geändert' });
  } catch (error) {
    console.error('Fehler beim Ändern des Passworts:', error);
    res.status(500).json({ error: 'Fehler beim Ändern des Passworts' });
  }
});

// DJ löschen
router.delete('/djs/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Prüfen ob DJ existiert
    const dj = await db.get('SELECT * FROM djs WHERE id = ?', [id]);
    if (!dj) {
      return res.status(404).json({ error: 'DJ nicht gefunden' });
    }

    // Superadmin kann sich nicht selbst löschen
    if (dj.is_superadmin === 1) {
      return res.status(400).json({ error: 'Superadmin kann nicht gelöscht werden' });
    }

    // Alle Events des DJs finden und ins Archiv verschieben
    const events = await db.query('SELECT * FROM events WHERE dj_id = ?', [id]);
    for (const event of events) {
      const requests = await db.query('SELECT * FROM requests WHERE event_id = ?', [event.id]);
      for (const request of requests) {
        await db.run(
          `INSERT INTO archive (dj_id, event_name, event_code, title, artist, spotify_id, final_votes, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, event.name, event.code, request.title, request.artist, request.spotify_id, request.votes, request.created_at]
        );
      }
      // Votes löschen
      await db.run('DELETE FROM votes WHERE request_id IN (SELECT id FROM requests WHERE event_id = ?)', [event.id]);
      // Requests löschen
      await db.run('DELETE FROM requests WHERE event_id = ?', [event.id]);
    }
    // Events löschen
    await db.run('DELETE FROM events WHERE dj_id = ?', [id]);
    // DJ löschen
    await db.run('DELETE FROM djs WHERE id = ?', [id]);

    res.json({ message: 'DJ erfolgreich gelöscht' });
  } catch (error) {
    console.error('Fehler beim Löschen des DJs:', error);
    res.status(500).json({ error: 'Fehler beim Löschen des DJs' });
  }
});

// Alle Daten eines DJs abrufen
router.get('/djs/:id/data', async (req, res) => {
  try {
    const { id } = req.params;

    const events = await db.query('SELECT * FROM events WHERE dj_id = ? ORDER BY created_at DESC', [id]);
    const archive = await db.query('SELECT * FROM archive WHERE dj_id = ? ORDER BY archived_at DESC', [id]);

    res.json({ events, archive });
  } catch (error) {
    console.error('Fehler beim Abrufen der DJ-Daten:', error);
    res.status(500).json({ error: 'Fehler beim Abrufen der DJ-Daten' });
  }
});

module.exports = router;
