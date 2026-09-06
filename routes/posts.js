const express = require('express');
const Post = require('../models/Post');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', async (req, res) => {
  const posts = await Post.find().sort({ createdAt: -1 }).limit(100);
  res.json(posts);
});

router.post('/', requireAuth, async (req, res) => {
  const { content } = req.body;
  if (!content || !content.trim()) return res.status(400).json({ error: 'Post content is required' });

  const user = await User.findById(req.userId);
  const post = await Post.create({
    author: user._id,
    authorName: user.username,
    authorIgn: user.ign,
    content: content.trim(),
  });
  res.status(201).json(post);
});

router.post('/:id/like', requireAuth, async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });

  const already = post.likes.some((id) => id.equals(req.userId));
  if (already) {
    post.likes.pull(req.userId);
  } else {
    post.likes.push(req.userId);
  }
  await post.save();
  res.json(post);
});

router.post('/:id/comments', requireAuth, async (req, res) => {
  const { text } = req.body;
  if (!text || !text.trim()) return res.status(400).json({ error: 'Comment text is required' });

  const post = await Post.findById(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });

  const user = await User.findById(req.userId);
  post.comments.push({ author: user._id, authorName: user.username, text: text.trim() });
  await post.save();
  res.status(201).json(post);
});

module.exports = router;
