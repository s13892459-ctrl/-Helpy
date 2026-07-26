const { memberData } = require('../utils/db');
module.exports = { name: 'messageCreate', async execute(message) { if (!message.guild || message.author.bot) return; await require('../models/MemberData').updateOne({ guildId: message.guild.id, userId: message.author.id }, { $inc: { messageCount: 1 }, $setOnInsert: { guildId: message.guild.id, userId: message.author.id } }, { upsert: true }); } };
