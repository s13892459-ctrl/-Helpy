require('dotenv').config();

const required = ['DISCORD_TOKEN', 'DISCORD_CLIENT_ID', 'MONGODB_URI', 'CREATOR_ID'];
for (const key of required) if (!process.env[key]) throw new Error(`Variable d'environnement manquante : ${key}`);

module.exports = {
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.DISCORD_CLIENT_ID,
  mongoUri: process.env.MONGODB_URI,
  creatorId: process.env.CREATOR_ID,
  version: process.env.BOT_VERSION || '1.0.0'
};
