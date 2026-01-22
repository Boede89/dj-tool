FROM node:18-alpine

WORKDIR /app

# Dependencies kopieren und installieren
COPY package*.json ./
RUN npm install --production

# Client Dependencies
COPY client/package*.json ./client/
RUN cd client && npm install && npm run build

# App Code kopieren
COPY . .

# Port freigeben
EXPOSE 3000

# Start
CMD ["node", "server.js"]
