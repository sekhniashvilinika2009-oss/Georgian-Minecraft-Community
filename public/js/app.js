// ---------- Auth screen ----------
const authScreen = document.getElementById('auth-screen');
const appEl = document.getElementById('app');

document.querySelectorAll('.auth-tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.auth-tab').forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    const isLogin = tab.dataset.tab === 'login';
    document.getElementById('login-form').classList.toggle('hidden', !isLogin);
    document.getElementById('register-form').classList.toggle('hidden', isLogin);
  });
});

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById('login-error');
  errorEl.textContent = '';
  const form = new FormData(e.target);
  try {
    const data = await Api.post('/api/auth/login', {
      username: form.get('username'),
      password: form.get('password'),
    });
    Api.setToken(data.token);
    enterApp();
  } catch (err) {
    errorEl.textContent = err.message;
  }
});

document.getElementById('register-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById('register-error');
  errorEl.textContent = '';
  const form = new FormData(e.target);
  try {
    const data = await Api.post('/api/auth/register', {
      username: form.get('username'),
      email: form.get('email'),
      password: form.get('password'),
    });
    Api.setToken(data.token);
    enterApp();
  } catch (err) {
    errorEl.textContent = err.message;
  }
});

document.getElementById('logout-btn').addEventListener('click', () => {
  Api.clearToken();
  location.reload();
});

function enterApp() {
  authScreen.classList.add('hidden');
  appEl.classList.remove('hidden');
  navigate();
}

// ---------- Routing ----------
const views = ['dashboard', 'profile', 'posts', 'friends', 'chat'];

function navigate() {
  const hash = (location.hash || '#dashboard').slice(1);
  const view = views.includes(hash) ? hash : 'dashboard';

  views.forEach((v) => {
    document.getElementById(`view-${v}`).classList.toggle('hidden', v !== view);
  });
  document.querySelectorAll('.nav-link').forEach((link) => {
    link.classList.toggle('active', link.dataset.view === view);
  });

  stopChatPolling();

  if (view === 'dashboard') loadDashboard();
  if (view === 'profile') loadProfile();
  if (view === 'posts') loadPosts();
  if (view === 'friends') loadFriends();
  if (view === 'chat') loadChatConversations();
}
window.addEventListener('hashchange', navigate);

// ---------- Dashboard ----------
async function loadDashboard() {
  try {
    const me = await Api.get('/api/profile/me');
    document.getElementById('dash-username').textContent = `@${me.username}`;
    document.getElementById('dash-ign').textContent = me.ign || 'No IGN linked yet';
    document.getElementById('dash-friends').textContent = me.friendCount ?? 0;

    const skinImg = document.getElementById('dash-skin');
    if (me.skinUrl) {
      skinImg.src = me.skinUrl;
      skinImg.classList.remove('hidden');
    } else {
      skinImg.classList.add('hidden');
    }
  } catch (err) {
    console.error(err);
  }
}

// ---------- Profile ----------
async function loadProfile() {
  const me = await Api.get('/api/profile/me');
  document.getElementById('servers-input').value = (me.servers || []).join(', ');
  document.getElementById('achievements-input').value = (me.achievements || []).join(', ');

  const identityBox = document.getElementById('profile-identity');
  if (me.ign) {
    document.getElementById('profile-skin').src = me.skinUrl || '';
    document.getElementById('profile-ign').textContent = me.ign;
    document.getElementById('profile-uuid').textContent = me.uuid || '';
    identityBox.classList.remove('hidden');
  } else {
    identityBox.classList.add('hidden');
  }
}

document.getElementById('ign-save').addEventListener('click', async () => {
  const hint = document.getElementById('ign-hint');
  const ign = document.getElementById('ign-input').value.trim();
  if (!ign) return;
  hint.textContent = 'Looking up account...';
  try {
    await Api.put('/api/profile/me/ign', { ign });
    hint.textContent = 'Linked!';
    loadProfile();
    loadDashboard();
  } catch (err) {
    hint.textContent = err.message;
  }
});

document.getElementById('servers-save').addEventListener('click', async () => {
  const servers = document.getElementById('servers-input').value
    .split(',').map((s) => s.trim()).filter(Boolean);
  await Api.put('/api/profile/me/servers', { servers });
});

