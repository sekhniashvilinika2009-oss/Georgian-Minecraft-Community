const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true, minlength: 3, maxlength: 20 },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  passwordHash: { type: String, required: true },

   ign: { type: String, trim: true, default: null },
  uuid: { type: String, default: null },
  skinUrl: { type: String, default: null },

  registrationIp: { type: String, default: null },
  lastLoginIp: { type: String, default: null },

  servers: [{ type: String, trim: true }],
  achievements: [{ type: String, trim: true }],

  friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  friendRequestsIncoming: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  friendRequestsOutgoing: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  createdAt: { type: Date, default: Date.now },
});

UserSchema.methods.toPublicProfile = function () {
  return {
    id: this._id,
    username: this.username,
    ign: this.ign,
    uuid: this.uuid,
    skinUrl: this.skinUrl,
    servers: this.servers,
    achievements: this.achievements,
    friendCount: this.friends?.length || 0,
  };
};

module.exports = mongoose.model('User', UserSchema);
