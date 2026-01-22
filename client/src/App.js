import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import DJLogin from './components/DJLogin';
import DJDashboard from './components/DJDashboard';
import GuestView from './components/GuestView';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/dj/login" element={<DJLogin />} />
          <Route path="/dj/dashboard" element={<DJDashboard />} />
          <Route path="/event/:code" element={<GuestView />} />
          <Route path="/" element={<Navigate to="/dj/login" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
