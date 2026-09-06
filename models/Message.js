const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  from: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  to: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true, maxlength: 1000, trim: true },
  readAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
});

// Fast lookup of a conversation between two users, in either direction
MessageSchema.index({ from: 1, to: 1, createdAt: 1 });
MessageSchema.index({ to: 1, from: 1, createdAt: 1 });

module.exports = mongoose.model('Message', MessageSchema);
