const express = require('express');
const axios = require('axios');
const { authenticate } = require('../middleware/auth');
const db = require('../database');
const router = express.Router();

// Token-Cache pro DJ
const tokenCache = {};

// Spotify Access Token abrufen (DJ-spezifisch)
const getAccessToken = async (djId, clientId, clientSecret) => {
  const cacheKey = `${djId}_${clientId}`;
  
  if (tokenCache[cacheKey] && tokenCache[cacheKey].expiry && Date.now() < tokenCache[cacheKey].expiry) {
    return tokenCache[cacheKey].token;
  }

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

    const token = response.data.access_token;
    const expiry = Date.now() + (response.data.expires_in * 1000) - 60000; // 1 Minute Puffer
    
    tokenCache[cacheKey] = { token, expiry };

    return token;
  } catch (error) {
    console.error('Fehler beim Abrufen des Spotify Tokens:', error);
    throw error;
  }
};

// Musik suchen (öffentlich - verwendet Event-Code um DJ zu finden)
router.get('/search/:eventCode', async (req, res) => {
  try {
    const { eventCode } = req.params;
    const { q, limit = 20 } = req.query;

    if (!q || q.trim().length === 0) {
      return res.json([]);
    }

    // Event finden um DJ zu ermitteln
    const event = await db.get('SELECT dj_id FROM events WHERE code = ?', [eventCode]);
    if (!event) {
      return res.json([]); // Event nicht gefunden
    }

    // DJ Spotify Credentials abrufen
    const dj = await db.get(
      'SELECT spotify_client_id, spotify_client_secret FROM djs WHERE id = ?',
      [event.dj_id]
    );

    if (!dj || !dj.spotify_client_id || !dj.spotify_client_secret) {
      return res.json([]); // Keine Spotify Credentials konfiguriert
    }

    const token = await getAccessToken(event.dj_id, dj.spotify_client_id, dj.spotify_client_secret);

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
      // Token abgelaufen, Cache löschen
      const event = await db.get('SELECT dj_id FROM events WHERE code = ?', [req.params.eventCode]);
      if (event) {
        Object.keys(tokenCache).forEach(key => {
          if (key.startsWith(`${event.dj_id}_`)) {
            delete tokenCache[key];
          }
        });
      }
      return res.status(500).json({ error: 'Spotify-Authentifizierung fehlgeschlagen' });
    }
    res.status(500).json({ error: 'Fehler bei der Spotify-Suche' });
  }
});

module.exports = router;