document.getElementById('achievements-save').addEventListener('click', async () => {
  const achievements = document.getElementById('achievements-input').value
    .split(',').map((s) => s.trim()).filter(Boolean);
  await Api.put('/api/profile/me/achievements', { achievements });
});

// ---------- Player lookup ----------
document.getElementById('lookup-btn').addEventListener('click', async () => {
  const hint = document.getElementById('lookup-hint');
  const resultBox = document.getElementById('lookup-result');
  const username = document.getElementById('lookup-input').value.trim();
  hint.textContent = '';
  if (!username) return;

  try {
    const player = await Api.get(`/api/profile/${encodeURIComponent(username)}`);
    document.getElementById('lookup-username').textContent = `@${player.username}`;
    document.getElementById('lookup-ign').textContent = player.ign ? `IGN: ${player.ign}` : 'No IGN linked';
    document.getElementById('lookup-servers').textContent = (player.servers || []).length
      ? `Servers: ${player.servers.join(', ')}` : '';
    document.getElementById('lookup-achievements').textContent = (player.achievements || []).length
      ? `Achievements: ${player.achievements.join(', ')}` : '';

    const skinImg = document.getElementById('lookup-skin');
    if (player.skinUrl) {
      skinImg.src = player.skinUrl;
      skinImg.classList.remove('hidden');
    } else {
      skinImg.classList.add('hidden');
    }
    resultBox.classList.remove('hidden');
  } catch (err) {
    resultBox.classList.add('hidden');
    hint.textContent = err.message;
  }
});

// ---------- Posts ----------
async function loadPosts() {
  const posts = await Api.get('/api/posts');
  const list = document.getElementById('posts-list');
  list.innerHTML = posts.map(renderPost).join('') || '<p class="dash-sub">No posts yet — be the first!</p>';
  attachPostHandlers();
}

function renderPost(post) {
  const commentsHtml = post.comments.map((c) => `
    <p class="post-comment"><strong>${escapeHtml(c.authorName)}</strong> ${escapeHtml(c.text)}</p>
  `).join('');

  return `
    <article class="post-card" data-id="${post._id}">
      <p class="post-author">${escapeHtml(post.authorIgn || post.authorName)}</p>
      <p class="post-content">${escapeHtml(post.content)}</p>
      <div class="post-actions">
        <button class="like-btn" data-id="${post._id}">👍 ${post.likes.length}</button>
        <span class="dash-sub">${post.comments.length} comment${post.comments.length === 1 ? '' : 's'}</span>
      </div>
      <div class="post-comments">
        ${commentsHtml}
        <form class="comment-form" data-id="${post._id}">
          <input type="text" placeholder="Write a comment..." maxlength="500" required>
          <button type="submit" class="btn btn-secondary">Send</button>
        </form>
      </div>
    </article>
  `;
}

function attachPostHandlers() {
  document.querySelectorAll('.like-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await Api.post(`/api/posts/${btn.dataset.id}/like`);
      loadPosts();
    });
  });
  document.querySelectorAll('.comment-form').forEach((form) => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = form.querySelector('input');
      await Api.post(`/api/posts/${form.dataset.id}/comments`, { text: input.value });
      loadPosts();
    });
  });
}

document.getElementById('post-submit').addEventListener('click', async () => {
  const input = document.getElementById('post-input');
  if (!input.value.trim()) return;
  await Api.post('/api/posts', { content: input.value.trim() });
  input.value = '';
  loadPosts();
});

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

