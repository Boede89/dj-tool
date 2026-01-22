# DJ Tool - Liedwunsch-System

Ein Web-basiertes Tool für DJs, mit dem Gäste Lieder wünschen und voten können.

## Features

- 🎵 Liedwunsch-System für Gäste
- 📊 Voting-System (Hoch/Runter voten)
- 🔐 DJ-Login für Veranstaltungsverwaltung
- 📱 QR-Code für einfachen Zugang
- 🎧 Spotify-Integration für Musiksuche
- 🗑️ Gespielte Lieder können entfernt werden

## Installation

### Voraussetzungen

- Node.js (v18 oder höher)
- npm oder yarn
- Spotify Client ID und Secret (optional, für Musiksuche)

### Setup

1. Repository klonen:
```bash
git clone https://github.com/Boede89/dj-tool.git
cd dj-tool
```

2. Dependencies installieren:
```bash
npm run install-all
```

3. Umgebungsvariablen konfigurieren:
```bash
cp .env.example .env
# .env Datei bearbeiten und Werte eintragen
```

4. Datenbank initialisieren:
```bash
npm start
# Beim ersten Start wird die Datenbank automatisch erstellt
```

5. Frontend bauen:
```bash
npm run build
```

## Docker/Container Setup

### Dockerfile verwenden

```bash
docker build -t dj-tool .
docker run -p 3000:3000 --env-file .env dj-tool
```

### Proxmox Container

1. Container mit Node.js Image erstellen
2. Repository klonen
3. Dependencies installieren
4. `.env` Datei konfigurieren
5. Service starten (siehe `systemd-service` Ordner)

## Konfiguration

Erstelle eine `.env` Datei mit folgenden Variablen:

```
PORT=3000
JWT_SECRET=dein-super-geheimes-secret-hier
SPOTIFY_CLIENT_ID=deine-spotify-client-id
SPOTIFY_CLIENT_SECRET=dein-spotify-client-secret
DB_PATH=./database.db
```

## Verwendung

1. **DJ-Login**: Gehe zu `/dj/login` und melde dich an
2. **Veranstaltung erstellen**: Erstelle eine neue Veranstaltung
3. **QR-Code drucken**: Drucke den QR-Code für deine Gäste
4. **Gäste scannen**: Gäste scannen den QR-Code und gelangen zur Wunschliste
5. **Lieder wünschen**: Gäste können Lieder wünschen und voten
6. **Verwaltung**: Als DJ kannst du gespielte Lieder entfernen

## API Endpunkte

### DJ Endpunkte
- `POST /api/dj/register` - DJ registrieren
- `POST /api/dj/login` - DJ einloggen
- `GET /api/dj/events` - Alle Veranstaltungen
- `POST /api/dj/events` - Neue Veranstaltung erstellen
- `DELETE /api/dj/events/:id` - Veranstaltung löschen

### Event Endpunkte
- `GET /api/events/:code` - Event-Details (öffentlich)
- `GET /api/events/:code/requests` - Liedwünsche abrufen
- `POST /api/events/:code/requests` - Liedwunsch erstellen
- `POST /api/events/:code/requests/:id/vote` - Für Lied voten
- `DELETE /api/dj/events/:eventId/requests/:requestId` - Liedwunsch löschen

### Spotify Endpunkte
- `GET /api/spotify/search?q=query` - Musik suchen

## Lizenz

MIT
