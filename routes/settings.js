const express = require('express');
const { authenticate } = require('../middleware/auth');
const db = require('../database');

const router = express.Router();

// Alle Routen benötigen Authentifizierung
router.use(authenticate);

// DJ-Einstellungen abrufen
router.get('/', async (req, res) => {
  try {
    const dj = await db.get(
      'SELECT id, username, spotify_client_id, spotify_client_secret FROM djs WHERE id = ?',
      [req.djId]
    );

    if (!dj) {
      return res.status(404).json({ error: 'DJ nicht gefunden' });
    }

    // Secrets nicht im Klartext senden, nur ob vorhanden
    res.json({
      username: dj.username,
      hasSpotifyCredentials: !!(dj.spotify_client_id && dj.spotify_client_secret),
      musicSource: dj.music_source || 'itunes'
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der Einstellungen:', error);
    res.status(500).json({ error: 'Fehler beim Abrufen der Einstellungen' });
  }
});

// Spotify Credentials speichern
router.put('/spotify', async (req, res) => {
  try {
    const { client_id, client_secret } = req.body;

    if (!client_id || !client_secret) {
      return res.status(400).json({ error: 'Client ID und Secret erforderlich' });
    }

    await db.run(
      'UPDATE djs SET spotify_client_id = ?, spotify_client_secret = ? WHERE id = ?',
      [client_id, client_secret, req.djId]
    );

    res.json({ message: 'Spotify Credentials erfolgreich gespeichert' });
  } catch (error) {
    console.error('Fehler beim Speichern der Spotify Credentials:', error);
    res.status(500).json({ error: 'Fehler beim Speichern der Spotify Credentials' });
  }
});

// Spotify Credentials löschen
router.delete('/spotify', async (req, res) => {
  try {
    await db.run(
      'UPDATE djs SET spotify_client_id = NULL, spotify_client_secret = NULL WHERE id = ?',
      [req.djId]
    );

    res.json({ message: 'Spotify Credentials gelöscht' });
  } catch (error) {
    console.error('Fehler beim Löschen der Spotify Credentials:', error);
    res.status(500).json({ error: 'Fehler beim Löschen der Spotify Credentials' });
  }
});

// Musikdatenbank-Quelle ändern
router.put('/music-source', async (req, res) => {
  try {
    const { musicSource } = req.body;

    if (!['spotify', 'itunes', 'musicbrainz'].includes(musicSource)) {
      return res.status(400).json({ error: 'Ungültige Musikdatenbank-Quelle' });
    }

    await db.run(
      'UPDATE djs SET music_source = ? WHERE id = ?',
      [musicSource, req.djId]
    );

    res.json({ message: 'Musikdatenbank-Quelle erfolgreich geändert' });
  } catch (error) {
    console.error('Fehler beim Ändern der Musikdatenbank-Quelle:', error);
    res.status(500).json({ error: 'Fehler beim Ändern der Musikdatenbank-Quelle' });
  }
});

module.exports = router;
