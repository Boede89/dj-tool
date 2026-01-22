# Installationsanleitung für Proxmox Container

## Voraussetzungen

- Proxmox Container mit Debian/Ubuntu
- Node.js 18 oder höher
- Git

## Schritt-für-Schritt Installation

### 1. Container vorbereiten

```bash
# System aktualisieren
apt update && apt upgrade -y

# Node.js installieren
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs git

# Node.js Version prüfen
node --version
npm --version
```

### 2. Repository klonen

```bash
cd /opt
git clone https://github.com/Boede89/dj-tool.git
cd dj-tool
```

### 3. Dependencies installieren

```bash
# Backend Dependencies
npm install

# Frontend Dependencies
cd client
npm install
npm run build
cd ..
```

### 4. Umgebungsvariablen konfigurieren

```bash
# .env Datei erstellen
nano .env
```

Folgenden Inhalt eintragen (anpassen!):

```
PORT=3000
JWT_SECRET=dein-super-geheimes-secret-hier-min-32-zeichen
SPOTIFY_CLIENT_ID=deine-spotify-client-id
SPOTIFY_CLIENT_SECRET=dein-spotify-client-secret
DB_PATH=/opt/dj-tool/database.db
NODE_ENV=production
```

**Wichtig:**
- `JWT_SECRET`: Mindestens 32 Zeichen, zufälliger String
- `SPOTIFY_CLIENT_ID` und `SPOTIFY_CLIENT_SECRET`: Optional, für Musiksuche
  - Spotify Developer Account erstellen: https://developer.spotify.com/
  - App erstellen und Client ID/Secret kopieren

### 5. Service einrichten (systemd)

```bash
# Service-Datei kopieren
cp systemd-service/dj-tool.service /etc/systemd/system/

# Service aktivieren
systemctl daemon-reload
systemctl enable dj-tool
systemctl start dj-tool

# Status prüfen
systemctl status dj-tool
```

### 6. Firewall konfigurieren (falls aktiv)

```bash
# Port 3000 freigeben
ufw allow 3000/tcp
```

### 7. Reverse Proxy einrichten (optional, empfohlen)

Für Produktion sollte ein Reverse Proxy (nginx) verwendet werden:

#### Nginx Installation

```bash
apt install -y nginx
```

#### Nginx Konfiguration

```bash
nano /etc/nginx/sites-available/dj-tool
```

Folgenden Inhalt eintragen (IP-Adresse anpassen):

```nginx
server {
    listen 80;
    server_name deine-domain.de;  # oder IP-Adresse

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Konfiguration aktivieren
ln -s /etc/nginx/sites-available/dj-tool /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

### 8. Zugriff testen

- Im Browser öffnen: `http://deine-ip:3000` oder `http://deine-domain`
- Standard-Login: Username: `admin`, Passwort: `admin`
- **Wichtig:** Nach dem ersten Login Passwort ändern!

## Spotify API Setup (optional)

1. Gehe zu https://developer.spotify.com/dashboard
2. Logge dich mit deinem Spotify Account ein
3. Klicke auf "Create app"
4. Fülle die Felder aus:
   - App name: z.B. "DJ Tool"
   - App description: z.B. "Liedwunsch-System"
   - Redirect URI: `http://localhost:3000` (kann später geändert werden)
5. Akzeptiere die Terms of Service
6. Kopiere die Client ID und Client Secret
7. Trage sie in die `.env` Datei ein

## Wartung

### Logs anzeigen

```bash
journalctl -u dj-tool -f
```

### Service neu starten

```bash
systemctl restart dj-tool
```

### Datenbank-Backup

```bash
cp /opt/dj-tool/database.db /opt/dj-tool/database.db.backup
```

### Updates installieren

```bash
cd /opt/dj-tool
git pull
npm install
cd client
npm install
npm run build
cd ..
systemctl restart dj-tool
```

## Fehlerbehebung

### Service startet nicht

```bash
# Logs prüfen
journalctl -u dj-tool -n 50

# Manuell starten zum Testen
cd /opt/dj-tool
node server.js
```

### Port bereits belegt

```bash
# Prüfen welcher Prozess Port 3000 verwendet
lsof -i :3000

# Port in .env ändern
nano .env
# PORT=3001
```

### Datenbank-Fehler

```bash
# Datenbank löschen (ACHTUNG: Alle Daten gehen verloren!)
rm /opt/dj-tool/database.db
systemctl restart dj-tool
```

## Sicherheit

- **Wichtig:** Standard-Passwort ändern!
- JWT_SECRET sollte stark und zufällig sein
- Für Produktion: HTTPS mit Let's Encrypt einrichten
- Firewall konfigurieren
- Regelmäßige Backups der Datenbank
