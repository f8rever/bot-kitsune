const { Events } = require('discord.js');
const { recordInviteLeave } = require('../utils/mongoStorage.js');

module.exports = {
    name: Events.GuildMemberRemove,
    async execute(member) {
        if (!member.guild) return;

        const guildId = member.guild.id;
        const memberId = member.id;

        try {
            await recordInviteLeave(guildId, memberId);
        } catch (e) {
            console.error('[GuildMemberRemove] Erro ao registrar saída de membro no Invite Tracker:', e.message);
        }
    }
};
