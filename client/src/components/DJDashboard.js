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
  const [djUsername, setDjUsername] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [archive, setArchive] = useState([]);
  const [selectedArchiveEvent, setSelectedArchiveEvent] = useState(null);
  const [spotifyClientId, setSpotifyClientId] = useState('');
  const [spotifyClientSecret, setSpotifyClientSecret] = useState('');
  const [hasSpotifyCredentials, setHasSpotifyCredentials] = useState(false);
  const [musicSource, setMusicSource] = useState('itunes');
  const [activeEvent, setActiveEvent] = useState(null);
  const [masterQRCode, setMasterQRCode] = useState(null);
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

  useEffect(() => {
    // Aktive Veranstaltung und Master-QR-Code aktualisieren wenn Events geladen werden
    if (events.length > 0) {
      loadActiveEvent();
      loadMasterQRCode();
    }
  }, [events]);

  const loadSettings = async () => {
    try {
      const response = await api.get('/api/dj/settings');
      setHasSpotifyCredentials(response.data.hasSpotifyCredentials);
      setMusicSource(response.data.musicSource || 'itunes');
      setDjUsername(response.data.username);
      await loadActiveEvent();
      await loadMasterQRCode();
    } catch (err) {
      console.error('Fehler beim Laden der Einstellungen:', err);
    }
  };

  const loadActiveEvent = async () => {
    try {
      const response = await api.get('/api/dj/settings/active-event');
      setActiveEvent(response.data);
    } catch (err) {
      console.error('Fehler beim Laden der aktiven Veranstaltung:', err);
    }
  };

  const loadMasterQRCode = async () => {
    try {
      const response = await api.get('/api/dj/master-qr');
      setMasterQRCode(response.data);
    } catch (err) {
      console.error('Fehler beim Laden des Master-QR-Codes:', err);
      setMasterQRCode(null);
    }
  };

  const toggleEventActive = async (eventId, isActive) => {
    try {
      await api.put(`/api/dj/events/${eventId}/active`, { isActive });
      await loadEvents();
      await loadActiveEvent();
      await loadMasterQRCode();
      setSuccess(isActive ? 'Veranstaltung aktiviert' : 'Veranstaltung deaktiviert');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Fehler beim Ändern des Veranstaltungsstatus');
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

  const saveMusicSource = async (source) => {
    try {
      await api.put('/api/dj/settings/music-source', { musicSource: source });
      setMusicSource(source);
      setSuccess('Musikdatenbank-Quelle erfolgreich geändert');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Fehler beim Ändern der Musikdatenbank-Quelle');
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

  const printMasterQRCode = () => {
    if (!masterQRCode) return;
    
    const qrUrl = masterQRCode.url;
    const dataUrl = masterQRCode.qrCode;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      setError('Pop-up-Blocker verhindert das Öffnen des Druckfensters. Bitte Pop-ups für diese Seite erlauben.');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Master QR-Code - DJ ${djUsername.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            @media print {
              body { 
                margin: 0; 
                padding: 0; 
                background: white;
              }
              .no-print { display: none; }
              @page {
                margin: 15mm;
                size: A4;
              }
              .qr-container {
                box-shadow: none;
                border: none;
                padding: 0;
              }
            }
            @media screen {
              body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', sans-serif;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                margin: 0;
                padding: 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              }
            }
            .qr-container {
              text-align: center;
              padding: 60px 50px;
              background: white;
              border-radius: 20px;
              box-shadow: 0 20px 60px rgba(0,0,0,0.3);
              max-width: 600px;
              width: 100%;
            }
            .event-header {
              margin-bottom: 30px;
              padding-bottom: 25px;
              border-bottom: 3px solid #667eea;
            }
            h1 {
              margin-bottom: 15px;
              color: #333;
              font-size: 32px;
              font-weight: 700;
              letter-spacing: -0.5px;
            }
            .dj-name {
              font-size: 20px;
              font-weight: 600;
              color: #667eea;
              margin-bottom: 8px;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .subtitle {
              margin-top: 15px;
              color: #666;
              font-size: 18px;
              font-weight: 400;
            }
            .master-badge {
              display: inline-block;
              padding: 8px 16px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              border-radius: 20px;
              font-size: 14px;
              font-weight: 600;
              margin-bottom: 20px;
            }
            .qr-wrapper {
              margin: 40px 0;
              padding: 30px;
              background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
              border-radius: 16px;
              border: 2px dashed #667eea;
              display: inline-block;
            }
            .qr-image {
              display: block;
              margin: 0 auto;
              max-width: 350px;
              width: 100%;
              height: auto;
              border-radius: 12px;
              box-shadow: 0 8px 24px rgba(0,0,0,0.15);
            }
            .instruction {
              margin-top: 35px;
              padding: 20px;
              background: #f0f4ff;
              border-radius: 12px;
              border-left: 4px solid #667eea;
            }
            .instruction-text {
              font-size: 16px;
              color: #555;
              line-height: 1.6;
              font-weight: 500;
            }
            .instruction-icon {
              font-size: 24px;
              margin-bottom: 10px;
            }
            .print-button {
              margin-top: 30px;
              padding: 16px 40px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              border: none;
              border-radius: 12px;
              font-size: 18px;
              font-weight: 600;
              cursor: pointer;
              box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
              transition: all 0.3s;
            }
            .print-button:hover {
              transform: translateY(-2px);
              box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
            }
            .print-button:active {
              transform: translateY(0);
            }
            .decorative-line {
              width: 80px;
              height: 4px;
              background: linear-gradient(90deg, #667eea, #764ba2);
              margin: 25px auto;
              border-radius: 2px;
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <div class="event-header">
              <div class="master-badge">MASTER QR-CODE</div>
              <div class="dj-name">DJ ${djUsername.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
              <div class="decorative-line"></div>
              <p class="subtitle">Führt zur aktiven Veranstaltung</p>
            </div>
            
            <div class="qr-wrapper">
              <img src="${dataUrl}" alt="QR-Code" class="qr-image" />
            </div>
            
            <div class="instruction">
              <div class="instruction-icon">📱</div>
              <div class="instruction-text">
                Scanne den QR-Code mit deinem Smartphone<br>
                um zur aktiven Veranstaltung zu gelangen
              </div>
            </div>
            
            <button class="print-button no-print" onclick="window.print()">🖨️ Drucken</button>
          </div>
          <script>
            window.onload = function() {
              setTimeout(() => {
                window.print();
              }, 500);
            };
            window.onafterprint = function() {
              setTimeout(() => window.close(), 100);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const printQRCode = () => {
    if (!selectedEvent) return;
    
    const qrUrl = getQRCodeUrl(selectedEvent.code);
    
    // QR-Code vom Backend als Data URL abrufen
    api.get(`/api/qr/${selectedEvent.code}`)
      .then(response => {
        const dataUrl = response.data.qrCode;
        
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
          setError('Pop-up-Blocker verhindert das Öffnen des Druckfensters. Bitte Pop-ups für diese Seite erlauben.');
          return;
        }

        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>QR-Code - ${selectedEvent.name.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</title>
              <style>
                * {
                  margin: 0;
                  padding: 0;
                  box-sizing: border-box;
                }
                @media print {
                  body { 
                    margin: 0; 
                    padding: 0; 
                    background: white;
                  }
                  .no-print { display: none; }
                  @page {
                    margin: 15mm;
                    size: A4;
                  }
                  .qr-container {
                    box-shadow: none;
                    border: none;
                    padding: 0;
                  }
                }
                @media screen {
                  body { 
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', sans-serif;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    min-height: 100vh;
                    margin: 0;
                    padding: 20px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                  }
                }
                .qr-container {
                  text-align: center;
                  padding: 60px 50px;
                  background: white;
                  border-radius: 20px;
                  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                  max-width: 600px;
                  width: 100%;
                }
                .event-header {
                  margin-bottom: 30px;
                  padding-bottom: 25px;
                  border-bottom: 3px solid #667eea;
                }
                h1 {
                  margin-bottom: 15px;
                  color: #333;
                  font-size: 32px;
                  font-weight: 700;
                  letter-spacing: -0.5px;
                }
                .dj-name {
                  font-size: 20px;
                  font-weight: 600;
                  color: #667eea;
                  margin-bottom: 8px;
                  text-transform: uppercase;
                  letter-spacing: 1px;
                }
                .subtitle {
                  margin-top: 15px;
                  color: #666;
                  font-size: 18px;
                  font-weight: 400;
                }
                .qr-wrapper {
                  margin: 40px 0;
                  padding: 30px;
                  background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
                  border-radius: 16px;
                  border: 2px dashed #667eea;
                  display: inline-block;
                }
                .qr-image {
                  display: block;
                  margin: 0 auto;
                  max-width: 350px;
                  width: 100%;
                  height: auto;
                  border-radius: 12px;
                  box-shadow: 0 8px 24px rgba(0,0,0,0.15);
                }
                .instruction {
                  margin-top: 35px;
                  padding: 20px;
                  background: #f0f4ff;
                  border-radius: 12px;
                  border-left: 4px solid #667eea;
                }
                .instruction-text {
                  font-size: 16px;
                  color: #555;
                  line-height: 1.6;
                  font-weight: 500;
                }
                .instruction-icon {
                  font-size: 24px;
                  margin-bottom: 10px;
                }
                .print-button {
                  margin-top: 30px;
                  padding: 16px 40px;
                  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                  color: white;
                  border: none;
                  border-radius: 12px;
                  font-size: 18px;
                  font-weight: 600;
                  cursor: pointer;
                  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
                  transition: all 0.3s;
                }
                .print-button:hover {
                  transform: translateY(-2px);
                  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
                }
                .print-button:active {
                  transform: translateY(0);
                }
                .decorative-line {
                  width: 80px;
                  height: 4px;
                  background: linear-gradient(90deg, #667eea, #764ba2);
                  margin: 25px auto;
                  border-radius: 2px;
                }
              </style>
            </head>
            <body>
              <div class="qr-container">
                <div class="event-header">
                  <div class="dj-name">DJ ${djUsername.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
                  <h1>${selectedEvent.name.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</h1>
                  <div class="decorative-line"></div>
                  <p class="subtitle">Liedwünsche</p>
                </div>
                
                <div class="qr-wrapper">
                  <img src="${dataUrl}" alt="QR-Code" class="qr-image" />
                </div>
                
                <div class="instruction">
                  <div class="instruction-icon">📱</div>
                  <div class="instruction-text">
                    Scanne den QR-Code mit deinem Smartphone<br>
                    um Lieder zu wünschen
                  </div>
                </div>
                
                <button class="print-button no-print" onclick="window.print()">🖨️ Drucken</button>
              </div>
              <script>
                // Automatisch Druck-Dialog öffnen nach kurzer Verzögerung
                window.onload = function() {
                  setTimeout(() => {
                    window.print();
                  }, 500);
                };
                
                // Fenster schließen nach Druck (falls unterstützt)
                window.onafterprint = function() {
                  setTimeout(() => window.close(), 100);
                };
              </script>
            </body>
          </html>
        `);
        printWindow.document.close();
      })
      .catch(err => {
        console.error('Fehler beim Abrufen des QR-Codes:', err);
        setError('Fehler beim Generieren des QR-Codes');
      });
  };

  const loadArchive = async () => {
    try {
      const response = await api.get('/api/dj/archive');
      setArchive(response.data);
    } catch (err) {
      setError('Fehler beim Laden des Archivs');
    }
  };


  const deleteArchiveEvent = async (eventCode) => {
    if (!window.confirm('Möchten Sie diese Veranstaltung wirklich aus dem Archiv löschen?')) return;
    
    try {
      await api.delete(`/api/dj/archive/event/${eventCode}`);
      setArchive(archive.filter(a => a.event_code !== eventCode));
      if (selectedArchiveEvent === eventCode) {
        setSelectedArchiveEvent(null);
      }
      setSuccess('Veranstaltung aus Archiv gelöscht');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Fehler beim Löschen der Veranstaltung');
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
          {showArchive && (
            <button
              className="btn btn-secondary"
              onClick={() => {
                setShowArchive(false);
                setSelectedArchiveEvent(null);
              }}
            >
              Archiv schließen
            </button>
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
            <h3 style={{ marginBottom: '16px' }}>Musikdatenbank</h3>
            <p style={{ color: '#666', marginBottom: '20px', fontSize: '14px' }}>
              Wähle die Musikdatenbank, die für die Suche verwendet werden soll.
            </p>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '12px', fontWeight: '600' }}>
                Datenbank-Quelle
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="musicSource"
                    value="itunes"
                    checked={musicSource === 'itunes'}
                    onChange={(e) => saveMusicSource(e.target.value)}
                    style={{ marginRight: '8px' }}
                  />
                  <div>
                    <strong>iTunes/Apple Music</strong> (Empfohlen)
                    <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                      Kostenlos, keine API-Keys erforderlich, große Datenbank
                    </div>
                  </div>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="musicSource"
                    value="musicbrainz"
                    checked={musicSource === 'musicbrainz'}
                    onChange={(e) => saveMusicSource(e.target.value)}
                    style={{ marginRight: '8px' }}
                  />
                  <div>
                    <strong>MusicBrainz</strong>
                    <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                      Kostenlos, keine API-Keys erforderlich, offene Musikdatenbank
                    </div>
                  </div>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="musicSource"
                    value="spotify"
                    checked={musicSource === 'spotify'}
                    onChange={(e) => saveMusicSource(e.target.value)}
                    style={{ marginRight: '8px' }}
                  />
                  <div>
                    <strong>Spotify</strong>
                    <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                      Benötigt API-Keys (aktuell nicht verfügbar), Premium-Features
                    </div>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '30px', paddingTop: '30px', borderTop: '1px solid #e0e0e0' }}>
            <h3 style={{ marginBottom: '16px' }}>Master QR-Code</h3>
            <p style={{ color: '#666', marginBottom: '20px', fontSize: '14px' }}>
              Dieser QR-Code führt immer zur aktiven Veranstaltung. Du kannst ihn einmal ausdrucken und immer wieder verwenden.
            </p>

            {masterQRCode ? (
              <div style={{ textAlign: 'center', padding: '30px', background: '#f8f9fa', borderRadius: '12px', marginBottom: '20px' }}>
                {masterQRCode.event && (
                  <div style={{ marginBottom: '16px' }}>
                    <strong style={{ color: '#667eea', fontSize: '16px' }}>
                      Aktive Veranstaltung: {masterQRCode.event.name}
                    </strong>
                  </div>
                )}
                {!masterQRCode.event && (
                  <div style={{ marginBottom: '16px', padding: '12px', background: '#fff3cd', borderRadius: '8px', color: '#856404' }}>
                    <p style={{ margin: 0, fontSize: '14px' }}>
                      ⚠️ Keine aktive Veranstaltung. Aktiviere eine Veranstaltung in der Veranstaltungsliste.
                    </p>
                  </div>
                )}
                <img src={masterQRCode.qrCode} alt="Master QR-Code" style={{ maxWidth: '250px', width: '100%', height: 'auto' }} />
                <p style={{ marginTop: '16px', fontSize: '14px', color: '#666' }}>
                  URL: <a href={masterQRCode.url} target="_blank" rel="noopener noreferrer" style={{ color: '#667eea' }}>
                    {masterQRCode.url}
                  </a>
                </p>
                <button
                  className="btn btn-primary"
                  onClick={() => printMasterQRCode()}
                  style={{ marginTop: '20px' }}
                  disabled={!masterQRCode}
                >
                  🖨️ Master QR-Code drucken
                </button>
              </div>
            ) : (
              <div style={{ padding: '20px', background: '#f8f9fa', borderRadius: '8px', textAlign: 'center' }}>
                <p style={{ margin: 0, color: '#666' }}>
                  Lade QR-Code...
                </p>
              </div>
            )}
          </div>

          <div style={{ marginBottom: '30px', paddingTop: '30px', borderTop: '1px solid #e0e0e0' }}>
            <h3 style={{ marginBottom: '16px' }}>Spotify API Credentials</h3>
            <p style={{ color: '#666', marginBottom: '20px', fontSize: '14px' }}>
              Um die Spotify-Suche zu nutzen, benötigst du einen Spotify Developer Account.
              Erstelle eine App unter{' '}
              <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noopener noreferrer" style={{ color: '#667eea' }}>
                developer.spotify.com
              </a>
              {' '}und trage hier deine Client ID und Client Secret ein.
              <br />
              <strong style={{ color: '#e74c3c' }}>Hinweis:</strong> Spotify erlaubt aktuell keine neuen App-Registrierungen.
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
        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '20px', width: '100%' }}>
          <div className="card" style={{ position: 'relative', overflow: 'visible' }}>
            <div style={{ 
              marginBottom: '16px',
              paddingBottom: '16px', 
              borderBottom: '1px solid #e0e0e0'
            }}>
              <h2 style={{ margin: 0 }}>Veranstaltungen</h2>
            </div>
            {archive.length === 0 ? (
              <p style={{ color: '#666' }}>Keine archivierten Veranstaltungen</p>
            ) : (
              <div style={{ maxHeight: 'calc(100vh - 300px)', overflowY: 'auto' }}>
                {archive.map((eventGroup) => (
                  <div
                    key={eventGroup.event_code}
                    onClick={() => setSelectedArchiveEvent(eventGroup.event_code)}
                    style={{
                      padding: '16px',
                      marginBottom: '8px',
                      borderRadius: '8px',
                      border: selectedArchiveEvent === eventGroup.event_code ? '2px solid #667eea' : '1px solid #e0e0e0',
                      background: selectedArchiveEvent === eventGroup.event_code ? '#f0f4ff' : 'white',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                      {eventGroup.event_name || 'Unbekannte Veranstaltung'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                      Code: {eventGroup.event_code}
                    </div>
                    <div style={{ fontSize: '14px', color: '#667eea', fontWeight: '600' }}>
                      {eventGroup.entries.length} Liedwünsche
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {selectedArchiveEvent && (
            <div className="card" style={{ position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '16px', borderBottom: '2px solid #e0e0e0', position: 'sticky', top: 0, background: 'white', zIndex: 10 }}>
                <h2 style={{ margin: 0 }}>
                  {archive.find(e => e.event_code === selectedArchiveEvent)?.event_name || 'Unbekannte Veranstaltung'}
                </h2>
                <button
                  className="btn btn-danger"
                  onClick={() => deleteArchiveEvent(selectedArchiveEvent)}
                  style={{ flexShrink: 0 }}
                >
                  Veranstaltung löschen
                </button>
              </div>

              <div style={{ maxHeight: 'calc(100vh - 300px)', overflowY: 'auto' }}>
                {archive.find(e => e.event_code === selectedArchiveEvent)?.entries.length === 0 ? (
                  <p style={{ color: '#666' }}>Keine Liedwünsche in dieser Veranstaltung</p>
                ) : (
                  archive.find(e => e.event_code === selectedArchiveEvent)?.entries.map((entry) => (
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
                          <span>Finale Votes: <strong>{entry.final_votes}</strong></span>
                          {' • '}
                          <span>Gewünscht: {new Date(entry.created_at).toLocaleString('de-DE')}</span>
                          {' • '}
                          <span>Archiviert: {new Date(entry.archived_at).toLocaleString('de-DE')}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {!selectedArchiveEvent && archive.length > 0 && (
            <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
              <div style={{ textAlign: 'center', color: '#666' }}>
                <p style={{ fontSize: '20px', marginBottom: '8px' }}>Wähle eine Veranstaltung aus</p>
                <p style={{ fontSize: '14px' }}>Klicke auf eine Veranstaltung in der Liste, um die Liedwünsche anzuzeigen</p>
              </div>
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
                  style={{
                    padding: '16px',
                    marginBottom: '8px',
                    borderRadius: '8px',
                    border: selectedEvent?.id === event.id ? '2px solid #667eea' : '1px solid #e0e0e0',
                    background: selectedEvent?.id === event.id ? '#f0f4ff' : 'white',
                    transition: 'all 0.2s'
                  }}
                >
                  <div
                    onClick={() => selectEvent(event)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <h3 style={{ fontSize: '18px', margin: 0 }}>{event.name}</h3>
                      {event.is_active === 1 && (
                        <span style={{
                          background: '#27ae60',
                          color: 'white',
                          padding: '4px 12px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          textTransform: 'uppercase'
                        }}>
                          Aktiv
                        </span>
                      )}
                    </div>
                    <p style={{ color: '#666', fontSize: '12px', marginBottom: '4px' }}>
                      Code: <strong>{event.code}</strong>
                    </p>
                    <p style={{ color: '#667eea', fontSize: '14px', fontWeight: '600' }}>
                      {event.request_count || 0} Liedwünsche
                    </p>
                  </div>
                  <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e0e0e0' }}>
                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '14px' }}>
                      <input
                        type="checkbox"
                        checked={event.is_active === 1}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleEventActive(event.id, e.target.checked);
                        }}
                        style={{ marginRight: '8px', width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                      <span style={{ color: '#666' }}>
                        {event.is_active === 1 ? 'Aktiv' : 'Als aktiv setzen'}
                      </span>
                    </label>
                  </div>
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
      )}
    </div>
  );
}

export default DJDashboard;
