const mongoose = require('mongoose');

const guildSchema = new mongoose.Schema({
  guildId: { type: String, unique: true, index: true },
  ownerId: String,
  logChannelId: String,
  ticketChannelId: String,
  language: { type: String, default: 'fr' },
  color: { type: Number, default: 0x5865F2 },
  setupComplete: { type: Boolean, default: false },
  staff: { type: Map, of: Number, default: {} },
  commandCount: { type: Number, default: 0 }
}, { timestamps: true });

const sanctionSchema = new mongoose.Schema({
  guildId: { type: String, index: true },
  userId: { type: String, index: true },
  moderatorId: String,
  type: { type: String, enum: ['warn', 'kick', 'ban', 'timeout', 'unban', 'remove_warn', 'unmute', 'role_add', 'role_remove', 'nickname', 'voice_move', 'voice_disconnect'], required: true },
  reason: { type: String, maxlength: 1000, default: 'Aucune raison fournie' },
  expiresAt: Date,
  active: { type: Boolean, default: true }
}, { timestamps: true });

const ticketSchema = new mongoose.Schema({ guildId: String, channelId: String, userId: String, status: { type: String, default: 'open' } }, { timestamps: true });
module.exports = { Guild: mongoose.model('Guild', guildSchema), Sanction: mongoose.model('Sanction', sanctionSchema), Ticket: mongoose.model('Ticket', ticketSchema) };
