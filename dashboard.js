const {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelSelectMenuBuilder, ChannelType,
  EmbedBuilder, ModalBuilder, StringSelectMenuBuilder, TextInputBuilder, TextInputStyle,
  UserSelectMenuBuilder, PermissionFlagsBits
} = require('discord.js');
const os = require('os');
const config = require('./config');
const { Guild, Sanction, Ticket } = require('./models');

const session = new Map();
const key = (guildId, userId) => `${guildId}:${userId}`;
const getSession = (i) => session.get(key(i.guildId, i.user.id)) || {};
const setSession = (i, data) => session.set(key(i.guildId, i.user.id), { ...getSession(i), ...data });
const color = (g) => g.color || config.defaultColor;
const fmt = (n) => new Intl.NumberFormat('fr-FR').format(n || 0);
const isCreator = (id) => id === config.creatorId;
const levelFor = (g, id) => isCreator(id) ? 5 : Number(g.staff.get(id) || (id === g.ownerId ? 4 : 1));
const can = (g, id, min) => levelFor(g, id) >= min;
const safe = (v, max = 1000) => String(v || '').trim().slice(0, max) || 'Aucune raison fournie';

async function guildConfig(guildId, ownerId) { return Guild.findOneAndUpdate({ guildId }, { $set: ownerId ? { ownerId } : {}, $setOnInsert: { guildId } }, { new: true, upsert: true }); }
function nav(g, userId, active = 'home') {
  const items = [['home', '🏠 Dashboard'], ['profile', '👤 Profil']];
  if (can(g, userId, 2)) items.push(['moderation', '🔨 Modération']);
  if (can(g, userId, 4)) items.push(['settings', '⚙️ Paramètres'], ['staff', '👑 Gestion Staff'], ['logs', '📜 Logs']);
  if (can(g, userId, 5)) items.push(['creator', '🤖 Créateur']);
  return new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId('nav').setPlaceholder('Navigation Helpy').addOptions(items.map(([value, label]) => ({ label, value, default: value === active }))));
}
function back() { return new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('nav:home').setLabel('Retour au Dashboard').setStyle(ButtonStyle.Secondary)); }
function buttons(...items) { return new ActionRowBuilder().addComponents(items.map(([id, label, style = ButtonStyle.Primary, disabled = false]) => new ButtonBuilder().setCustomId(id).setLabel(label).setStyle(style).setDisabled(disabled))); }
async function replyView(i, payload) { if (i.isButton() || i.isStringSelectMenu() || i.isChannelSelectMenu() || i.isUserSelectMenu()) return i.update(payload); return i.reply({ ...payload, ephemeral: true }); }

