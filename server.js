require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./database');
const authRoutes = require('./routes/auth');
const eventRoutes = require('./routes/events');
const requestRoutes = require('./routes/requests');
const spotifyRoutes = require('./routes/spotify');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.set('trust proxy', true); // Für korrekte IP-Erkennung hinter Proxy
app.use(express.static(path.join(__dirname, 'client/build')));

// API Routes
app.use('/api/dj', authRoutes);
app.use('/api/dj/events', eventRoutes);
app.use('/api/dj/settings', require('./routes/settings'));
app.use('/api/dj/archive', require('./routes/archive'));
app.use('/api/events', requestRoutes);
app.use('/api/spotify', spotifyRoutes);

// QR-Code Endpunkt
app.get('/api/qr/:eventCode', async (req, res) => {
  try {
    const QRCode = require('qrcode');
    const eventUrl = `${req.protocol}://${req.get('host')}/event/${req.params.eventCode}`;
    const qrCodeDataUrl = await QRCode.toDataURL(eventUrl);
    res.json({ qrCode: qrCodeDataUrl, url: eventUrl });
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Generieren des QR-Codes' });
  }
});

// Frontend Routes (React App) - müssen VOR den API Routes kommen, aber nach express.static
// Root Route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

// Frontend Routes (React App)
app.get('/event/:code', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

app.get('/dj/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

// Catch-all Route für alle anderen Frontend-Routes (muss am Ende stehen)
app.get('*', (req, res) => {
  // Nur wenn es keine API-Route ist
  if (!req.path.startsWith('/api/')) {
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
  } else {
    res.status(404).json({ error: 'Not Found' });
  }
});

// Datenbank initialisieren
db.init().then(() => {
  app.listen(PORT, () => {
    console.log(`Server läuft auf Port ${PORT}`);
  });
}).catch(err => {
  console.error('Fehler beim Initialisieren der Datenbank:', err);
  process.exit(1);
});
