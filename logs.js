const { EmbedBuilder } = require('discord.js');
const GuildConfig = require('../models/GuildConfig');
async function log(guild, title, fields = [], color = '#ED4245') {
  const config = await GuildConfig.findOne({ guildId: guild.id });
  const channel = config?.logsChannelId && guild.channels.cache.get(config.logsChannelId);
  if (!channel?.isTextBased()) return;
  await channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle(`📜 Helpy Logs • ${title}`).addFields(fields).setTimestamp()] }).catch(() => null);
}
module.exports = { log };
