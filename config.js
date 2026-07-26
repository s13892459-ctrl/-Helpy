require('dotenv').config();

const required = ['TOKEN', 'MONGODB_URI', 'CLIENT_ID', 'CREATOR_ID'];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) throw new Error(`Variables .env manquantes : ${missing.join(', ')}`);

module.exports = {
  token: process.env.TOKEN,
  mongoUri: process.env.MONGODB_URI,
  clientId: process.env.CLIENT_ID,
  creatorId: process.env.CREATOR_ID,
  guildId: process.env.GUILD_ID || null,
  defaultColor: 0x5865F2,
  levels: { MEMBER: 1, TEST: 2, STAFF: 3, OWNER: 4, CREATOR: 5 },
  levelNames: { 1: 'Membre', 2: 'Staff Test', 3: 'Staff', 4: 'Owner', 5: 'Créateur' }
};
