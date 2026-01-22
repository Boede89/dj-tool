const express = require('express');
const { authenticate } = require('../middleware/auth');
const db = require('../database');

const router = express.Router();

// Alle Routen benötigen Authentifizierung
router.use(authenticate);

// Archiv-Einträge abrufen (gruppiert nach Veranstaltungen)
router.get('/', async (req, res) => {
  try {
    const archive = await db.query(
      `SELECT * FROM archive 
       WHERE dj_id = ? 
       ORDER BY event_name, final_votes DESC, archived_at DESC`,
      [req.djId]
    );
    
    // Gruppiere nach Veranstaltungen
    const grouped = {};
    archive.forEach(entry => {
      const key = entry.event_code || 'unknown';
      if (!grouped[key]) {
        grouped[key] = {
          event_name: entry.event_name,
          event_code: entry.event_code,
          entries: []
        };
      }
      grouped[key].entries.push(entry);
    });

    // Sortiere Einträge innerhalb jeder Veranstaltung nach Votes
    Object.keys(grouped).forEach(key => {
      grouped[key].entries.sort((a, b) => (b.final_votes || 0) - (a.final_votes || 0));
    });

    res.json(Object.values(grouped));
  } catch (error) {
    console.error('Fehler beim Abrufen des Archivs:', error);
    res.status(500).json({ error: 'Fehler beim Abrufen des Archivs' });
  }
});

// Alle Einträge einer Veranstaltung löschen
router.delete('/event/:eventCode', async (req, res) => {
  try {
    const { eventCode } = req.params;
    await db.run('DELETE FROM archive WHERE dj_id = ? AND event_code = ?', [req.djId, eventCode]);
    res.json({ message: 'Veranstaltung aus Archiv gelöscht' });
  } catch (error) {
    console.error('Fehler beim Löschen der Veranstaltung aus Archiv:', error);
    res.status(500).json({ error: 'Fehler beim Löschen der Veranstaltung aus Archiv' });
  }
});

// Archiv löschen (alle Einträge)
router.delete('/', async (req, res) => {
  try {
    await db.run('DELETE FROM archive WHERE dj_id = ?', [req.djId]);
    res.json({ message: 'Archiv gelöscht' });
  } catch (error) {
    console.error('Fehler beim Löschen des Archivs:', error);
    res.status(500).json({ error: 'Fehler beim Löschen des Archivs' });
  }
});

// Einzelnen Archiv-Eintrag löschen
router.delete('/:id', async (req, res) => {
  try {
    const archiveId = req.params.id;

    // Prüfen ob Eintrag dem DJ gehört
    const entry = await db.get('SELECT * FROM archive WHERE id = ? AND dj_id = ?', [archiveId, req.djId]);
    if (!entry) {
      return res.status(404).json({ error: 'Archiv-Eintrag nicht gefunden' });
    }

    await db.run('DELETE FROM archive WHERE id = ? AND dj_id = ?', [archiveId, req.djId]);
    res.json({ message: 'Archiv-Eintrag gelöscht' });
  } catch (error) {
    console.error('Fehler beim Löschen des Archiv-Eintrags:', error);
    res.status(500).json({ error: 'Fehler beim Löschen des Archiv-Eintrags' });
  }
});

module.exports = router;
