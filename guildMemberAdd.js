const { memberData } = require('../utils/db');
module.exports = { name: 'guildMemberAdd', async execute(member) { await memberData(member.guild.id, member.id); } };
