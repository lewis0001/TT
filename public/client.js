const ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host);

const viewerCount = document.getElementById('viewerCount');
const likeCount = document.getElementById('likeCount');
const shareCount = document.getElementById('shareCount');
const comments = document.getElementById('comments');
const battleTimer = document.getElementById('battleTimer');
const gifters = document.getElementById('gifters');
const usernameInput = document.getElementById('usernameInput');
const connectBtn = document.getElementById('connectBtn');
const disconnectBtn = document.getElementById('disconnectBtn');

let battleEndTime = null;

function sendConnect() {
  const username = usernameInput.value.trim();
  if (username) {
    ws.send(JSON.stringify({ type: 'connect', username }));
  }
}

connectBtn.addEventListener('click', sendConnect);
usernameInput.addEventListener('keypress', e => {
  if (e.key === 'Enter') sendConnect();
});

disconnectBtn.addEventListener('click', () => {
  ws.send(JSON.stringify({ type: 'disconnect' }));
});

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  switch (msg.type) {
    case 'chat':
      addComment(msg.data);
      break;
    case 'viewer':
      viewerCount.textContent = msg.data.total;
      break;
    case 'like':
      likeCount.textContent = msg.data.total;
      break;
    case 'share':
      shareCount.textContent = msg.data.total;
      break;
    case 'battle':
      battleEndTime = msg.data.endTime;
      break;
    case 'topGifters':
      updateGifters(msg.data);
      break;
    case 'reset':
      viewerCount.textContent = '0';
      likeCount.textContent = '0';
      shareCount.textContent = '0';
      battleTimer.textContent = '-';
      comments.innerHTML = '';
      gifters.innerHTML = '';
      break;
  }
};

ws.onclose = () => {
  viewerCount.textContent = '0';
  likeCount.textContent = '0';
  shareCount.textContent = '0';
  battleTimer.textContent = '-';
  comments.innerHTML = '';
  gifters.innerHTML = '';
};

ws.onerror = (err) => {
  console.error('WebSocket error', err);
};

function addComment({ user, nickname, avatar, comment }) {
  const div = document.createElement('div');
  div.className = 'comment';
  const img = document.createElement('img');
  img.src = avatar;
  img.className = 'avatar';
  div.appendChild(img);
  div.appendChild(document.createTextNode(`${nickname || user}: ${comment}`));
  comments.appendChild(div);
  comments.scrollTop = comments.scrollHeight;
}

function updateGifters(data) {
  gifters.innerHTML = '';
  Object.entries(data).sort((a,b)=>b[1]-a[1]).forEach(([user, score])=>{
    const li = document.createElement('li');
    li.textContent = `${user}: ${score}`;
    gifters.appendChild(li);
  });
}

setInterval(()=>{
  if (battleEndTime) {
    const diff = battleEndTime - Date.now();
    if (diff > 0) {
      const secs = Math.floor(diff/1000);
      battleTimer.textContent = `${secs}s`;
    } else {
      battleTimer.textContent = '-';
      battleEndTime = null;
    }
  }
}, 1000);

