import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../utils/api';

function GuestView() {
  const { code } = useParams();
  const [event, setEvent] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [selectedTitle, setSelectedTitle] = useState('');
  const [selectedArtist, setSelectedArtist] = useState('');

  useEffect(() => {
    loadEvent();
    loadRequests();
    const interval = setInterval(loadRequests, 5000); // Alle 5 Sekunden aktualisieren
    return () => clearInterval(interval);
  }, [code]);

  const loadEvent = async () => {
    try {
      const response = await api.get(`/api/events/${code}`);
      setEvent(response.data);
    } catch (err) {
      setError('Veranstaltung nicht gefunden');
    } finally {
      setLoading(false);
    }
  };

  const loadRequests = async () => {
    try {
      const response = await api.get(`/api/events/${code}/requests`);
      setRequests(response.data);
    } catch (err) {
      console.error('Fehler beim Laden der Liedwünsche:', err);
    }
  };

  const searchSpotify = async (query) => {
    if (!query || query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await api.get(`/api/spotify/search`, {
        params: { q: query, limit: 10 }
      });
      setSearchResults(response.data);
    } catch (err) {
      console.error('Spotify-Suchfehler:', err);
      // Fallback: Wenn Spotify nicht verfügbar ist, einfach leere Ergebnisse
      setSearchResults([]);
    }
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    searchSpotify(value);
  };

  const selectSong = (song) => {
    setSelectedTitle(song.title);
    setSelectedArtist(song.artist);
    setSearchQuery('');
    setSearchResults([]);
    setShowSearch(false);
  };

  const submitRequest = async (e) => {
    e.preventDefault();
    const title = selectedTitle || e.target.title?.value;
    const artist = selectedArtist || e.target.artist?.value;

    if (!title || !artist) {
      setError('Bitte Titel und Interpret angeben');
      return;
    }

    try {
      await api.post(`/api/events/${code}/requests`, {
        title: title.trim(),
        artist: artist.trim()
      });
      setSelectedTitle('');
      setSelectedArtist('');
      setSearchQuery('');
      setError('');
      loadRequests();
      e.target.reset();
    } catch (err) {
      setError(err.response?.data?.error || 'Fehler beim Erstellen des Liedwunsches');
    }
  };

  const vote = async (requestId, voteType) => {
    try {
      await api.post(`/api/events/${code}/requests/${requestId}/vote`, { voteType });
      loadRequests();
    } catch (err) {
      setError(err.response?.data?.error || 'Fehler beim Voten');
    }
  };

  if (loading) {
    return <div className="loading">Lade...</div>;
  }

  if (!event) {
    return (
      <div className="container">
        <div className="card">
          <div className="error">Veranstaltung nicht gefunden</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h1 style={{ color: 'white', marginBottom: '8px' }}>{event.name}</h1>
        <p style={{ color: 'white', fontSize: '18px' }}>Liedwünsche</p>
      </div>

      <div className="card">
        <h2>Lied wünschen</h2>
        {error && <div className="error">{error}</div>}

        <form onSubmit={submitRequest}>
          <div className="form-group">
            <label>Musik suchen (Spotify)</label>
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={() => setShowSearch(true)}
              placeholder="Suche nach Lied oder Interpret..."
            />
            {showSearch && searchResults.length > 0 && (
              <div className="search-results">
                {searchResults.map((song) => (
                  <div
                    key={song.id}
                    className="search-result-item"
                    onClick={() => selectSong(song)}
                  >
                    <div className="search-result-title">{song.title}</div>
                    <div className="search-result-artist">{song.artist}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="form-group">
            <label>Titel</label>
            <input
              type="text"
              name="title"
              value={selectedTitle}
              onChange={(e) => setSelectedTitle(e.target.value)}
              placeholder="Liedtitel"
              required
            />
          </div>

          <div className="form-group">
            <label>Interpret</label>
            <input
              type="text"
              name="artist"
              value={selectedArtist}
              onChange={(e) => setSelectedArtist(e.target.value)}
              placeholder="Interpret"
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
            Lied wünschen
          </button>
        </form>
      </div>

      <div className="card">
        <h2>Liedwünsche ({requests.length})</h2>
        {requests.length === 0 ? (
          <p>Noch keine Liedwünsche. Sei der Erste!</p>
        ) : (
          <div>
            {requests.map(request => (
              <div key={request.id} className="request-item">
                <div className="request-info">
                  <div className="request-title">{request.title}</div>
                  <div className="request-artist">{request.artist}</div>
                </div>
                <div className="vote-buttons">
                  <button
                    className="vote-btn up"
                    onClick={() => vote(request.id, 'up')}
                    title="Hoch voten"
                  >
                    ↑
                  </button>
                  <div className="vote-count">{request.votes}</div>
                  <button
                    className="vote-btn down"
                    onClick={() => vote(request.id, 'down')}
                    title="Runter voten"
                  >
                    ↓
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default GuestView;
