const express = require('express');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  const user = await User.findById(req.userId).populate('friends', 'username ign skinUrl');
  res.json(user.friends);
});

router.get('/requests', requireAuth, async (req, res) => {
  const user = await User.findById(req.userId)
    .populate('friendRequestsIncoming', 'username ign skinUrl')
    .populate('friendRequestsOutgoing', 'username ign skinUrl');
  res.json({
    incoming: user.friendRequestsIncoming,
    outgoing: user.friendRequestsOutgoing,
  });
});

router.post('/request/:username', requireAuth, async (req, res) => {
  const target = await User.findOne({ username: req.params.username });
  if (!target) return res.status(404).json({ error: 'User not found' });
  if (target._id.equals(req.userId)) return res.status(400).json({ error: "Can't friend yourself" });

  const me = await User.findById(req.userId);
  if (me.friends.some((id) => id.equals(target._id))) {
    return res.status(409).json({ error: 'Already friends' });
  }

  if (!target.friendRequestsIncoming.some((id) => id.equals(me._id))) {
    target.friendRequestsIncoming.push(me._id);
    await target.save();
  }
  if (!me.friendRequestsOutgoing.some((id) => id.equals(target._id))) {
    me.friendRequestsOutgoing.push(target._id);
    await me.save();
  }

  res.json({ message: `Friend request sent to ${target.username}` });
});

router.post('/accept/:username', requireAuth, async (req, res) => {
  const requester = await User.findOne({ username: req.params.username });
  if (!requester) return res.status(404).json({ error: 'User not found' });

  const me = await User.findById(req.userId);
  if (!me.friendRequestsIncoming.some((id) => id.equals(requester._id))) {
    return res.status(400).json({ error: 'No pending request from that user' });
  }

  me.friendRequestsIncoming.pull(requester._id);
  requester.friendRequestsOutgoing.pull(me._id);

  me.friends.addToSet(requester._id);
  requester.friends.addToSet(me._id);

  await me.save();
  await requester.save();

  res.json({ message: `You are now friends with ${requester.username}` });
});

router.post('/decline/:username', requireAuth, async (req, res) => {
  const requester = await User.findOne({ username: req.params.username });
  if (!requester) return res.status(404).json({ error: 'User not found' });

  const me = await User.findById(req.userId);
  me.friendRequestsIncoming.pull(requester._id);
  requester.friendRequestsOutgoing.pull(me._id);

  await me.save();
  await requester.save();

  res.json({ message: 'Request declined' });
});

router.delete('/:username', requireAuth, async (req, res) => {
  const target = await User.findOne({ username: req.params.username });
  if (!target) return res.status(404).json({ error: 'User not found' });

  const me = await User.findById(req.userId);
  me.friends.pull(target._id);
  target.friends.pull(me._id);

  await me.save();
  await target.save();

  res.json({ message: `Removed ${target.username} from friends` });
});

module.exports = router;
