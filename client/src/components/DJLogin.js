import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

function DJLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const endpoint = isRegistering ? '/api/dj/register' : '/api/dj/login';
      const response = await api.post(endpoint, { username, password });

      if (isRegistering) {
        alert('Registrierung erfolgreich! Bitte jetzt einloggen.');
        setIsRegistering(false);
        setPassword('');
      } else {
        localStorage.setItem('dj_token', response.data.token);
        navigate('/dj/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Ein Fehler ist aufgetreten');
    }
  };

  return (
    <div className="container" style={{ maxWidth: '400px', marginTop: '100px' }}>
      <div className="card">
        <h1 style={{ textAlign: 'center', marginBottom: '30px', color: '#333' }}>
          {isRegistering ? 'DJ Registrierung' : 'DJ Login'}
        </h1>
        
        {error && <div className="error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="Dein Username"
            />
          </div>

          <div className="form-group">
            <label>Passwort</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Dein Passwort"
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
            {isRegistering ? 'Registrieren' : 'Einloggen'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setIsRegistering(!isRegistering);
              setError('');
            }}
            style={{ width: '100%' }}
          >
            {isRegistering ? 'Bereits registriert? Einloggen' : 'Noch kein Account? Registrieren'}
          </button>
        </div>

        <div style={{ marginTop: '20px', padding: '16px', background: '#f8f9fa', borderRadius: '8px', fontSize: '14px', color: '#666' }}>
          <strong>Standard-Login:</strong><br />
          Username: admin<br />
          Passwort: admin<br />
          <em>(Bitte nach dem ersten Login ändern!)</em>
        </div>
      </div>
    </div>
  );
}

export default DJLogin;
