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
app.use('/api/superadmin', require('./routes/superadmin'));
app.use('/api/events', requestRoutes);
app.use('/api/spotify', spotifyRoutes);
app.use('/api/music', require('./routes/music'));

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

// Master QR-Code Endpunkt (für aktive Veranstaltung)
app.get('/api/dj/master-qr', async (req, res) => {
  try {
    const jwt = require('jsonwebtoken');
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Kein Token bereitgestellt' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const djId = decoded.djId;

    // Aktive Veranstaltung finden (kann null sein)
    const activeEvent = await db.get(
      'SELECT * FROM events WHERE dj_id = ? AND is_active = 1',
      [djId]
    );

    const QRCode = require('qrcode');
    const masterUrl = `${req.protocol}://${req.get('host')}/dj/${decoded.username}/active`;
    const qrCodeDataUrl = await QRCode.toDataURL(masterUrl);
    res.json({ qrCode: qrCodeDataUrl, url: masterUrl, event: activeEvent || null });
  } catch (error) {
    console.error('Fehler beim Generieren des Master-QR-Codes:', error);
    res.status(500).json({ error: 'Fehler beim Generieren des Master-QR-Codes' });
  }
});

// Master-Route für aktive Veranstaltung (öffentlich)
app.get('/dj/:username/active', async (req, res) => {
  try {
    const { username } = req.params;
    
    // DJ finden
    const dj = await db.get('SELECT id FROM djs WHERE username = ?', [username]);
    if (!dj) {
      return res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
    }

    // Aktive Veranstaltung finden
    const activeEvent = await db.get(
      'SELECT * FROM events WHERE dj_id = ? AND is_active = 1',
      [dj.id]
    );

    if (activeEvent) {
      // Weiterleitung zur aktiven Veranstaltung
      res.redirect(`/event/${activeEvent.code}`);
    } else {
      // Keine aktive Veranstaltung - Frontend zeigt Meldung
      res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
    }
  } catch (error) {
    console.error('Fehler bei Master-Route:', error);
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
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
