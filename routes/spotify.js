const express = require('express');
const axios = require('axios');
const router = express.Router();

let accessToken = null;
let tokenExpiry = null;

// Spotify Access Token abrufen
const getAccessToken = async () => {
  if (accessToken && tokenExpiry && Date.now() < tokenExpiry) {
    return accessToken;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Spotify Credentials nicht konfiguriert');
  }

  try {
    const response = await axios.post(
      'https://accounts.spotify.com/api/token',
      'grant_type=client_credentials',
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
        }
      }
    );

    accessToken = response.data.access_token;
    tokenExpiry = Date.now() + (response.data.expires_in * 1000) - 60000; // 1 Minute Puffer

    return accessToken;
  } catch (error) {
    console.error('Fehler beim Abrufen des Spotify Tokens:', error);
    throw error;
  }
};

// Musik suchen
router.get('/search', async (req, res) => {
  try {
    const { q, limit = 20 } = req.query;

    if (!q || q.trim().length === 0) {
      return res.json([]);
    }

    // Prüfen ob Spotify konfiguriert ist
    if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
      return res.json([]); // Leere Ergebnisse wenn Spotify nicht konfiguriert
    }

    const token = await getAccessToken();

    const response = await axios.get('https://api.spotify.com/v1/search', {
      headers: {
        Authorization: `Bearer ${token}`
      },
      params: {
        q: q.trim(),
        type: 'track',
        limit: Math.min(parseInt(limit), 50)
      }
    });

    const tracks = response.data.tracks.items.map(track => ({
      id: track.id,
      title: track.name,
      artist: track.artists.map(a => a.name).join(', '),
      album: track.album.name,
      image: track.album.images[0]?.url || null,
      preview_url: track.preview_url,
      external_url: track.external_urls.spotify
    }));

    res.json(tracks);
  } catch (error) {
    console.error('Spotify-Suchfehler:', error);
    if (error.response?.status === 401) {
      // Token abgelaufen, neu holen
      accessToken = null;
      tokenExpiry = null;
      return res.status(500).json({ error: 'Spotify-Authentifizierung fehlgeschlagen' });
    }
    res.status(500).json({ error: 'Fehler bei der Spotify-Suche' });
  }
});

module.exports = router;
