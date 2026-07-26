const { REST, Routes } = require('discord.js'); const { token, clientId } = require('./config'); const dashboard = require('./commands/dashboard');
(async () => { await new REST({ version: '10' }).setToken(token).put(Routes.applicationCommands(clientId), { body: [dashboard.data.toJSON()] }); console.log('Commande /dashboard enregistrée.'); })().catch(console.error);
