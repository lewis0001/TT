const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const winston = require('winston');
const { WebcastPushConnection } = require('tiktok-live-connector');

// Setup logging
const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: path.join(logDir, 'error.log'), level: 'error' }),
    new winston.transports.File({ filename: path.join(logDir, 'events.log') })
  ]
});

const app = express();
app.use(express.static(path.join(__dirname, 'public')));
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

function broadcast(data) {
  const msg = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
}

let stats = {
  viewerCount: 0,
  likeCount: 0,
  shareCount: 0,
  battle: null,
  topGifters: {},
};

function updateTopGifters(event) {
  const user = event.uniqueId;
  const repeat = event.repeatCount || 1;
  if (!stats.topGifters[user]) {
    stats.topGifters[user] = 0;
  }
  stats.topGifters[user] += repeat * (event.gift ? event.gift.diamondCount || 1 : 1);
}

let tiktokConnection = null;

function logEvent(name, data) {
  logger.info({ event: name, data });
}

function attachEventHandlers() {
  [
    'chat',
    'like',
    'social',
    'gift',
    'roomUser',
    'member',
    'follow',
    'share',
    'viewer',
    'linkMicBattle',
    'linkMicArmies',
  ].forEach(event => {
    tiktokConnection.on(event, data => {
      logEvent(event, data);
      switch (event) {
        case 'chat':
          broadcast({
            type: 'chat',
            data: {
              user: data.uniqueId,
              nickname: data.nickname,
              avatar: data.profilePictureUrl,
              comment: data.comment,
            },
          });
          break;
        case 'like':
          stats.likeCount = data.totalLikeCount;
          broadcast({ type: 'like', data: { total: stats.likeCount } });
          break;
        case 'share':
        case 'social':
          stats.shareCount += 1;
          broadcast({ type: 'share', data: { total: stats.shareCount } });
          break;
        case 'gift':
          updateTopGifters(data);
          broadcast({ type: 'gift', data });
          broadcast({ type: 'topGifters', data: stats.topGifters });
          break;
        case 'roomUser':
        case 'viewer':
          stats.viewerCount = data.viewerCount || data.viewer_count || 0;
          broadcast({ type: 'viewer', data: { total: stats.viewerCount } });
          break;
        case 'linkMicBattle':
          stats.battle = { endTime: data.battleEndTime || Date.now(), startTime: Date.now() };
          stats.topGifters = {};
          broadcast({ type: 'battle', data: stats.battle });
          break;
        case 'linkMicArmies':
          broadcast({ type: 'armies', data });
          break;
      }
    });
  });

  tiktokConnection.on('error', err => {
    logger.error('Error event', err);
  });
}

async function startConnection(username) {
  if (!username) {
    logger.error('No username provided');
    return;
  }

  if (tiktokConnection) {
    tiktokConnection.removeAllListeners();
    try {
      await tiktokConnection.disconnect();
    } catch (err) {
      logger.error('Disconnect failed', err);
    }
  }

  stats = { viewerCount: 0, likeCount: 0, shareCount: 0, battle: null, topGifters: {} };

  tiktokConnection = new WebcastPushConnection(username);
  attachEventHandlers();

  try {
    await tiktokConnection.connect();
    logger.info(`Connected to @${username}`);
  } catch (err) {
    logger.error('Connection failed', err);
  }
}

wss.on('connection', ws => {
  ws.on('message', message => {
    let data;
    try {
      data = JSON.parse(message);
    } catch {
      return;
    }
    if (data.type === 'connect') {
      startConnection(data.username);
    }
  });
});

server.listen(3000, () => {
  console.log('Server listening on http://localhost:3000');
});
