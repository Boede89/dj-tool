import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

function SuperadminDashboard() {
  const [djs, setDjs] = useState([]);
  const [selectedDj, setSelectedDj] = useState(null);
  const [djData, setDjData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('dj_token');
    if (!token) {
      navigate('/dj/login');
      return;
    }
    loadDJs();
  }, [navigate]);

  const loadDJs = async () => {
    try {
      const response = await api.get('/api/superadmin/djs');
      setDjs(response.data);
    } catch (err) {
      if (err.response?.status === 403) {
        navigate('/dj/dashboard');
      } else {
        setError('Fehler beim Laden der DJs');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadDJData = async (djId) => {
    try {
      const response = await api.get(`/api/superadmin/djs/${djId}/data`);
      setDjData(response.data);
      setSelectedDj(djId);
    } catch (err) {
      setError('Fehler beim Laden der DJ-Daten');
    }
  };

  const changePassword = async (djId) => {
    if (!newPassword || newPassword.length < 4) {
      setError('Passwort muss mindestens 4 Zeichen lang sein');
      return;
    }

    try {
      await api.put(`/api/superadmin/djs/${djId}/password`, { password: newPassword });
      setNewPassword('');
      setSuccess('Passwort erfolgreich geändert');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Fehler beim Ändern des Passworts');
    }
  };

  const deleteDJ = async (djId) => {
    if (!window.confirm('Möchten Sie diesen DJ wirklich löschen? Alle Daten werden ins Archiv verschoben.')) return;

    try {
      await api.delete(`/api/superadmin/djs/${djId}`);
      setDjs(djs.filter(d => d.id !== djId));
      if (selectedDj === djId) {
        setSelectedDj(null);
        setDjData(null);
      }
      setSuccess('DJ erfolgreich gelöscht');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Fehler beim Löschen des DJs');
    }
  };

  if (loading) {
    return <div className="loading">Lade...</div>;
  }

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ color: 'white' }}>Superadmin Dashboard</h1>
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

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '20px' }}>
        <div className="card">
          <h2 style={{ marginBottom: '16px' }}>DJs ({djs.length})</h2>
          {djs.map(dj => (
            <div
              key={dj.id}
              style={{
                padding: '16px',
                marginBottom: '8px',
                borderRadius: '8px',
                border: selectedDj === dj.id ? '2px solid #667eea' : '1px solid #e0e0e0',
                background: selectedDj === dj.id ? '#f0f4ff' : 'white',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onClick={() => loadDJData(dj.id)}
            >
              <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                {dj.username}
                {dj.is_superadmin === 1 && (
                  <span style={{ marginLeft: '8px', fontSize: '12px', color: '#e74c3c' }}>(Superadmin)</span>
                )}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                Erstellt: {new Date(dj.created_at).toLocaleDateString('de-DE')}
              </div>
            </div>
          ))}
        </div>

        {selectedDj && (
          <div className="card">
            <h2 style={{ marginBottom: '20px' }}>
              {djs.find(d => d.id === selectedDj)?.username}
            </h2>

            <div style={{ marginBottom: '30px' }}>
              <h3 style={{ marginBottom: '16px' }}>Passwort ändern</h3>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Neues Passwort"
                  style={{ flex: 1 }}
                />
                <button
                  className="btn btn-primary"
                  onClick={() => changePassword(selectedDj)}
                >
                  Passwort ändern
                </button>
              </div>
            </div>

            <div style={{ marginBottom: '30px', paddingTop: '20px', borderTop: '1px solid #e0e0e0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3>Veranstaltungen ({djData?.events?.length || 0})</h3>
                <button
                  className="btn btn-danger"
                  onClick={() => deleteDJ(selectedDj)}
                >
                  DJ löschen
                </button>
              </div>
              {djData?.events?.length === 0 ? (
                <p style={{ color: '#666' }}>Keine Veranstaltungen</p>
              ) : (
                <div>
                  {djData?.events?.map(event => (
                    <div key={event.id} style={{ padding: '12px', marginBottom: '8px', background: '#f8f9fa', borderRadius: '8px' }}>
                      <strong>{event.name}</strong> ({event.code})
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 style={{ marginBottom: '16px' }}>Archiv ({djData?.archive?.length || 0})</h3>
              {djData?.archive?.length === 0 ? (
                <p style={{ color: '#666' }}>Keine archivierten Einträge</p>
              ) : (
                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  {djData?.archive?.map(entry => (
                    <div key={entry.id} style={{ padding: '12px', marginBottom: '8px', background: '#f8f9fa', borderRadius: '8px', fontSize: '14px' }}>
                      <strong>{entry.title}</strong> - {entry.artist}
                      {entry.event_name && <span style={{ color: '#666' }}> ({entry.event_name})</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default SuperadminDashboard;
