const { memberData } = require('../utils/db');
const { log } = require('./logs');
async function record(guild, userId, staffId, type, reason, durationMs) {
  const data = await memberData(guild.id, userId);
  data.actions.push({ type, reason, staffId, durationMs, expiresAt: durationMs ? new Date(Date.now() + durationMs) : undefined });
  await data.save();
  await log(guild, type, [{ name: 'Membre', value: `<@${userId}> (${userId})`, inline: true }, { name: 'Staff', value: `<@${staffId}>`, inline: true }, { name: 'Raison', value: reason }, ...(durationMs ? [{ name: 'Durée', value: `<t:${Math.floor((Date.now() + durationMs) / 1000)}:R>` }] : [])]);
  return data;
}
async function removeWarn(guild, targetId, actionId, staffId) {
  const data = await memberData(guild.id, targetId); const action = data.actions.id(actionId);
  if (!action || action.type !== 'WARN') throw new Error('Warn introuvable.');
  const reason = action.reason; action.deleteOne(); await data.save();
  await record(guild, targetId, staffId, 'UNWARN', `Suppression du warn : ${reason}`);
}
module.exports = { record, removeWarn };
