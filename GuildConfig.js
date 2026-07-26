const { Schema, model } = require('mongoose');
module.exports = model('GuildConfig', new Schema({
  guildId: { type: String, unique: true, required: true },
  logsChannelId: String,
  updatesChannelId: String,
  embedColor: { type: String, default: '#5865F2' },
  language: { type: String, default: 'fr' },
  staffTestRoleId: String,
  staffRoleId: String,
  ownerRoleId: String
}, { timestamps: true }));
