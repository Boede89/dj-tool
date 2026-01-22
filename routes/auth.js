const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database');

const router = express.Router();

// DJ Registrierung
router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username und Passwort erforderlich' });
    }

    // Prüfen ob Username bereits existiert
    const existing = await db.get('SELECT id FROM djs WHERE username = ?', [username]);
    if (existing) {
      return res.status(400).json({ error: 'Username bereits vergeben' });
    }

    // Passwort hashen
    const hashedPassword = bcrypt.hashSync(password, 10);

    // DJ erstellen
    const result = await db.run(
      'INSERT INTO djs (username, password) VALUES (?, ?)',
      [username, hashedPassword]
    );

    res.status(201).json({ message: 'DJ erfolgreich registriert', id: result.id });
  } catch (error) {
    console.error('Registrierungsfehler:', error);
    res.status(500).json({ error: 'Fehler bei der Registrierung' });
  }
});

// DJ Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username und Passwort erforderlich' });
    }

    // DJ finden
    const dj = await db.get('SELECT * FROM djs WHERE username = ?', [username]);
    if (!dj) {
      return res.status(401).json({ error: 'Ungültige Anmeldedaten' });
    }

    // Passwort prüfen
    const validPassword = bcrypt.compareSync(password, dj.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Ungültige Anmeldedaten' });
    }

    // JWT Token erstellen
    const token = jwt.sign(
      { djId: dj.id, username: dj.username },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ token, username: dj.username });
  } catch (error) {
    console.error('Login-Fehler:', error);
    res.status(500).json({ error: 'Fehler beim Login' });
  }
});

module.exports = router;
