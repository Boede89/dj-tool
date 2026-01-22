import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import api from '../utils/api';

function DJDashboard() {
  const [events, setEvents] = useState([]);
  const [newEventName, setNewEventName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [requests, setRequests] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('dj_token');
    if (!token) {
      navigate('/dj/login');
      return;
    }
    loadEvents();
  }, [navigate]);

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

  const createEvent = async (e) => {
    e.preventDefault();
    if (!newEventName.trim()) return;

    try {
      const response = await api.post('/api/dj/events', { name: newEventName });
      setEvents([response.data, ...events]);
      setNewEventName('');
      setSuccess('Veranstaltung erfolgreich erstellt!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Fehler beim Erstellen der Veranstaltung');
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
    setSelectedEvent(event);
    try {
      const response = await api.get(`/api/events/${event.code}/requests`);
      setRequests(response.data);
    } catch (err) {
      setError('Fehler beim Laden der Liedwünsche');
    }
  };

  const deleteRequest = async (requestId) => {
    try {
      await api.delete(`/api/dj/events/${selectedEvent.id}/requests/${requestId}`);
      setRequests(requests.filter(r => r.id !== requestId));
      setSuccess('Liedwunsch entfernt');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Fehler beim Löschen des Liedwunsches');
    }
  };

  const refreshRequests = async () => {
    if (selectedEvent) {
      await loadRequests(selectedEvent);
    }
  };

  const getQRCodeUrl = (eventCode) => {
    return `${window.location.origin}/event/${eventCode}`;
  };

  if (loading) {
    return <div className="loading">Lade...</div>;
  }

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ color: 'white' }}>DJ Dashboard</h1>
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

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      <div className="card">
        <h2>Neue Veranstaltung erstellen</h2>
        <form onSubmit={createEvent}>
          <input
            type="text"
            value={newEventName}
            onChange={(e) => setNewEventName(e.target.value)}
            placeholder="Veranstaltungsname"
            required
          />
          <button type="submit" className="btn btn-primary">Erstellen</button>
        </form>
      </div>

      <div className="card">
        <h2>Meine Veranstaltungen</h2>
        {events.length === 0 ? (
          <p>Noch keine Veranstaltungen erstellt.</p>
        ) : (
          <div>
            {events.map(event => (
              <div key={event.id} style={{ marginBottom: '20px', padding: '16px', border: '1px solid #e0e0e0', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div>
                    <h3 style={{ marginBottom: '4px' }}>{event.name}</h3>
                    <p style={{ color: '#666', fontSize: '14px' }}>
                      Code: <strong>{event.code}</strong> | {event.request_count || 0} Liedwünsche
                    </p>
                  </div>
                  <div>
                    <button
                      className="btn btn-primary"
                      onClick={() => loadRequests(event)}
                      style={{ marginRight: '8px' }}
                    >
                      Liedwünsche anzeigen
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={() => deleteEvent(event.id)}
                    >
                      Löschen
                    </button>
                  </div>
                </div>

                {selectedEvent?.id === event.id && (
                  <div style={{ marginTop: '20px', padding: '20px', background: '#f8f9fa', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                      <h3>QR-Code für Gäste</h3>
                      <button className="btn btn-secondary" onClick={refreshRequests}>
                        Aktualisieren
                      </button>
                    </div>

                    <div className="qr-code-container">
                      <QRCodeSVG value={getQRCodeUrl(event.code)} size={200} />
                      <p style={{ marginTop: '16px', fontSize: '14px', color: '#666' }}>
                        URL: <a href={getQRCodeUrl(event.code)} target="_blank" rel="noopener noreferrer">
                          {getQRCodeUrl(event.code)}
                        </a>
                      </p>
                    </div>

                    <h3 style={{ marginTop: '30px', marginBottom: '16px' }}>Liedwünsche</h3>
                    {requests.length === 0 ? (
                      <p>Noch keine Liedwünsche.</p>
                    ) : (
                      <div>
                        {requests.map(request => (
                          <div key={request.id} className="request-item">
                            <div className="request-info">
                              <div className="request-title">{request.title}</div>
                              <div className="request-artist">{request.artist}</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                              <span style={{ fontSize: '18px', fontWeight: 'bold' }}>
                                {request.votes} Votes
                              </span>
                              <button
                                className="btn btn-danger"
                                onClick={() => deleteRequest(request.id)}
                              >
                                Gespielt ✓
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default DJDashboard;
