const express = require('express');
const { authenticate } = require('../middleware/auth');
const db = require('../database');

const router = express.Router();

// Alle Routen benötigen Authentifizierung
router.use(authenticate);

// Archiv-Einträge abrufen
router.get('/', async (req, res) => {
  try {
    const archive = await db.query(
      'SELECT * FROM archive WHERE dj_id = ? ORDER BY archived_at DESC',
      [req.djId]
    );
    res.json(archive);
  } catch (error) {
    console.error('Fehler beim Abrufen des Archivs:', error);
    res.status(500).json({ error: 'Fehler beim Abrufen des Archivs' });
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
