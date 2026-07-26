const { PermissionFlagsBits } = require('discord.js');
const { creatorId } = require('../config');
const { memberData } = require('./db');

async function levelOf(member) {
  if (member.id === creatorId) return 5;
  const config = await require('../models/GuildConfig').findOne({ guildId: member.guild.id });
  const data = await memberData(member.guild.id, member.id);
  let level = data.level || 1;
  if (config?.ownerRoleId && member.roles.cache.has(config.ownerRoleId)) level = Math.max(level, 4);
  if (config?.staffRoleId && member.roles.cache.has(config.staffRoleId)) level = Math.max(level, 3);
  if (config?.staffTestRoleId && member.roles.cache.has(config.staffTestRoleId)) level = Math.max(level, 2);
  return level;
}
async function canModerate(actor, target, requiredLevel) {
  if (await levelOf(actor) < requiredLevel) return 'Niveau Helpy insuffisant.';
  if (!actor.permissions.has(PermissionFlagsBits.ModerateMembers) && requiredLevel >= 3) return 'Permission Discord manquante.';
  if (target.id === creatorId) return 'Le Créateur est protégé.';
  if (actor.id !== creatorId && actor.roles.highest.comparePositionTo(target.roles.highest) <= 0) return 'Ce membre possède un rôle égal ou supérieur au vôtre.';
  if (!target.moderatable && !target.bannable) return 'Le bot ne peut pas agir sur ce membre (hiérarchie de rôles).';
  return null;
}
module.exports = { levelOf, canModerate };
