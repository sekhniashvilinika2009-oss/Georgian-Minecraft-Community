const express = require('express');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');
const { resolveIgn } = require('../utils/mojang');

const router = express.Router();

// Current logged-in user's profile
router.get('/me', requireAuth, async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user.toPublicProfile());
});

// Public profile by username
router.get('/:username', async (req, res) => {
  const user = await User.findOne({ username: req.params.username });
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user.toPublicProfile());
});

// Set/update Minecraft IGN -> auto-resolves UUID + skin via Mojang/Crafatar
router.put('/me/ign', requireAuth, async (req, res) => {
  try {
    const { ign } = req.body;
    if (!ign) return res.status(400).json({ error: 'IGN is required' });

    const resolved = await resolveIgn(ign);
    if (!resolved) {
      return res.status(404).json({ error: 'No Minecraft account found with that IGN' });
    }

    // Block linking an IGN that another account already has linked
    const taken = await User.findOne({
      ign: resolved.ign,
      _id: { $ne: req.userId },
    });
    if (taken) {
      return res.status(409).json({ error: 'That Minecraft account is already linked to another user' });
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      { ign: resolved.ign, uuid: resolved.uuid, skinUrl: resolved.skinUrl },
      { new: true }
    );
    res.json(user.toPublicProfile());
  } catch (err) {
    if (err.code === 11000) {
      // Race condition: two people tried to link the same IGN at the same moment
      return res.status(409).json({ error: 'That Minecraft account is already linked to another user' });
    }
    console.error(err);
    res.status(502).json({ error: 'Could not reach Mojang API, try again shortly' });
  }
});

// Update servers list
router.put('/me/servers', requireAuth, async (req, res) => {
  const { servers } = req.body;
  if (!Array.isArray(servers)) return res.status(400).json({ error: 'servers must be an array' });

  const user = await User.findByIdAndUpdate(req.userId, { servers }, { new: true });
  res.json(user.toPublicProfile());
});

// Update achievements list
router.put('/me/achievements', requireAuth, async (req, res) => {
  const { achievements } = req.body;
  if (!Array.isArray(achievements)) return res.status(400).json({ error: 'achievements must be an array' });

  const user = await User.findByIdAndUpdate(req.userId, { achievements }, { new: true });
  res.json(user.toPublicProfile());
});

module.exports = router;
