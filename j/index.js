const { Client, GatewayIntentBits, Partials, REST, Routes, SlashCommandBuilder, Events } = require('discord.js');
const mongoose = require('mongoose');
const config = require('./config');
const dashboard = require('./dashboard');
const { Guild } = require('./models');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildModeration, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildVoiceStates],
  partials: [Partials.GuildMember, Partials.User, Partials.Channel]
});

async function registerCommand() {
  const body = [new SlashCommandBuilder().setName('dashboard').setDescription('Ouvrir Helpy Dashboard').toJSON()];
  const rest = new REST({ version: '10' }).setToken(config.token);
  if (config.guildId) await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), { body });
  else await rest.put(Routes.applicationCommands(config.clientId), { body });
}

client.once(Events.ClientReady, async (ready) => {
  console.log(`Helpy connecté : ${ready.user.tag}`);
  await registerCommand();
  await dashboard.expireTemporaryBans(client);
  setInterval(() => dashboard.expireTemporaryBans(client).catch(console.error), 60_000).unref();
  console.log('Commande /dashboard synchronisée.');
});

client.on(Events.GuildCreate, async (guild) => {
  await Guild.updateOne({ guildId: guild.id }, { $set: { ownerId: guild.ownerId }, $setOnInsert: { guildId: guild.id } }, { upsert: true });
});
client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (!interaction.guild) return interaction.reply({ content: 'Helpy fonctionne uniquement dans un serveur.', ephemeral: true });
    if (interaction.isChatInputCommand() && interaction.commandName === 'dashboard') return dashboard.open(interaction, client);
    if (interaction.isButton() || interaction.isStringSelectMenu() || interaction.isChannelSelectMenu() || interaction.isUserSelectMenu() || interaction.isModalSubmit()) return dashboard.handle(interaction, client);
  } catch (error) {
    console.error('[Interaction]', error);
    const reply = { content: 'Une erreur est survenue. Elle a été enregistrée dans les logs.', ephemeral: true };
    if (interaction.deferred || interaction.replied) await interaction.followUp(reply).catch(() => null);
    else await interaction.reply(reply).catch(() => null);
  }
});

process.on('unhandledRejection', (error) => console.error('[Unhandled rejection]', error));
process.on('uncaughtException', (error) => console.error('[Uncaught exception]', error));
(async () => {
  await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 10000 });
  console.log('MongoDB connecté.');
  await client.login(config.token);
})().catch((error) => { console.error('Démarrage impossible :', error); process.exit(1); });
