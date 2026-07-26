const { Schema, model } = require('mongoose');
const actionSchema = new Schema({
  type: { type: String, required: true }, reason: { type: String, required: true }, staffId: { type: String, required: true },
  durationMs: Number, expiresAt: Date, createdAt: { type: Date, default: Date.now }
}, { _id: true });
module.exports = model('MemberData', new Schema({
  guildId: { type: String, required: true }, userId: { type: String, required: true }, level: { type: Number, default: 1, min: 1, max: 4 },
  messageCount: { type: Number, default: 0 }, voiceSeconds: { type: Number, default: 0 }, voiceJoinedAt: Date,
  actions: { type: [actionSchema], default: [] }
}, { timestamps: true, indexes: [{ unique: true, fields: { guildId: 1, userId: 1 } }] }));
