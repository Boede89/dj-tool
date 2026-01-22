import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
import DJLogin from './components/DJLogin';
import DJDashboard from './components/DJDashboard';
import SuperadminDashboard from './components/SuperadminDashboard';
import GuestView from './components/GuestView';
import NoActiveEvent from './components/NoActiveEvent';
import EventNotActive from './components/EventNotActive';
import EventEnded from './components/EventEnded';
import api from './utils/api';
import './App.css';

// Wrapper für Event-Route, der prüft ob Veranstaltung existiert und aktiv ist
function EventRoute() {
  const { code } = useParams();
  const [status, setStatus] = React.useState('loading');
  const [event, setEvent] = React.useState(null);

  React.useEffect(() => {
    const checkEvent = async () => {
      try {
        const response = await api.get(`/api/events/${code}`);
        const eventData = response.data;
        setEvent(eventData);
        
        // Prüfen ob Veranstaltung aktiv ist
        if (eventData.is_active === 0 || eventData.is_active === false) {
          setStatus('not_active');
        } else {
          setStatus('active');
        }
      } catch (err) {
        // Veranstaltung existiert nicht mehr (404)
        if (err.response?.status === 404) {
          setStatus('ended');
        } else {
          setStatus('error');
        }
      }
    };
    
    checkEvent();
  }, [code]);

  if (status === 'loading') {
    return <div className="loading">Lade...</div>;
  }

  if (status === 'not_active') {
    return <EventNotActive />;
  }

  if (status === 'ended') {
    return <EventEnded />;
  }

  if (status === 'active') {
    return <GuestView />;
  }

  return <EventEnded />;
}

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/dj/login" element={<DJLogin />} />
          <Route path="/dj/dashboard" element={<DJDashboard />} />
          <Route path="/superadmin/dashboard" element={<SuperadminDashboard />} />
          <Route path="/event/:code" element={<EventRoute />} />
          <Route path="/dj/:username/active" element={<NoActiveEvent />} />
          <Route path="/" element={<Navigate to="/dj/login" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
