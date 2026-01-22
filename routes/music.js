const express = require('express');
const axios = require('axios');
const db = require('../database');
const router = express.Router();

// iTunes/Apple Music API Suche (kostenlos, keine API-Keys nötig)
const searchiTunes = async (query, limit = 20) => {
  try {
    const response = await axios.get('https://itunes.apple.com/search', {
      params: {
        term: query.trim(),
        media: 'music',
        entity: 'song',
        limit: Math.min(parseInt(limit), 50)
      }
    });

    return response.data.results.map(track => ({
      id: track.trackId?.toString() || track.collectionId?.toString(),
      title: track.trackName || track.collectionName,
      artist: track.artistName,
      album: track.collectionName,
      image: track.artworkUrl100?.replace('100x100', '600x600') || null,
      preview_url: track.previewUrl || null,
      external_url: track.trackViewUrl || track.collectionViewUrl
    }));
  } catch (error) {
    console.error('iTunes-Suchfehler:', error);
    return [];
  }
};

// MusicBrainz API Suche (kostenlos, keine API-Keys nötig)
const searchMusicBrainz = async (query, limit = 20) => {
  try {
    const response = await axios.get('https://musicbrainz.org/ws/2/recording', {
      params: {
        query: query.trim(),
        limit: Math.min(parseInt(limit), 50),
        fmt: 'json'
      },
      headers: {
        'User-Agent': 'DJ-Tool/1.0.0 (https://github.com/Boede89/dj-tool)'
      }
    });

    const recordings = response.data.recordings || [];
    
    return recordings.map(recording => {
      const artist = recording['artist-credit']?.[0]?.name || 'Unknown Artist';
      const release = recording.releases?.[0];
      
      return {
        id: recording.id,
        title: recording.title,
        artist: artist,
        album: release?.title || null,
        image: null, // MusicBrainz hat keine Cover-Art direkt
        preview_url: null,
        external_url: `https://musicbrainz.org/recording/${recording.id}`
      };
    });
  } catch (error) {
    console.error('MusicBrainz-Suchfehler:', error);
    return [];
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

    // DJ Einstellungen abrufen
    const dj = await db.get(
      'SELECT music_source, spotify_client_id, spotify_client_secret FROM djs WHERE id = ?',
      [event.dj_id]
    );

    if (!dj) {
      return res.json([]);
    }

    const musicSource = dj.music_source || 'itunes';

    // Je nach gewählter Datenbank suchen
    let tracks = [];

    if (musicSource === 'spotify' && dj.spotify_client_id && dj.spotify_client_secret) {
      // Spotify Suche (falls konfiguriert)
      try {
        const spotifyRoutes = require('./spotify');
        const tokenCache = {};
        const getAccessToken = async (djId, clientId, clientSecret) => {
          const cacheKey = `${djId}_${clientId}`;
          if (tokenCache[cacheKey] && tokenCache[cacheKey].expiry && Date.now() < tokenCache[cacheKey].expiry) {
            return tokenCache[cacheKey].token;
          }

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
          const expiry = Date.now() + (response.data.expires_in * 1000) - 60000;
          tokenCache[cacheKey] = { token, expiry };
          return token;
        };

        const token = await getAccessToken(event.dj_id, dj.spotify_client_id, dj.spotify_client_secret);
        const response = await axios.get('https://api.spotify.com/v1/search', {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            q: q.trim(),
            type: 'track',
            limit: Math.min(parseInt(limit), 50)
          }
        });

        tracks = response.data.tracks.items.map(track => ({
          id: track.id,
          title: track.name,
          artist: track.artists.map(a => a.name).join(', '),
          album: track.album.name,
          image: track.album.images[0]?.url || null,
          preview_url: track.preview_url,
          external_url: track.external_urls.spotify
        }));
      } catch (error) {
        console.error('Spotify-Suchfehler:', error);
        // Fallback zu iTunes wenn Spotify fehlschlägt
        tracks = await searchiTunes(q, limit);
      }
    } else if (musicSource === 'musicbrainz') {
      tracks = await searchMusicBrainz(q, limit);
    } else {
      // Standard: iTunes/Apple Music
      tracks = await searchiTunes(q, limit);
    }

    res.json(tracks);
  } catch (error) {
    console.error('Musik-Suchfehler:', error);
    res.status(500).json({ error: 'Fehler bei der Musik-Suche' });
  }
});

module.exports = router;
