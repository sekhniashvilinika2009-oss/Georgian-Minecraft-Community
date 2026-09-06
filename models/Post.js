const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  authorName: String,
  text: { type: String, required: true, maxlength: 500 },
  createdAt: { type: Date, default: Date.now },
});

const PostSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  authorName: String,
  authorIgn: String,
  content: { type: String, required: true, maxlength: 2000 },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  comments: [CommentSchema],
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Post', PostSchema);
