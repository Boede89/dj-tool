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

  const searchMusic = async (query) => {
    if (!query || query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await api.get(`/api/music/search/${code}`, {
        params: { q: query, limit: 10 }
      });
      setSearchResults(response.data);
    } catch (err) {
      console.error('Musik-Suchfehler:', err);
      // Fallback: Leere Ergebnisse
      setSearchResults([]);
    }
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    searchMusic(value);
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
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ color: 'white', marginBottom: '12px', fontSize: '36px', fontWeight: '700' }}>{event.name}</h1>
        <p style={{ color: 'white', fontSize: '20px', opacity: 0.9 }}>Liedwünsche</p>
      </div>

      <div className="card" style={{ marginBottom: '24px', boxShadow: '0 8px 16px rgba(0,0,0,0.15)' }}>
        <h2 style={{ marginBottom: '24px', fontSize: '24px', color: '#333' }}>🎵 Lied wünschen</h2>
        {error && <div className="error">{error}</div>}

        <form onSubmit={submitRequest}>
          <div className="form-group">
            <label>Musik suchen</label>
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

          <button type="submit" className="btn btn-primary" style={{ width: '100%', fontSize: '18px', padding: '14px', marginTop: '8px' }}>
            ✨ Lied wünschen
          </button>
        </form>
      </div>

      <div className="card" style={{ boxShadow: '0 8px 16px rgba(0,0,0,0.15)' }}>
        <h2 style={{ marginBottom: '24px', fontSize: '24px', color: '#333' }}>
          📋 Liedwünsche ({requests.length})
        </h2>
        {requests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            <p style={{ fontSize: '18px', marginBottom: '8px' }}>🎵 Noch keine Liedwünsche</p>
            <p style={{ fontSize: '14px' }}>Sei der Erste und wünsche dein Lieblingslied!</p>
          </div>
        ) : (
          <div>
            {requests.map(request => (
              <div 
                key={request.id} 
                className="request-item"
                style={{
                  padding: '20px',
                  marginBottom: '16px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                  border: '1px solid #e0e0e0',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  transition: 'all 0.3s ease'
                }}
              >
                <div className="request-info" style={{ flex: 1 }}>
                  <div className="request-title" style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px', color: '#333' }}>
                    {request.title}
                  </div>
                  <div className="request-artist" style={{ fontSize: '16px', color: '#666' }}>
                    {request.artist}
                  </div>
                </div>
                <div className="vote-buttons" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button
                    className="vote-btn up"
                    onClick={() => vote(request.id, 'up')}
                    title="Hoch voten"
                    style={{
                      fontSize: '24px',
                      padding: '12px 16px',
                      borderRadius: '50%',
                      width: '50px',
                      height: '50px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: '#27ae60',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      boxShadow: '0 2px 4px rgba(39, 174, 96, 0.3)'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.transform = 'scale(1.1)';
                      e.target.style.boxShadow = '0 4px 8px rgba(39, 174, 96, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.transform = 'scale(1)';
                      e.target.style.boxShadow = '0 2px 4px rgba(39, 174, 96, 0.3)';
                    }}
                  >
                    👍
                  </button>
                  <div className="vote-count" style={{ 
                    fontSize: '24px', 
                    fontWeight: 'bold', 
                    minWidth: '50px', 
                    textAlign: 'center',
                    color: '#667eea'
                  }}>
                    {request.votes}
                  </div>
                  <button
                    className="vote-btn down"
                    onClick={() => vote(request.id, 'down')}
                    title="Runter voten"
                    style={{
                      fontSize: '24px',
                      padding: '12px 16px',
                      borderRadius: '50%',
                      width: '50px',
                      height: '50px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: '#e74c3c',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      boxShadow: '0 2px 4px rgba(231, 76, 60, 0.3)'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.transform = 'scale(1.1)';
                      e.target.style.boxShadow = '0 4px 8px rgba(231, 76, 60, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.transform = 'scale(1)';
                      e.target.style.boxShadow = '0 2px 4px rgba(231, 76, 60, 0.3)';
                    }}
                  >
                    👎
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