// ---------- Friends ----------
async function loadFriends() {
  const [friends, requests] = await Promise.all([
    Api.get('/api/friends'),
    Api.get('/api/friends/requests'),
  ]);

  document.getElementById('friend-list').innerHTML = friends.map((f) => `
    <li>${escapeHtml(f.ign || f.username)}
      <span>
        <button data-action="message" data-username="${f.username}">Message</button>
        <button data-action="remove" data-username="${f.username}">Remove</button>
      </span>
    </li>
  `).join('') || '<li class="dash-sub">No friends yet</li>';

  document.getElementById('friend-incoming').innerHTML = requests.incoming.map((f) => `
    <li>${escapeHtml(f.ign || f.username)}
      <span>
        <button data-action="accept" data-username="${f.username}">Accept</button>
        <button data-action="decline" data-username="${f.username}">Decline</button>
      </span>
    </li>
  `).join('') || '<li class="dash-sub">No pending requests</li>';

  document.querySelectorAll('#friend-list button, #friend-incoming button').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const { action, username } = btn.dataset;
      try {
        if (action === 'message') {
          location.hash = '#chat';
          navigate();
          // Give the chat view a moment to load conversations, then open this one
          setTimeout(() => openChat(username), 300);
          return;
        }
        if (action === 'remove') await Api.del(`/api/friends/${username}`);
        if (action === 'accept') await Api.post(`/api/friends/accept/${username}`);
        if (action === 'decline') await Api.post(`/api/friends/decline/${username}`);
        loadFriends();
        loadDashboard();
      } catch (err) {
        alert(err.message);
      }
    });
  });
}

document.getElementById('friend-add').addEventListener('click', async () => {
  const hint = document.getElementById('friend-hint');
  const username = document.getElementById('friend-input').value.trim();
  if (!username) return;
  try {
    const data = await Api.post(`/api/friends/request/${username}`);
    hint.textContent = data.message;
    document.getElementById('friend-input').value = '';
    loadFriends();
  } catch (err) {
    hint.textContent = err.message;
  }
});

// ---------- Chat ----------
let activeChatUsername = null;
let chatPollHandle = null;

function stopChatPolling() {
  if (chatPollHandle) {
    clearInterval(chatPollHandle);
    chatPollHandle = null;
  }
}

async function loadChatConversations() {
  const conversations = await Api.get('/api/chat/conversations');
  const list = document.getElementById('chat-conversations');

  list.innerHTML = conversations.map((c) => `
    <li data-username="${c.username}" class="chat-conv-item ${c.username === activeChatUsername ? 'active' : ''}">
      <span>
        <strong>${escapeHtml(c.ign || c.username)}</strong>
        ${c.lastMessage ? `<br><span class="dash-sub">${c.lastMessage.fromMe ? 'You: ' : ''}${escapeHtml(c.lastMessage.text).slice(0, 40)}</span>` : ''}
      </span>
      ${c.unreadCount ? `<span class="chat-unread">${c.unreadCount}</span>` : ''}
    </li>
  `).join('') || '<li class="dash-sub">Add a friend to start chatting</li>';

  list.querySelectorAll('.chat-conv-item').forEach((item) => {
    item.addEventListener('click', () => openChat(item.dataset.username));
  });
}

async function openChat(username) {
  activeChatUsername = username;
  document.getElementById('chat-empty').classList.add('hidden');
  document.getElementById('chat-active').classList.remove('hidden');
  document.getElementById('chat-with').textContent = username;

  await loadChatConversations();
  await loadChatMessages();

  stopChatPolling();
  chatPollHandle = setInterval(loadChatMessages, 3000);
}

async function loadChatMessages() {
  if (!activeChatUsername) return;
  try {
    const messages = await Api.get(`/api/chat/${encodeURIComponent(activeChatUsername)}`);
    const box = document.getElementById('chat-messages');
    const wasAtBottom = box.scrollTop + box.clientHeight >= box.scrollHeight - 20;

    box.innerHTML = messages.map((m) => `
      <div class="chat-bubble ${m.fromMe ? 'from-me' : 'from-them'}">
        <p>${escapeHtml(m.text)}</p>
      </div>
    `).join('') || '<p class="dash-sub">No messages yet — say hi!</p>';

    if (wasAtBottom || messages.length <= 1) {
      box.scrollTop = box.scrollHeight;
    }
  } catch (err) {
    console.error(err);
  }
}

document.getElementById('chat-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!activeChatUsername) return;
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  try {
    await Api.post(`/api/chat/${encodeURIComponent(activeChatUsername)}`, { text });
    await loadChatMessages();
    await loadChatConversations();
  } catch (err) {
    alert(err.message);
  }
});

// ---------- Boot ----------
if (Api.hasToken()) {
  enterApp();
} else {
  authScreen.classList.remove('hidden');
}
