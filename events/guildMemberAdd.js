const { Events } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { buildCustomEmbed } = require('../utils/customEmbeds.js');
const { recordInviteJoin } = require('../utils/mongoStorage.js');

module.exports = {
    name: Events.GuildMemberAdd,
    async execute(member) {
        if (!member.guild) return;

        const guild = member.guild;
        const guildId = guild.id;

        // ── 1. Rastreamento de Convites (Invite Tracker) ─────────────────────
        let inviter = null;
        let isFake = false;

        // Checar se a conta é muito recente (< 3 dias) para marcar como fake
        const accountAgeDays = (Date.now() - member.user.createdAt.getTime()) / (1000 * 60 * 60 * 24);
        if (accountAgeDays < 3) {
            isFake = true;
        }

        try {
            const cachedInvites = (global.guildInvitesCache && global.guildInvitesCache.get(guildId)) || new Map();
            const currentInvites = await guild.invites.fetch().catch(() => null);

            if (currentInvites) {
                // Encontrar qual convite teve os usos aumentados
                const usedInvite = currentInvites.find(inv => {
                    const prevUses = cachedInvites.get(inv.code) || 0;
                    return inv.uses > prevUses;
                });

                if (usedInvite && usedInvite.inviter) {
                    inviter = usedInvite.inviter;
                }

                // Atualizar cache de convites da guilda
                const newCache = new Map();
                currentInvites.forEach(inv => newCache.set(inv.code, inv.uses));
                if (!global.guildInvitesCache) global.guildInvitesCache = new Map();
                global.guildInvitesCache.set(guildId, newCache);
            }
        } catch (e) {
            console.warn('[InviteTracker] Falha ao rastrear convite:', e.message);
        }

        // Registrar no MongoDB Atlas
        let inviterStats = { regular: 1, left: 0, fake: 0, total: 1 };
        if (inviter) {
            const savedStats = await recordInviteJoin(guildId, inviter.id, member.id, isFake);
            if (savedStats) inviterStats = savedStats;
        }

        // ── 2. Enviar Notificação no Canal de Boas-Vindas ─────────────────────
        try {
            const welcomeChannel = guild.channels.cache.find(c => 
                c.isTextBased() && (c.name.includes('boas-vindas') || c.name.includes('welcome') || c.name.includes('entradas'))
            ) || guild.systemChannel;

            if (welcomeChannel) {
                const inviterMention = inviter ? `${inviter}` : '`Direto / Desconhecido`';
                const embed = buildCustomEmbed('welcome_invite', member.client, member, {
                    userMention: `${member}`,
                    inviterMention: inviterMention,
                    inviterTotal: String(inviterStats.total),
                    inviterRegular: String(inviterStats.regular),
                    inviterLeft: String(inviterStats.left),
                    memberCount: String(guild.memberCount)
                });

                if (member.user.displayAvatarURL) {
                    embed.setThumbnail(member.user.displayAvatarURL({ extension: 'png', dynamic: true }));
                }

                welcomeChannel.send({ embeds: [embed] }).catch(() => {});
            }
        } catch (e) {
            console.error('[GuildMemberAdd] Erro ao enviar mensagem de boas-vindas:', e.message);
        }

        // ── 3. Autorole Opcional (se configurado em database.json) ────────────
        try {
            const dbPath = path.join(__dirname, '../database/database.json');
            if (fs.existsSync(dbPath)) {
                const db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
                const cargoNome = db?.config?.cargo_verif || 'Viajante';
                const role = guild.roles.cache.find(r => r.name.toLowerCase() === cargoNome.toLowerCase());
                if (role) {
                    member.roles.add(role).catch(() => {});
                }
            }
        } catch (e) {}
    }
};