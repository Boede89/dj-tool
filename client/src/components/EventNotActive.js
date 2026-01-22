import React from 'react';

function EventNotActive() {
  return (
    <div className="container">
      <div style={{ textAlign: 'center', marginTop: '100px' }}>
        <div className="card" style={{ maxWidth: '500px', margin: '0 auto', padding: '60px 40px' }}>
          <div style={{ fontSize: '64px', marginBottom: '30px' }}>⏸️</div>
          <h1 style={{ color: '#333', marginBottom: '20px', fontSize: '32px' }}>
            Veranstaltung noch nicht aktiv
          </h1>
          <p style={{ color: '#666', fontSize: '18px', lineHeight: '1.6' }}>
            Die Veranstaltung ist noch nicht aktiv.
          </p>
          <p style={{ color: '#999', fontSize: '14px', marginTop: '20px' }}>
            Bitte warte, bis der DJ die Veranstaltung aktiviert hat.
          </p>
        </div>
      </div>
    </div>
  );
}

export default EventNotActive;
