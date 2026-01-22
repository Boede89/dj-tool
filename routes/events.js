const express = require('express');
const { authenticate } = require('../middleware/auth');
const db = require('../database');
const crypto = require('crypto');

const router = express.Router();

// Alle Routen benötigen Authentifizierung
router.use(authenticate);

// Alle Veranstaltungen eines DJs abrufen
router.get('/', async (req, res) => {
  try {
    const events = await db.query(
      `SELECT e.*, 
       (SELECT COUNT(*) FROM requests WHERE event_id = e.id) as request_count
       FROM events e 
       WHERE e.dj_id = ? 
       ORDER BY e.created_at DESC`,
      [req.djId]
    );
    res.json(events);
  } catch (error) {
    console.error('Fehler beim Abrufen der Veranstaltungen:', error);
    res.status(500).json({ error: 'Fehler beim Abrufen der Veranstaltungen' });
  }
});

// Neue Veranstaltung erstellen
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Veranstaltungsname erforderlich' });
    }

    // Eindeutigen Code generieren
    const code = crypto.randomBytes(4).toString('hex');

    const result = await db.run(
      'INSERT INTO events (dj_id, name, code) VALUES (?, ?, ?)',
      [req.djId, name, code]
    );

    res.status(201).json({ id: result.id, name, code });
  } catch (error) {
    console.error('Fehler beim Erstellen der Veranstaltung:', error);
    res.status(500).json({ error: 'Fehler beim Erstellen der Veranstaltung' });
  }
});

// Veranstaltung löschen
router.delete('/:id', async (req, res) => {
  try {
    const eventId = req.params.id;

    // Prüfen ob Veranstaltung dem DJ gehört
    const event = await db.get('SELECT * FROM events WHERE id = ? AND dj_id = ?', [eventId, req.djId]);
    if (!event) {
      return res.status(404).json({ error: 'Veranstaltung nicht gefunden' });
    }

    // Alle Requests und Votes löschen
    await db.run('DELETE FROM votes WHERE request_id IN (SELECT id FROM requests WHERE event_id = ?)', [eventId]);
    await db.run('DELETE FROM requests WHERE event_id = ?', [eventId]);
    await db.run('DELETE FROM events WHERE id = ?', [eventId]);

    res.json({ message: 'Veranstaltung gelöscht' });
  } catch (error) {
    console.error('Fehler beim Löschen der Veranstaltung:', error);
    res.status(500).json({ error: 'Fehler beim Löschen der Veranstaltung' });
  }
});

// Liedwunsch löschen (gespieltes Lied entfernen)
router.delete('/:eventId/requests/:requestId', async (req, res) => {
  try {
    const { eventId, requestId } = req.params;

    // Prüfen ob Veranstaltung dem DJ gehört
    const event = await db.get('SELECT * FROM events WHERE id = ? AND dj_id = ?', [eventId, req.djId]);
    if (!event) {
      return res.status(404).json({ error: 'Veranstaltung nicht gefunden' });
    }

    // Request löschen (Votes werden durch CASCADE gelöscht)
    await db.run('DELETE FROM votes WHERE request_id = ?', [requestId]);
    await db.run('DELETE FROM requests WHERE id = ? AND event_id = ?', [requestId, eventId]);

    res.json({ message: 'Liedwunsch gelöscht' });
  } catch (error) {
    console.error('Fehler beim Löschen des Liedwunsches:', error);
    res.status(500).json({ error: 'Fehler beim Löschen des Liedwunsches' });
  }
});

module.exports = router;
