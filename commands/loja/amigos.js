const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { RiotChatClient } = require('../../utils/riotXmpp.js');
const { decodeGeopasAffinity, getChatDom, getChatUri } = require('../../utils/riotAuth.js');

module.exports = {
    name: 'amigos',
    description: 'Gerencia a lista de amigos da conta Riot.',
    options: [
        {
            name: 'listar',
            description: 'Lista todos os amigos e pedidos pendentes',
            type: 1 // SUB_COMMAND
        },
        {
            name: 'convidar',
            description: 'Envia um pedido de amizade',
            type: 1,
            options: [
                { name: 'riot_id', description: 'Nome#TAG', type: 3, required: true }
            ]
        },
        {
            name: 'convidar_massa',
            description: 'Envia pedido de amizade para múltiplos Riot IDs (separados por vírgula)',
            type: 1,
            options: [
                { name: 'riot_ids', description: 'Ex: Name#TAG, Player#BR1', type: 3, required: true }
            ]
        },
        {
            name: 'aceitar_todos',
            description: 'Aceita todos os pedidos de amizade pendentes',
            type: 1
        },
        {
            name: 'limpar_todos',
            description: 'Remove todos os amigos da sua lista',
            type: 1
        },
        {
            name: 'mensagem_massa',
            description: 'Envia uma mensagem para todos os amigos',
            type: 1,
            options: [
                { name: 'mensagem', description: 'Mensagem a ser enviada', type: 3, required: true }
            ]
        }
    ],
    async execute(interaction) {
        if (!global.userStoreSessions || !global.userStoreSessions.has(interaction.user.id)) {
            return interaction.reply({ content: '❌ Nenhuma sessão ativa. Use o comando /login primeiro.', ephemeral: true });
        }
        
        await interaction.deferReply({ ephemeral: true });
        
        const session = global.userStoreSessions.get(interaction.user.id);
        const { getGeopasToken } = require('../../utils/riotAuth.js');
        const pasToken = await getGeopasToken(session.accessToken);
        if (!pasToken) {
            return interaction.followUp({ content: '❌ Falha ao obter GeoPas token para conectar ao chat.', ephemeral: true });
        }
        
        const aff = decodeGeopasAffinity(pasToken);
        const chatDom = getChatDom(aff);
        const chatUri = getChatUri(session.region.toLowerCase(), aff);
        
        const chatClient = new RiotChatClient(chatUri, chatDom);
        const connected = await chatClient.initializeChat(session.accessToken, pasToken);
        if (!connected) {
            return interaction.followUp({ content: '❌ Falha ao conectar no servidor XMPP (Conta pode estar suspensa).', ephemeral: true });
        }

        const subcommand = interaction.options.getSubcommand();
        const friends = await chatClient.getFriendList();

        try {
            if (subcommand === 'listar') {
                const pending = friends.filter(f => f.status === 'none');
                const accepted = friends.filter(f => f.status === 'both');
                
                const embed = new EmbedBuilder()
                    .setTitle(`🫂 Lista de Amigos - ${session.riotId}`)
                    .setColor('#10B981')
                    .setDescription(`**Amigos:** ${accepted.length}\n**Pendentes:** ${pending.length}`);
                
                await interaction.followUp({ embeds: [embed], ephemeral: true });
            } 
            else if (subcommand === 'convidar') {
                const riotId = interaction.options.getString('riot_id');
                const [name, tag] = riotId.split('#');
                if (!name || !tag) return interaction.followUp({ content: '❌ Formato inválido. Use Nome#TAG', ephemeral: true });
                
                const result = await chatClient.sendFriendRequest(name, tag);
                await interaction.followUp({ content: `📫 **${riotId}**: ${result}`, ephemeral: true });
            }
            else if (subcommand === 'convidar_massa') {
                const ids = interaction.options.getString('riot_ids').split(',');
                let results = [];
                for (const id of ids) {
                    const [name, tag] = id.trim().split('#');
                    if (name && tag) {
                        const res = await chatClient.sendFriendRequest(name, tag);
                        results.push(`**${name}#${tag}**: ${res}`);
                    }
                }
                await interaction.followUp({ content: `✅ Convites enviados:\n${results.join('\n')}`, ephemeral: true });
            }
            else if (subcommand === 'aceitar_todos') {
                const pending = friends.filter(f => f.status === 'none');
                if (pending.length === 0) return interaction.followUp({ content: '❌ Nenhum pedido pendente.', ephemeral: true });
                
                for (const f of pending) {
                    await chatClient.acceptFriendRequest(f.puuid);
                }
                await interaction.followUp({ content: `✅ Aceitos ${pending.length} pedidos de amizade!`, ephemeral: true });
            }
            else if (subcommand === 'limpar_todos') {
                if (friends.length === 0) return interaction.followUp({ content: '❌ Sua lista já está vazia.', ephemeral: true });
                
                for (const f of friends) {
                    await chatClient.removeFriend(f.puuid);
                }
                await interaction.followUp({ content: `🗑️ Removidos ${friends.length} amigos/pedidos.`, ephemeral: true });
            }
            else if (subcommand === 'mensagem_massa') {
                const message = interaction.options.getString('mensagem');
                const accepted = friends.filter(f => f.status === 'both');
                if (accepted.length === 0) return interaction.followUp({ content: '❌ Você não tem amigos para enviar mensagem.', ephemeral: true });
                
                for (const f of accepted) {
                    await chatClient.sendMessage(f.puuid, message);
                }
                await interaction.followUp({ content: `✉️ Mensagem enviada para ${accepted.length} amigos!`, ephemeral: true });
            }
        } catch(e) {
            console.error('[XMPP Error]', e);
            await interaction.followUp({ content: `❌ Ocorreu um erro: ${e.message}`, ephemeral: true });
        } finally {
            chatClient.disconnect();
        }
    }
};
