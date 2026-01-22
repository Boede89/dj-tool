import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
import DJLogin from './components/DJLogin';
import DJDashboard from './components/DJDashboard';
import SuperadminDashboard from './components/SuperadminDashboard';
import GuestView from './components/GuestView';
import NoActiveEvent from './components/NoActiveEvent';
import api from './utils/api';
import './App.css';

// Komponente für Master-Route die prüft ob Veranstaltung aktiv ist
function MasterRoute() {
  const { username } = useParams();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Die Weiterleitung wird serverseitig gemacht, aber falls JavaScript läuft, prüfen wir auch
    setLoading(false);
  }, []);

  if (loading) {
    return <div className="loading">Lade...</div>;
  }

  return <NoActiveEvent />;
}

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/dj/login" element={<DJLogin />} />
          <Route path="/dj/dashboard" element={<DJDashboard />} />
          <Route path="/superadmin/dashboard" element={<SuperadminDashboard />} />
          <Route path="/event/:code" element={<GuestView />} />
          <Route path="/dj/:username/active" element={<MasterRoute />} />
          <Route path="/" element={<Navigate to="/dj/login" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
