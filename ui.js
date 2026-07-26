const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
function color(config) { return config?.embedColor || '#5865F2'; }
function embed(config, title, description = '') { return new EmbedBuilder().setColor(color(config)).setTitle(`🌟 Helpy • ${title}`).setDescription(description).setTimestamp().setFooter({ text: 'Helpy Dashboard' }); }
function button(customId, label, style = ButtonStyle.Secondary, emoji) { const item = new ButtonBuilder().setCustomId(customId).setLabel(label).setStyle(style); return emoji ? item.setEmoji(emoji) : item; }
function row(...buttons) { return new ActionRowBuilder().addComponents(buttons); }
module.exports = { embed, button, row, color };
