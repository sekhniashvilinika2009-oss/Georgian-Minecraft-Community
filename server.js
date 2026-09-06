require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');

const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const postsRoutes = require('./routes/posts');
const friendsRoutes = require('./routes/friends');
const chatRoutes = require('./routes/chat');

const app = express();

// Render sits behind a proxy; trust it so req.ip reflects the real client IP
app.set('trust proxy', true);

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api/friends', friendsRoutes);
app.use('/api/chat', chatRoutes);

app.get('/api/health', (req, res) => {
  res.json({ ok: true, dbState: mongoose.connection.readyState });
});

// Serve the static frontend
app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;

async function start() {
  if (!process.env.MONGODB_URI) {
    console.error('Missing MONGODB_URI environment variable.');
    process.exit(1);
  }
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  } catch (err) {
    console.error('Failed to connect to MongoDB:', err.message);
    process.exit(1);
  }
}

start();
