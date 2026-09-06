const express = require('express');
const User = require('../models/User');
const Message = require('../models/Message');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

async function getFriendOr404(req, res) {
  const me = await User.findById(req.userId);
  const friend = await User.findOne({ username: req.params.username });
  if (!friend) {
    res.status(404).json({ error: 'User not found' });
    return null;
  }
  if (!me.friends.some((id) => id.equals(friend._id))) {
    res.status(403).json({ error: 'You can only chat with friends' });
    return null;
  }
  return { me, friend };
}

// List all friends with a preview of the last message + unread count
router.get('/conversations', requireAuth, async (req, res) => {
  const me = await User.findById(req.userId).populate('friends', 'username ign skinUrl');

  const conversations = await Promise.all(
    me.friends.map(async (friend) => {
      const lastMessage = await Message.findOne({
        $or: [
          { from: me._id, to: friend._id },
          { from: friend._id, to: me._id },
        ],
      }).sort({ createdAt: -1 });

      const unreadCount = await Message.countDocuments({
        from: friend._id,
        to: me._id,
        readAt: null,
      });

      return {
        username: friend.username,
        ign: friend.ign,
        skinUrl: friend.skinUrl,
        lastMessage: lastMessage
          ? { text: lastMessage.text, fromMe: lastMessage.from.equals(me._id), createdAt: lastMessage.createdAt }
          : null,
        unreadCount,
      };
    })
  );

  conversations.sort((a, b) => {
    const at = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
    const bt = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
    return bt - at;
  });

  res.json(conversations);
});

// Get full message history with a friend (also marks their messages to you as read)
router.get('/:username', requireAuth, async (req, res) => {
  const pair = await getFriendOr404(req, res);
  if (!pair) return;
  const { me, friend } = pair;

  const messages = await Message.find({
    $or: [
      { from: me._id, to: friend._id },
      { from: friend._id, to: me._id },
    ],
  }).sort({ createdAt: 1 });

  await Message.updateMany(
    { from: friend._id, to: me._id, readAt: null },
    { $set: { readAt: new Date() } }
  );

  res.json(
    messages.map((m) => ({
      id: m._id,
      text: m.text,
      fromMe: m.from.equals(me._id),
      createdAt: m.createdAt,
    }))
  );
});

// Send a message to a friend
router.post('/:username', requireAuth, async (req, res) => {
  const pair = await getFriendOr404(req, res);
  if (!pair) return;
  const { me, friend } = pair;

  const { text } = req.body;
  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Message text is required' });
  }

  const message = await Message.create({ from: me._id, to: friend._id, text: text.trim() });
  res.status(201).json({
    id: message._id,
    text: message.text,
    fromMe: true,
    createdAt: message.createdAt,
  });
});

module.exports = router;