async function setupView(i, g) {
  const e = new EmbedBuilder().setColor(color(g)).setTitle('Bienvenue dans Helpy').setDescription('Configuration initiale requise. Choisissez le salon des logs, puis la langue et la couleur du tableau de bord.').addFields({ name: 'Salon tickets', value: g.ticketChannelId ? `<#${g.ticketChannelId}>` : 'Optionnel — non défini' });
  return replyView(i, { embeds: [e], components: [
    new ActionRowBuilder().addComponents(new ChannelSelectMenuBuilder().setCustomId('setup:logs').setPlaceholder('Choisir le salon Logs').setChannelTypes(ChannelType.GuildText)),
    new ActionRowBuilder().addComponents(new ChannelSelectMenuBuilder().setCustomId('setup:tickets').setPlaceholder('Choisir le salon Tickets (optionnel)').setChannelTypes(ChannelType.GuildText)),
    new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId('setup:options').setPlaceholder('Langue et couleur').addOptions([{ label: 'Français — Bleu', value: 'fr:5865F2' }, { label: 'Français — Violet', value: 'fr:9B59B6' }, { label: 'English — Blue', value: 'en:5865F2' }, { label: 'English — Green', value: 'en:57F287' }])),
    buttons(['setup:finish', 'Terminer la configuration', ButtonStyle.Success])
  ] });
}
async function homeView(i, g) {
  const [tickets, sanctions] = await Promise.all([Ticket.countDocuments({ guildId: i.guildId, status: 'open' }), Sanction.countDocuments({ guildId: i.guildId })]);
  const guild = i.guild;
  const e = new EmbedBuilder().setColor(color(g)).setAuthor({ name: 'Helpy • Nexus Dashboard', iconURL: guild.iconURL() || undefined }).setDescription(`Bienvenue **${i.user.username}** · Niveau **${config.levelNames[levelFor(g, i.user.id)]}**`).addFields(
    { name: '👥 Membres', value: fmt(guild.memberCount), inline: true }, { name: '💬 Salons', value: fmt(guild.channels.cache.size), inline: true }, { name: '🎭 Rôles', value: fmt(guild.roles.cache.size), inline: true },
    { name: '🎫 Tickets ouverts', value: fmt(tickets), inline: true }, { name: '🔨 Sanctions', value: fmt(sanctions), inline: true }, { name: '🟢 Système', value: 'Opérationnel', inline: true }
  ).setFooter({ text: 'Utilisez le menu ci-dessous pour naviguer.' }).setTimestamp();
  return replyView(i, { embeds: [e], components: [nav(g, i.user.id, 'home'), buttons(['members:0', 'Liste des membres', ButtonStyle.Secondary], ['profile:me', 'Mon profil', ButtonStyle.Secondary])] });
}
async function profileView(i, g, targetId = i.user.id) {
  const member = await i.guild.members.fetch(targetId).catch(() => null); if (!member) return replyView(i, { content: 'Membre introuvable.', components: [back()] });
  const user = member.user;
  const [sanctions, warnCount, kickCount, banCount] = await Promise.all([
    Sanction.find({ guildId: i.guildId, userId: user.id }).sort({ createdAt: -1 }).limit(10).lean(),
    Sanction.countDocuments({ guildId: i.guildId, userId: user.id, type: 'warn', active: true }),
    Sanction.countDocuments({ guildId: i.guildId, userId: user.id, type: 'kick' }),
    Sanction.countDocuments({ guildId: i.guildId, userId: user.id, type: 'ban' })
  ]);
  const counts = { warn: warnCount, kick: kickCount, ban: banCount };
  const roles = member.roles.cache.filter((r) => r.id !== i.guildId).map((r) => r.toString()).join(' ') || 'Aucun rôle';
  const history = sanctions.length ? sanctions.map((s) => `• **${s.type}** — ${safe(s.reason, 80)} <t:${Math.floor(s.createdAt / 1000)}:d>`).join('\n') : 'Aucune sanction.';
  const e = new EmbedBuilder().setColor(color(g)).setTitle(`Profil — ${user.username}`).setThumbnail(user.displayAvatarURL({ size: 256 })).setDescription(`**Pseudo :** ${member.displayName}\n**Utilisateur :** ${user.tag}\n**ID :** \`${user.id}\``).addFields(
    { name: 'Compte créé', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:D>`, inline: true }, { name: 'Arrivée', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:D>`, inline: true }, { name: 'Sanctions', value: `Warns: **${counts.warn}** · Kicks: **${counts.kick}** · Bans: **${counts.ban}**` },
    { name: 'Rôles', value: safe(roles, 1024) }, { name: 'Historique récent', value: safe(history, 1024) }
  );
  if (user.bannerURL()) e.setImage(user.bannerURL({ size: 1024 }));
  return replyView(i, { embeds: [e], components: [nav(g, i.user.id, 'profile'), back()] });
}
async function membersView(i, g, page = 0) {
  const all = [...i.guild.members.cache.values()].sort((a, b) => a.displayName.localeCompare(b.displayName));
  const chunk = all.slice(page * 24, page * 24 + 24); const pages = Math.max(1, Math.ceil(all.length / 24));
  const select = new StringSelectMenuBuilder().setCustomId('member:pick').setPlaceholder(`Membres — page ${page + 1}/${pages}`).addOptions(chunk.map((m) => ({ label: safe(m.displayName, 100), description: m.user.tag.slice(0, 100), value: m.id })) || [{ label: 'Aucun membre', value: 'none' }]);
  const e = new EmbedBuilder().setColor(color(g)).setTitle('Membres du serveur').setDescription(`Page **${page + 1}/${pages}** · Sélectionnez un membre pour ouvrir sa fiche.`);
  return replyView(i, { embeds: [e], components: [nav(g, i.user.id, 'home'), new ActionRowBuilder().addComponents(select), buttons([`members:${page - 1}`, 'Précédent', ButtonStyle.Secondary, page === 0], [`members:${page + 1}`, 'Suivant', ButtonStyle.Secondary, page >= pages - 1]), back()] });
}
async function moderationView(i, g) {
  const e = new EmbedBuilder().setColor(color(g)).setTitle('🔨 Centre de modération').setDescription('Choisissez une action, puis sélectionnez un membre dans la liste ou saisissez son identifiant. Les permissions Discord et la hiérarchie des rôles sont contrôlées avant chaque action.');
  const actions = [{ label: 'Warn', value: 'warn' }, { label: 'Kick', value: 'kick' }, { label: 'Timeout', value: 'timeout' }, { label: 'Ban temporaire', value: 'ban' }];
  if (can(g, i.user.id, 3)) actions.push({ label: 'Unban', value: 'unban' }, { label: 'Retirer un warn', value: 'remove_warn' }, { label: 'Clear messages', value: 'clear' }, { label: 'Slowmode', value: 'slowmode' }, { label: 'Verrouiller le salon', value: 'lock' }, { label: 'Déverrouiller le salon', value: 'unlock' }, { label: 'Mute', value: 'mute' }, { label: 'Unmute', value: 'unmute' }, { label: 'Ajouter un rôle', value: 'role_add' }, { label: 'Retirer un rôle', value: 'role_remove' }, { label: 'Changer le pseudo', value: 'nickname' }, { label: 'Déplacer en vocal', value: 'voice_move' }, { label: 'Déconnecter du vocal', value: 'voice_disconnect' });
  return replyView(i, { embeds: [e], components: [nav(g, i.user.id, 'moderation'), new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId('mod:action').setPlaceholder('Choisir une action').addOptions(actions)), buttons(['members:0', 'Parcourir les membres', ButtonStyle.Secondary])] });
}
async function staffView(i, g) {
  const e = new EmbedBuilder().setColor(color(g)).setTitle('👑 Gestion Staff').setDescription('Attribuez un niveau 1 à 3. Les niveaux 4 et 5 restent réservés au propriétaire et au créateur.');
  return replyView(i, { embeds: [e], components: [nav(g, i.user.id, 'staff'), new ActionRowBuilder().addComponents(new UserSelectMenuBuilder().setCustomId('staff:user').setPlaceholder('Choisir un utilisateur').setMinValues(1).setMaxValues(1)), new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId('staff:level').setPlaceholder('Nouveau niveau').addOptions([{ label: 'Niveau 1 — Membre', value: '1' }, { label: 'Niveau 2 — Staff Test', value: '2' }, { label: 'Niveau 3 — Staff', value: '3' }])), back()] });
}
async function settingsView(i, g) { return replyView(i, { embeds: [new EmbedBuilder().setColor(color(g)).setTitle('⚙️ Paramètres').setDescription(`Logs : ${g.logChannelId ? `<#${g.logChannelId}>` : 'Non configuré'}\nTickets : ${g.ticketChannelId ? `<#${g.ticketChannelId}>` : 'Non configuré'}\nLangue : **${g.language}**\nCouleur : \`#${color(g).toString(16).padStart(6, '0')}\``)], components: [nav(g, i.user.id, 'settings'), new ActionRowBuilder().addComponents(new ChannelSelectMenuBuilder().setCustomId('settings:logs').setPlaceholder('Modifier le salon Logs').setChannelTypes(ChannelType.GuildText)), new ActionRowBuilder().addComponents(new ChannelSelectMenuBuilder().setCustomId('settings:tickets').setPlaceholder('Modifier le salon Tickets').setChannelTypes(ChannelType.GuildText)), back()] }); }
async function logsView(i, g) { const recent = await Sanction.find({ guildId: i.guildId }).sort({ createdAt: -1 }).limit(15).lean(); return replyView(i, { embeds: [new EmbedBuilder().setColor(color(g)).setTitle('📜 Journal des sanctions').setDescription(recent.length ? recent.map((s) => `• **${s.type}** · <@${s.userId}> — ${safe(s.reason, 100)}`).join('\n') : 'Aucune sanction enregistrée.')], components: [nav(g, i.user.id, 'logs'), back()] }); }
async function creatorView(i, g, client) { const [sanctions, tickets] = await Promise.all([Sanction.countDocuments(), Ticket.countDocuments({ status: 'open' })]); const totalMembers = client.guilds.cache.reduce((n, guild) => n + guild.memberCount, 0); const e = new EmbedBuilder().setColor(color(g)).setTitle('🤖 Créateur — Contrôle global').addFields({ name: 'Serveurs', value: fmt(client.guilds.cache.size), inline: true }, { name: 'Membres', value: fmt(totalMembers), inline: true }, { name: 'Sanctions', value: fmt(sanctions), inline: true }, { name: 'Tickets ouverts', value: fmt(tickets), inline: true }, { name: 'Uptime', value: `<t:${Math.floor((Date.now() - client.uptime) / 1000)}:R>`, inline: true }, { name: 'Ping', value: `${client.ws.ping} ms`, inline: true }, { name: 'RAM', value: `${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB`, inline: true }, { name: 'CPU', value: `${os.loadavg()[0].toFixed(2)} (1 min)`, inline: true }, { name: 'Commandes', value: fmt(g.commandCount), inline: true }); return replyView(i, { embeds: [e], components: [nav(g, i.user.id, 'creator'), buttons(['creator:message', 'Envoyer un message', ButtonStyle.Primary], ['creator:broadcast', 'Broadcast Logs', ButtonStyle.Success], ['creator:banall', 'Ban All', ButtonStyle.Danger])] }); }

function modal(id, title, fields) { const m = new ModalBuilder().setCustomId(id).setTitle(title); m.addComponents(fields.map(([name, label, style = TextInputStyle.Short, required = true, placeholder = '']) => new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId(name).setLabel(label).setStyle(style).setRequired(required).setPlaceholder(placeholder).setMaxLength(1000)))); return m; }
async function log(guild, g, embed) { const channel = guild.channels.cache.get(g.logChannelId); if (channel?.isTextBased()) await channel.send({ embeds: [embed] }).catch(() => null); }
async function targetMember(i, id) { const m = await i.guild.members.fetch(id).catch(() => null); if (!m) throw new Error('Membre introuvable.'); const me = i.guild.members.me; if (m.id === i.user.id || m.id === i.guild.ownerId || m.roles.highest.comparePositionTo(i.member.roles.highest) >= 0 || m.roles.highest.comparePositionTo(me.roles.highest) >= 0) throw new Error('Vous ne pouvez pas sanctionner ce membre (hiérarchie des rôles).'); return m; }
function requireDiscordPermission(i, action) { const permissions = { warn: PermissionFlagsBits.ModerateMembers, kick: PermissionFlagsBits.KickMembers, ban: PermissionFlagsBits.BanMembers, timeout: PermissionFlagsBits.ModerateMembers, mute: PermissionFlagsBits.ModerateMembers, unmute: PermissionFlagsBits.ModerateMembers, clear: PermissionFlagsBits.ManageMessages, slowmode: PermissionFlagsBits.ManageChannels, lock: PermissionFlagsBits.ManageChannels, unlock: PermissionFlagsBits.ManageChannels, role_add: PermissionFlagsBits.ManageRoles, role_remove: PermissionFlagsBits.ManageRoles, nickname: PermissionFlagsBits.ManageNicknames, voice_move: PermissionFlagsBits.MoveMembers, voice_disconnect: PermissionFlagsBits.MoveMembers }; if (permissions[action] && !i.memberPermissions.has(permissions[action])) throw new Error('Vous ne possédez pas la permission Discord nécessaire à cette action.'); }
async function applySanction(i, g, data) {
  const { action, userId, reason, duration, extra } = data; const level = levelFor(g, i.user.id); const entry = { guildId: i.guildId, userId, moderatorId: i.user.id, type: action, reason }; requireDiscordPermission(i, action);
  if (action === 'unban') { if (level < 3) throw new Error('Permission insuffisante.'); await i.guild.members.unban(userId, reason); entry.type = 'unban'; }
  else if (action === 'clear') { if (level < 3) throw new Error('Permission insuffisante.'); const amount = Math.max(1, Math.min(Number(duration) || 1, 100)); await i.channel.bulkDelete(amount, true); return `**${amount}** messages supprimés.`; }
  else if (action === 'slowmode') { if (level < 3) throw new Error('Permission insuffisante.'); await i.channel.setRateLimitPerUser(Math.max(0, Math.min(Number(duration) || 0, 21600)), reason); return 'Slowmode modifié.'; }
  else if (action === 'lock' || action === 'unlock') { if (level < 3) throw new Error('Permission insuffisante.'); await i.channel.permissionOverwrites.edit(i.guild.roles.everyone, { SendMessages: action === 'unlock' ? null : false }, { reason }); return action === 'lock' ? 'Salon verrouillé.' : 'Salon déverrouillé.'; }
  else { const member = await targetMember(i, userId); if (action === 'warn') { } else if (action === 'kick') await member.kick(reason); else if (action === 'timeout' || action === 'mute') { const ms = Math.max(60, Math.min(Number(duration) || 600, 2419200)) * 1000; await member.timeout(action === 'mute' ? 2419200000 : ms, reason); entry.type = 'timeout'; entry.expiresAt = new Date(Date.now() + ms); } else if (action === 'unmute') await member.timeout(null, reason); else if (action === 'ban') { const days = Math.max(1, Number(duration) || 1); if ((level === 2 && days > 2) || level < 2 || days > 30) throw new Error('Durée de ban non autorisée (Staff Test : 2 jours maximum, Staff : 30 jours maximum).'); await member.ban({ deleteMessageSeconds: 0, reason }); entry.expiresAt = new Date(Date.now() + days * 86400000); } else if (action === 'remove_warn') { if (level < 3) throw new Error('Permission insuffisante.'); await Sanction.findOneAndUpdate({ guildId: i.guildId, userId, type: 'warn', active: true }, { active: false }); entry.type = 'remove_warn'; } else if (action === 'role_add' || action === 'role_remove') { const role = i.guild.roles.cache.get(extra); if (!role || role.position >= i.guild.members.me.roles.highest.position) throw new Error('Rôle introuvable ou supérieur à Helpy.'); await member.roles[action === 'role_add' ? 'add' : 'remove'](role, reason); } else if (action === 'nickname') await member.setNickname(extra || null, reason); else if (action === 'voice_move') { const channel = i.guild.channels.cache.get(extra); if (!channel?.isVoiceBased()) throw new Error('Salon vocal introuvable.'); await member.voice.setChannel(channel, reason); } else if (action === 'voice_disconnect') await member.voice.disconnect(reason); }
  await Sanction.create(entry); await log(i.guild, g, new EmbedBuilder().setColor(0xED4245).setTitle('Action de modération').setDescription(`**${entry.type}** sur <@${userId}>\nModérateur : <@${i.user.id}>\nRaison : ${reason}`)); return `Action **${entry.type}** appliquée avec succès.`;
}

module.exports.open = async (i, client) => { const g = await guildConfig(i.guildId, i.guild.ownerId); await Guild.updateOne({ _id: g._id }, { $inc: { commandCount: 1 } }); if (!g.setupComplete) { if (!i.memberPermissions.has(PermissionFlagsBits.ManageGuild) && !isCreator(i.user.id)) return i.reply({ content: 'La configuration initiale doit être réalisée par une personne ayant la permission « Gérer le serveur ».', ephemeral: true }); return setupView(i, g); } return homeView(i, g, client); };
module.exports.handle = async (i, client) => {
  const g = await guildConfig(i.guildId, i.guild.ownerId); const id = i.customId;
  if (!g.setupComplete && id.startsWith('setup:')) { if (!i.memberPermissions.has(PermissionFlagsBits.ManageGuild) && !isCreator(i.user.id)) throw new Error('Permission insuffisante.'); if (id === 'setup:logs') await Guild.updateOne({ _id: g._id }, { logChannelId: i.values[0] }); else if (id === 'setup:tickets') await Guild.updateOne({ _id: g._id }, { ticketChannelId: i.values[0] }); else if (id === 'setup:options') { const [language, hex] = i.values[0].split(':'); await Guild.updateOne({ _id: g._id }, { language, color: parseInt(hex, 16) }); } else if (id === 'setup:finish') { const fresh = await guildConfig(i.guildId); if (!fresh.logChannelId) return i.reply({ content: 'Le salon Logs est obligatoire.', ephemeral: true }); await Guild.updateOne({ _id: g._id }, { setupComplete: true }); return homeView(i, await guildConfig(i.guildId)); } return setupView(i, await guildConfig(i.guildId)); }
  if (!g.setupComplete) return i.reply({ content: 'Configuration initiale requise.', ephemeral: true });
  if (id === 'nav') { const page = i.values[0]; if (page === 'home') return homeView(i, g); if (page === 'profile') return profileView(i, g); if (page === 'moderation' && can(g, i.user.id, 2)) return moderationView(i, g); if (page === 'staff' && can(g, i.user.id, 4)) return staffView(i, g); if (page === 'settings' && can(g, i.user.id, 4)) return settingsView(i, g); if (page === 'logs' && can(g, i.user.id, 4)) return logsView(i, g); if (page === 'creator' && isCreator(i.user.id)) return creatorView(i, g, client); }
  if (id === 'nav:home') return homeView(i, g); if (id === 'profile:me') return profileView(i, g); if (id.startsWith('members:')) return membersView(i, g, Math.max(0, Number(id.split(':')[1]))); if (id === 'member:pick') return profileView(i, g, i.values[0]);
  if (id === 'settings:logs' || id === 'settings:tickets') { await Guild.updateOne({ _id: g._id }, { [id.endsWith('logs') ? 'logChannelId' : 'ticketChannelId']: i.values[0] }); return settingsView(i, await guildConfig(i.guildId)); }
  if (id === 'staff:user') { if (!can(g, i.user.id, 4)) throw new Error('Accès Owner requis.'); setSession(i, { staffUserId: i.values[0] }); return i.reply({ content: `Utilisateur sélectionné : <@${i.values[0]}>. Choisissez maintenant son niveau.`, ephemeral: true }); }
  if (id === 'staff:level') { if (!can(g, i.user.id, 4)) throw new Error('Accès Owner requis.'); const s = getSession(i); if (!s.staffUserId) return i.reply({ content: 'Choisissez d’abord un utilisateur.', ephemeral: true }); await Guild.updateOne({ _id: g._id }, { $set: { [`staff.${s.staffUserId}`]: Number(i.values[0]) } }); return i.reply({ content: `Niveau mis à jour pour <@${s.staffUserId}>.`, ephemeral: true }); }
  if (id === 'mod:action') { if (!can(g, i.user.id, 2)) throw new Error('Accès Staff Test requis.'); const action = i.values[0]; setSession(i, { action }); const labels = { warn: 'Warn', kick: 'Kick', timeout: 'Timeout', ban: 'Ban', unban: 'Unban', remove_warn: 'Retirer un warn', clear: 'Clear messages', slowmode: 'Slowmode', lock: 'Verrouiller', unlock: 'Déverrouiller', mute: 'Mute', unmute: 'Unmute', role_add: 'Ajouter un rôle', role_remove: 'Retirer un rôle', nickname: 'Changer le pseudo', voice_move: 'Déplacer en vocal', voice_disconnect: 'Déconnecter du vocal' }; const targetNeeded = !['clear', 'slowmode', 'lock', 'unlock'].includes(action); const extra = ['role_add', 'role_remove'].includes(action) ? [['extra', 'ID du rôle', TextInputStyle.Short, true]] : action === 'nickname' ? [['extra', 'Nouveau pseudo (vide = retirer)', TextInputStyle.Short, false]] : action === 'voice_move' ? [['extra', 'ID du salon vocal', TextInputStyle.Short, true]] : []; return i.showModal(modal('mod:submit', labels[action], [...(targetNeeded ? [['userId', 'ID Discord du membre', TextInputStyle.Short, true, 'Utilisez « Parcourir les membres » pour trouver son ID']] : []), ...(['timeout', 'mute'].includes(action) ? [['duration', 'Durée en secondes (max. 28 jours)', TextInputStyle.Short, true, '600']] : action === 'ban' ? [['duration', 'Durée en jours', TextInputStyle.Short, true, '1']] : ['clear', 'slowmode'].includes(action) ? [['duration', action === 'clear' ? 'Nombre de messages (1-100)' : 'Secondes (0-21600)', TextInputStyle.Short, true, '10']] : []), ...extra, ['reason', 'Justification', TextInputStyle.Paragraph, true, 'Expliquez cette action']])); }
  if (id === 'mod:submit') { const action = getSession(i).action; if (!action) throw new Error('Session expirée. Recommencez l’action.'); const optional = (name) => i.fields.fields.get(name)?.value || ''; const result = await applySanction(i, g, { action, userId: optional('userId'), duration: optional('duration'), extra: optional('extra'), reason: safe(optional('reason')) }); return i.reply({ content: `✅ ${result}`, ephemeral: true }); }
  if (id.startsWith('creator:')) { if (!isCreator(i.user.id)) throw new Error('Accès Créateur requis.'); const action = id.split(':')[1]; if (action === 'message') return i.showModal(modal('creator:message:submit', 'Envoyer un message', [['guildId', 'ID du serveur', TextInputStyle.Short, true], ['channelId', 'ID du salon', TextInputStyle.Short, true], ['message', 'Message', TextInputStyle.Paragraph, true]])); if (action === 'broadcast') return i.showModal(modal('creator:broadcast:submit', 'Broadcast vers les Logs', [['message', 'Annonce de mise à jour', TextInputStyle.Paragraph, true]])); if (action === 'banall') return i.showModal(modal('creator:banall:submit', 'Ban All', [['userId', 'ID Discord de l’utilisateur', TextInputStyle.Short, true], ['reason', 'Justification', TextInputStyle.Paragraph, true]])); }
  if (id === 'creator:message:submit') { const guild = client.guilds.cache.get(i.fields.getTextInputValue('guildId')); const channel = guild?.channels.cache.get(i.fields.getTextInputValue('channelId')); if (!channel?.isTextBased()) throw new Error('Serveur ou salon textuel introuvable.'); await channel.send({ content: safe(i.fields.getTextInputValue('message'), 2000) }); return i.reply({ content: 'Message envoyé.', ephemeral: true }); }
  if (id === 'creator:broadcast:submit') { const message = safe(i.fields.getTextInputValue('message'), 2000); let sent = 0; for (const guild of client.guilds.cache.values()) { const cfg = await guildConfig(guild.id); const channel = guild.channels.cache.get(cfg.logChannelId); if (channel?.isTextBased()) { await channel.send({ embeds: [new EmbedBuilder().setColor(color(cfg)).setTitle('📢 Mise à jour Helpy').setDescription(message)] }).catch(() => null); sent++; } } return i.reply({ content: `Annonce envoyée dans **${sent}** salon(s) Logs.`, ephemeral: true }); }
  if (id === 'creator:banall:submit') { const userId = i.fields.getTextInputValue('userId'); const reason = safe(i.fields.getTextInputValue('reason')); let done = 0; for (const guild of client.guilds.cache.values()) { const member = await guild.members.fetch(userId).catch(() => null); if (member?.bannable) { await member.ban({ reason }); await Sanction.create({ guildId: guild.id, userId, moderatorId: i.user.id, type: 'ban', reason }); done++; } } return i.reply({ content: `Ban appliqué sur **${done}** serveur(s).`, ephemeral: true }); }
  return i.reply({ content: 'Cette action n’est plus disponible.', ephemeral: true });
};

module.exports.expireTemporaryBans = async (client) => {
  const expired = await Sanction.find({ type: 'ban', active: true, expiresAt: { $lte: new Date() } });
  for (const sanction of expired) {
    const guild = client.guilds.cache.get(sanction.guildId);
    if (!guild) continue;
    await guild.members.unban(sanction.userId, 'Expiration automatique du ban Helpy').catch(() => null);
    sanction.active = false;
    await sanction.save();
  }
};
