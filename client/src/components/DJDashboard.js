import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import api from '../utils/api';

function DJDashboard() {
  const [events, setEvents] = useState([]);
  const [newEventName, setNewEventName] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [requests, setRequests] = useState([]);
  const [showQRCode, setShowQRCode] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [archive, setArchive] = useState([]);
  const [spotifyClientId, setSpotifyClientId] = useState('');
  const [spotifyClientSecret, setSpotifyClientSecret] = useState('');
  const [hasSpotifyCredentials, setHasSpotifyCredentials] = useState(false);
  const navigate = useNavigate();
  const refreshIntervalRef = useRef(null);
  const qrCodeRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('dj_token');
    if (!token) {
      navigate('/dj/login');
      return;
    }
    loadEvents();
    loadSettings();
  }, [navigate]);

  const loadSettings = async () => {
    try {
      const response = await api.get('/api/dj/settings');
      setHasSpotifyCredentials(response.data.hasSpotifyCredentials);
    } catch (err) {
      console.error('Fehler beim Laden der Einstellungen:', err);
    }
  };

  const saveSpotifyCredentials = async (e) => {
    e.preventDefault();
    try {
      await api.put('/api/dj/settings/spotify', {
        client_id: spotifyClientId,
        client_secret: spotifyClientSecret
      });
      setHasSpotifyCredentials(true);
      setShowSettings(false);
      setSuccess('Spotify Credentials erfolgreich gespeichert!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Fehler beim Speichern der Spotify Credentials');
    }
  };

  const deleteSpotifyCredentials = async () => {
    if (!window.confirm('Möchten Sie die Spotify Credentials wirklich löschen?')) return;
    
    try {
      await api.delete('/api/dj/settings/spotify');
      setHasSpotifyCredentials(false);
      setSpotifyClientId('');
      setSpotifyClientSecret('');
      setSuccess('Spotify Credentials gelöscht');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Fehler beim Löschen der Spotify Credentials');
    }
  };

  // Automatische Aktualisierung der Liedwünsche
  useEffect(() => {
    if (selectedEvent) {
      // Sofort laden
      loadRequests(selectedEvent);
      
      // Dann alle 3 Sekunden aktualisieren
      refreshIntervalRef.current = setInterval(() => {
        loadRequests(selectedEvent);
      }, 3000);

      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
        }
      };
    }
  }, [selectedEvent]);

  const loadEvents = async () => {
    try {
      const response = await api.get('/api/dj/events');
      setEvents(response.data);
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem('dj_token');
        navigate('/dj/login');
      } else {
        setError('Fehler beim Laden der Veranstaltungen');
      }
    } finally {
      setLoading(false);
    }
  };


  const deleteEvent = async (eventId) => {
    if (!window.confirm('Möchten Sie diese Veranstaltung wirklich löschen?')) return;

    try {
      await api.delete(`/api/dj/events/${eventId}`);
      setEvents(events.filter(e => e.id !== eventId));
      if (selectedEvent?.id === eventId) {
        setSelectedEvent(null);
        setRequests([]);
      }
      setSuccess('Veranstaltung gelöscht');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Fehler beim Löschen der Veranstaltung');
    }
  };

  const loadRequests = async (event) => {
    if (!event) return;
    try {
      const response = await api.get(`/api/events/${event.code}/requests`);
      setRequests(response.data);
    } catch (err) {
      console.error('Fehler beim Laden der Liedwünsche:', err);
    }
  };

  const selectEvent = (event) => {
    setSelectedEvent(event);
    setShowQRCode(false);
    loadRequests(event);
  };

  const deleteRequest = async (requestId) => {
    try {
      await api.delete(`/api/dj/events/${selectedEvent.id}/requests/${requestId}`);
      setRequests(requests.filter(r => r.id !== requestId));
      setSuccess('Liedwunsch entfernt');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      setError('Fehler beim Löschen des Liedwunsches');
    }
  };

  const getQRCodeUrl = (eventCode) => {
    return `${window.location.origin}/event/${eventCode}`;
  };

  const printQRCode = () => {
    if (!selectedEvent) return;
    
    const printWindow = window.open('', '_blank');
    const qrUrl = getQRCodeUrl(selectedEvent.code);
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR-Code - ${selectedEvent.name}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              padding: 20px;
            }
            .qr-container {
              text-align: center;
            }
            h1 {
              margin-bottom: 10px;
              color: #333;
            }
            p {
              margin: 5px 0;
              color: #666;
            }
            .url {
              font-size: 14px;
              word-break: break-all;
              margin-top: 20px;
            }
            @media print {
              body { margin: 0; }
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <h1>${selectedEvent.name}</h1>
            <p>Scanne den QR-Code für Liedwünsche</p>
            <div id="qrcode"></div>
            <p class="url">${qrUrl}</p>
          </div>
          <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"></script>
          <script>
            QRCode.toCanvas(document.getElementById('qrcode'), '${qrUrl}', {
              width: 400,
              margin: 2
            }, function (error) {
              if (error) console.error(error);
              setTimeout(() => {
                window.print();
                window.onafterprint = () => window.close();
              }, 500);
            });
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const loadArchive = async () => {
    try {
      const response = await api.get('/api/dj/archive');
      setArchive(response.data);
    } catch (err) {
      setError('Fehler beim Laden des Archivs');
    }
  };

  const deleteArchive = async () => {
    if (!window.confirm('Möchten Sie wirklich das gesamte Archiv löschen?')) return;
    
    try {
      await api.delete('/api/dj/archive');
      setArchive([]);
      setSuccess('Archiv gelöscht');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Fehler beim Löschen des Archivs');
    }
  };

  const deleteArchiveEntry = async (entryId) => {
    try {
      await api.delete(`/api/dj/archive/${entryId}`);
      setArchive(archive.filter(a => a.id !== entryId));
      setSuccess('Eintrag gelöscht');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Fehler beim Löschen des Eintrags');
    }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (!newEventName.trim()) return;

    try {
      const response = await api.post('/api/dj/events', { name: newEventName });
      setEvents([response.data, ...events]);
      setNewEventName('');
      setShowCreateForm(false);
      setSuccess('Veranstaltung erfolgreich erstellt!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Fehler beim Erstellen der Veranstaltung');
    }
  };

  if (loading) {
    return <div className="loading">Lade...</div>;
  }

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ color: 'white' }}>DJ Dashboard</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          {!showCreateForm && !showSettings && !showArchive && (
            <>
              <button
                className="btn btn-primary"
                onClick={() => setShowCreateForm(true)}
              >
                + Neue Veranstaltung
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setShowArchive(true);
                  loadArchive();
                }}
              >
                📚 Archiv
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setShowSettings(true);
                  loadSettings();
                }}
              >
                ⚙️ Einstellungen
              </button>
            </>
          )}
          <button
            className="btn btn-secondary"
            onClick={() => {
              localStorage.removeItem('dj_token');
              navigate('/dj/login');
            }}
          >
            Abmelden
          </button>
        </div>
      </div>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      {showCreateForm && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2>Neue Veranstaltung erstellen</h2>
            <button
              className="btn btn-secondary"
              onClick={() => {
                setShowCreateForm(false);
                setNewEventName('');
              }}
            >
              Abbrechen
            </button>
          </div>
          <form onSubmit={handleCreateEvent}>
            <input
              type="text"
              value={newEventName}
              onChange={(e) => setNewEventName(e.target.value)}
              placeholder="Veranstaltungsname"
              required
              autoFocus
            />
            <button type="submit" className="btn btn-primary">Erstellen</button>
          </form>
        </div>
      )}

      {showSettings && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2>Einstellungen</h2>
            <button
              className="btn btn-secondary"
              onClick={() => {
                setShowSettings(false);
                setSpotifyClientId('');
                setSpotifyClientSecret('');
              }}
            >
              Schließen
            </button>
          </div>

          <div style={{ marginBottom: '30px' }}>
            <h3 style={{ marginBottom: '16px' }}>Spotify API Credentials</h3>
            <p style={{ color: '#666', marginBottom: '20px', fontSize: '14px' }}>
              Um die Spotify-Suche zu nutzen, benötigst du einen Spotify Developer Account.
              Erstelle eine App unter{' '}
              <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noopener noreferrer" style={{ color: '#667eea' }}>
                developer.spotify.com
              </a>
              {' '}und trage hier deine Client ID und Client Secret ein.
            </p>

            {hasSpotifyCredentials && (
              <div style={{ padding: '12px', background: '#d4edda', borderRadius: '8px', marginBottom: '16px', color: '#155724' }}>
                ✓ Spotify Credentials sind konfiguriert
              </div>
            )}

            <form onSubmit={saveSpotifyCredentials}>
              <div className="form-group">
                <label>Spotify Client ID</label>
                <input
                  type="text"
                  value={spotifyClientId}
                  onChange={(e) => setSpotifyClientId(e.target.value)}
                  placeholder="Deine Spotify Client ID"
                  required={!hasSpotifyCredentials}
                />
              </div>

              <div className="form-group">
                <label>Spotify Client Secret</label>
                <input
                  type="password"
                  value={spotifyClientSecret}
                  onChange={(e) => setSpotifyClientSecret(e.target.value)}
                  placeholder="Dein Spotify Client Secret"
                  required={!hasSpotifyCredentials}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" className="btn btn-primary">
                  {hasSpotifyCredentials ? 'Aktualisieren' : 'Speichern'}
                </button>
                {hasSpotifyCredentials && (
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={deleteSpotifyCredentials}
                  >
                    Löschen
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {showArchive && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2>Archiv</h2>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                className="btn btn-danger"
                onClick={deleteArchive}
                disabled={archive.length === 0}
              >
                Gesamtes Archiv löschen
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setShowArchive(false);
                }}
              >
                Schließen
              </button>
            </div>
          </div>

          <p style={{ color: '#666', marginBottom: '20px', fontSize: '14px' }}>
            Hier findest du alle Liedwünsche, die bereits gespielt wurden oder deren Veranstaltung gelöscht wurde.
          </p>

          {archive.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              <p style={{ fontSize: '18px' }}>Das Archiv ist leer</p>
            </div>
          ) : (
            <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
              {archive.map((entry) => (
                <div
                  key={entry.id}
                  style={{
                    padding: '16px',
                    marginBottom: '12px',
                    background: '#f8f9fa',
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '4px' }}>
                      {entry.title}
                    </div>
                    <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
                      {entry.artist}
                    </div>
                    <div style={{ fontSize: '12px', color: '#999' }}>
                      {entry.event_name && (
                        <span>Veranstaltung: <strong>{entry.event_name}</strong> ({entry.event_code})</span>
                      )}
                      {entry.event_name && ' • '}
                      <span>Finale Votes: <strong>{entry.final_votes}</strong></span>
                      {' • '}
                      <span>Gewünscht: {new Date(entry.created_at).toLocaleString('de-DE')}</span>
                      {' • '}
                      <span>Archiviert: {new Date(entry.archived_at).toLocaleString('de-DE')}</span>
                    </div>
                  </div>
                  <button
                    className="btn btn-danger"
                    onClick={() => deleteArchiveEntry(entry.id)}
                    style={{ marginLeft: '16px' }}
                  >
                    Löschen
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!showCreateForm && !showSettings && !showArchive && (
        <div style={{ display: 'grid', gridTemplateColumns: selectedEvent ? '300px 1fr' : '1fr', gap: '20px' }}>
        {/* Event-Liste */}
        <div className="card" style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
          <h2 style={{ marginBottom: '16px' }}>Veranstaltungen</h2>
          {events.length === 0 ? (
            <p style={{ color: '#666' }}>Noch keine Veranstaltungen erstellt.</p>
          ) : (
            <div>
              {events.map(event => (
                <div
                  key={event.id}
                  className={`event-list-item ${selectedEvent?.id === event.id ? 'active' : ''}`}
                  onClick={() => selectEvent(event)}
                  style={{
                    padding: '16px',
                    marginBottom: '8px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    border: selectedEvent?.id === event.id ? '2px solid #667eea' : '1px solid #e0e0e0',
                    background: selectedEvent?.id === event.id ? '#f0f4ff' : 'white',
                    transition: 'all 0.2s'
                  }}
                >
                  <h3 style={{ marginBottom: '8px', fontSize: '18px' }}>{event.name}</h3>
                  <p style={{ color: '#666', fontSize: '12px', marginBottom: '4px' }}>
                    Code: <strong>{event.code}</strong>
                  </p>
                  <p style={{ color: '#667eea', fontSize: '14px', fontWeight: '600' }}>
                    {event.request_count || 0} Liedwünsche
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Event-Details / Liedwünsche */}
        {selectedEvent && (
          <div className="card" style={{ maxHeight: 'calc(100vh - 200px)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '16px', borderBottom: '2px solid #e0e0e0' }}>
              <div>
                <h2 style={{ marginBottom: '4px' }}>{selectedEvent.name}</h2>
                <p style={{ color: '#666', fontSize: '14px' }}>
                  Code: <strong>{selectedEvent.code}</strong>
                </p>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowQRCode(!showQRCode)}
                >
                  {showQRCode ? 'QR-Code verbergen' : 'QR-Code anzeigen'}
                </button>
                {showQRCode && (
                  <button
                    className="btn btn-primary"
                    onClick={printQRCode}
                  >
                    🖨️ QR-Code drucken
                  </button>
                )}
                <button
                  className="btn btn-danger"
                  onClick={() => {
                    if (window.confirm('Möchten Sie diese Veranstaltung wirklich löschen?')) {
                      deleteEvent(selectedEvent.id);
                      setSelectedEvent(null);
                      setShowQRCode(false);
                    }
                  }}
                >
                  Löschen
                </button>
              </div>
            </div>

            {showQRCode && (
              <div style={{ marginBottom: '30px', padding: '20px', background: '#f8f9fa', borderRadius: '8px', textAlign: 'center' }}>
                <h3 style={{ marginBottom: '16px' }}>QR-Code für Gäste</h3>
                <QRCodeSVG value={getQRCodeUrl(selectedEvent.code)} size={200} />
                <p style={{ marginTop: '16px', fontSize: '14px', color: '#666' }}>
                  URL: <a href={getQRCodeUrl(selectedEvent.code)} target="_blank" rel="noopener noreferrer" style={{ color: '#667eea' }}>
                    {getQRCodeUrl(selectedEvent.code)}
                  </a>
                </p>
              </div>
            )}

            <div style={{ flex: 1, overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3>Liedwünsche ({requests.length})</h3>
                <span style={{ fontSize: '12px', color: '#666' }}>Aktualisiert sich automatisch</span>
              </div>
              {requests.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                  <p style={{ fontSize: '18px', marginBottom: '8px' }}>Noch keine Liedwünsche</p>
                  <p style={{ fontSize: '14px' }}>Sobald Gäste Lieder wünschen, erscheinen sie hier.</p>
                </div>
              ) : (
                <div className="requests-list">
                  {requests.map((request, index) => (
                    <div
                      key={request.id}
                      className="request-item-dj"
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '20px',
                        marginBottom: '12px',
                        background: index === 0 ? '#fff9e6' : 'white',
                        border: index === 0 ? '2px solid #ffd700' : '1px solid #e0e0e0',
                        borderRadius: '8px',
                        boxShadow: index === 0 ? '0 4px 8px rgba(255, 215, 0, 0.2)' : '0 2px 4px rgba(0,0,0,0.05)',
                        transition: 'all 0.3s'
                      }}
                    >
                      <div className="request-info" style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                          {index === 0 && (
                            <span style={{
                              background: '#ffd700',
                              color: '#333',
                              padding: '4px 12px',
                              borderRadius: '12px',
                              fontSize: '12px',
                              fontWeight: 'bold'
                            }}>
                              #1
                            </span>
                          )}
                          <div className="request-title" style={{ fontSize: '20px', fontWeight: '600' }}>
                            {request.title}
                          </div>
                        </div>
                        <div className="request-artist" style={{ fontSize: '16px', color: '#666' }}>
                          {request.artist}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#667eea' }}>
                            {request.votes}
                          </div>
                          <div style={{ fontSize: '12px', color: '#666' }}>Votes</div>
                        </div>
                        <button
                          className="btn btn-success"
                          onClick={() => deleteRequest(request.id)}
                          style={{ padding: '10px 20px' }}
                        >
                          ✓ Gespielt
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {!selectedEvent && (
          <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
            <div style={{ textAlign: 'center', color: '#666' }}>
              <p style={{ fontSize: '20px', marginBottom: '8px' }}>Wähle eine Veranstaltung aus</p>
              <p style={{ fontSize: '14px' }}>Klicke auf eine Veranstaltung in der Liste, um die Liedwünsche anzuzeigen</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default DJDashboard;
