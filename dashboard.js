const { SlashCommandBuilder } = require('discord.js');
const { embed, button, row } = require('../utils/ui');
const GuildConfig = require('../models/GuildConfig');
module.exports = {
  data: new SlashCommandBuilder().setName('dashboard').setDescription('Ouvrir le panneau Helpy'),
  async execute(interaction) {
    const config = await GuildConfig.findOneAndUpdate({ guildId: interaction.guildId }, { $setOnInsert: { guildId: interaction.guildId } }, { new: true, upsert: true });
    await interaction.reply({ ephemeral: true, embeds: [embed(config, 'Dashboard', 'Bienvenue dans votre panneau d’administration. Choisissez une rubrique.')], components: [row(button('dash:profile', 'Profil', undefined, '👤'), button('dash:stats', 'Serveur', undefined, '📊'), button('dash:moderation', 'Modération', undefined, '🛡️')), row(button('dash:config', 'Configuration', undefined, '⚙️'), button('dash:levels', 'Niveaux', undefined, '🏅'), button('dash:creator', 'Créateur', undefined, '👑'))] });
  }
};
