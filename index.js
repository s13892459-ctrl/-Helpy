const fs = require('node:fs'); const path = require('node:path'); const mongoose = require('mongoose');
const { Client, Collection, GatewayIntentBits, Partials } = require('discord.js'); const { mongoUri, token } = require('./config');
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.GuildModeration], partials: [Partials.GuildMember, Partials.User] });
client.commands = new Collection();
for (const file of fs.readdirSync(path.join(__dirname, 'commands')).filter(f => f.endsWith('.js'))) { const command = require(`./commands/${file}`); client.commands.set(command.data.name, command); }
for (const file of fs.readdirSync(path.join(__dirname, 'events')).filter(f => f.endsWith('.js'))) { const event = require(`./events/${file}`); client.on(event.name, (...args) => event.execute(...args).catch(console.error)); }
client.on('interactionCreate', require('./interactions/router'));
client.once('ready', () => { console.log(`Helpy connecté : ${client.user.tag}`); client.user.setActivity('/dashboard • Assistance'); });
process.on('unhandledRejection', console.error); process.on('uncaughtException', console.error);
mongoose.connect(mongoUri).then(() => client.login(token)).catch(console.error);
