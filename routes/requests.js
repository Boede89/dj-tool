const express = require('express');
const db = require('../database');

const router = express.Router();

// Event-Details abrufen (öffentlich)
router.get('/:code', async (req, res) => {
  try {
    const event = await db.get(
      `SELECT e.*, d.username as dj_username 
       FROM events e 
       JOIN djs d ON e.dj_id = d.id 
       WHERE e.code = ?`,
      [req.params.code]
    );
    if (!event) {
      return res.status(404).json({ error: 'Veranstaltung nicht gefunden' });
    }
    res.json(event);
  } catch (error) {
    console.error('Fehler beim Abrufen der Veranstaltung:', error);
    res.status(500).json({ error: 'Fehler beim Abrufen der Veranstaltung' });
  }
});

// Alle Liedwünsche eines Events abrufen (öffentlich)
router.get('/:code/requests', async (req, res) => {
  try {
    const event = await db.get('SELECT id FROM events WHERE code = ?', [req.params.code]);
    if (!event) {
      return res.status(404).json({ error: 'Veranstaltung nicht gefunden' });
    }

    const requests = await db.query(
      'SELECT * FROM requests WHERE event_id = ? ORDER BY votes DESC, created_at ASC',
      [event.id]
    );

    res.json(requests);
  } catch (error) {
    console.error('Fehler beim Abrufen der Liedwünsche:', error);
    res.status(500).json({ error: 'Fehler beim Abrufen der Liedwünsche' });
  }
});

// Neuen Liedwunsch erstellen (öffentlich)
router.post('/:code/requests', async (req, res) => {
  try {
    const { title, artist, spotify_id } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;

    if (!title || !artist) {
      return res.status(400).json({ error: 'Titel und Interpret erforderlich' });
    }

    const event = await db.get('SELECT id FROM events WHERE code = ?', [req.params.code]);
    if (!event) {
      return res.status(404).json({ error: 'Veranstaltung nicht gefunden' });
    }

    // Prüfen ob Lied bereits existiert
    const existing = await db.get(
      'SELECT id FROM requests WHERE event_id = ? AND LOWER(title) = LOWER(?) AND LOWER(artist) = LOWER(?)',
      [event.id, title, artist]
    );

    if (existing) {
      return res.status(400).json({ error: 'Dieses Lied wurde bereits gewünscht' });
    }

    // Liedwunsch erstellen (startet mit 1 Vote)
    const result = await db.run(
      'INSERT INTO requests (event_id, title, artist, spotify_id, votes) VALUES (?, ?, ?, ?, 1)',
      [event.id, title, artist, spotify_id || null]
    );

    // Automatisch einen "up" Vote für den Erstellen speichern
    // Damit kann die Person, die den Wunsch erstellt hat, nicht nochmal voten
    await db.run(
      'INSERT INTO votes (request_id, ip_address, vote_type) VALUES (?, ?, ?)',
      [result.id, ipAddress, 'up']
    );

    res.status(201).json({ id: result.id, title, artist, votes: 1 });
  } catch (error) {
    console.error('Fehler beim Erstellen des Liedwunsches:', error);
    res.status(500).json({ error: 'Fehler beim Erstellen des Liedwunsches' });
  }
});

// Für Lied voten (öffentlich)
router.post('/:code/requests/:requestId/vote', async (req, res) => {
  try {
    const { code, requestId } = req.params;
    const { voteType } = req.body; // 'up' oder 'down'
    const ipAddress = req.ip || req.connection.remoteAddress;

    if (!['up', 'down'].includes(voteType)) {
      return res.status(400).json({ error: 'Ungültiger Vote-Typ' });
    }

    // Event prüfen
    const event = await db.get('SELECT id FROM events WHERE code = ?', [code]);
    if (!event) {
      return res.status(404).json({ error: 'Veranstaltung nicht gefunden' });
    }

    // Request prüfen
    const request = await db.get('SELECT * FROM requests WHERE id = ? AND event_id = ?', [requestId, event.id]);
    if (!request) {
      return res.status(404).json({ error: 'Liedwunsch nicht gefunden' });
    }

    // Prüfen ob bereits gevotet wurde (inkl. automatischer Vote beim Erstellen)
    const existingVote = await db.get(
      'SELECT * FROM votes WHERE request_id = ? AND ip_address = ?',
      [requestId, ipAddress]
    );

    if (existingVote) {
      // Wenn bereits der gleiche Vote-Typ gewählt wurde, nichts tun
      if (existingVote.vote_type === voteType) {
        return res.status(400).json({ error: `Du hast bereits ${voteType === 'up' ? 'hoch' : 'runter'} gevotet` });
      }
      
      // Vote-Typ ändern
      await db.run(
        'UPDATE votes SET vote_type = ? WHERE request_id = ? AND ip_address = ?',
        [voteType, requestId, ipAddress]
      );
      
      // Vote-Änderung berechnen
      // Von "up" zu "down": votes -1 (nur der up-Vote wird entfernt, nicht -2)
      // Von "down" zu "up": votes +1 (nur der up-Vote wird hinzugefügt, nicht +2)
      const voteChange = existingVote.vote_type === 'up' ? -1 : 1;
      
      // Aktuellen votes-Wert abrufen
      const currentRequest = await db.get('SELECT votes FROM requests WHERE id = ?', [requestId]);
      const newVotes = Math.max(0, currentRequest.votes + voteChange);
      
      await db.run('UPDATE requests SET votes = ? WHERE id = ?', [newVotes, requestId]);
    } else {
      // Neuer Vote
      await db.run(
        'INSERT INTO votes (request_id, ip_address, vote_type) VALUES (?, ?, ?)',
        [requestId, ipAddress, voteType]
      );
      // Votes aktualisieren
      const currentRequest = await db.get('SELECT votes FROM requests WHERE id = ?', [requestId]);
      const voteChange = voteType === 'up' ? 1 : -1;
      const newVotes = Math.max(0, currentRequest.votes + voteChange);
      await db.run('UPDATE requests SET votes = ? WHERE id = ?', [newVotes, requestId]);
    }

    const updatedRequest = await db.get('SELECT * FROM requests WHERE id = ?', [requestId]);
    res.json(updatedRequest);
  } catch (error) {
    console.error('Fehler beim Voten:', error);
    res.status(500).json({ error: 'Fehler beim Voten' });
  }
});

module.exports = router;
