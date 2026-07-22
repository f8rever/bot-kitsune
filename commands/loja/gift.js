const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { searchItems, getItemByName } = require('../../utils/catalog.js');
const { sendGiftV3, getFriendList } = require('../../utils/riotAuth.js');
const fs = require('fs');
const path = require('path');

const friendlistCacheMap = new Map();

function getActiveSession(userId) {
    if (global.userStoreSessions && global.userStoreSessions.has(userId)) {
        return global.userStoreSessions.get(userId);
    }
    
    // Auto-fallback: use saved account from riot_accounts.json
    const accountsPath = path.join(__dirname, '../../config', 'riot_accounts.json');
    if (fs.existsSync(accountsPath)) {
        try {
            const accounts = JSON.parse(fs.readFileSync(accountsPath, 'utf8'));
            for (const name in accounts) {
                const acc = accounts[name];
                if (!acc.expired && acc.accessToken) {
                    const sessionData = {
                        tokens: acc,
                        accessToken: acc.accessToken,
                        entitlementsToken: acc.entitlementsToken,
                        accountName: name,
                        region: acc.region || 'BR1'
                    };
                    global.userStoreSessions = global.userStoreSessions || new Map();
                    global.userStoreSessions.set(userId, sessionData);
                    return sessionData;
                }
            }
            for (const name in accounts) {
                const acc = accounts[name];
                if (acc.accessToken) {
                    const sessionData = {
                        tokens: acc,
                        accessToken: acc.accessToken,
                        entitlementsToken: acc.entitlementsToken,
                        accountName: name,
                        region: acc.region || 'BR1'
                    };
                    global.userStoreSessions = global.userStoreSessions || new Map();
                    global.userStoreSessions.set(userId, sessionData);
                    return sessionData;
                }
            }
        } catch(e) {}
    }
    return null;
}

module.exports = {
    name: 'gift',
    description: 'Envia um presente para um amigo.',
    options: [
        {
            name: 'riot_id',
            description: 'Selecione ou digite o Nome#TAG do amigo',
            type: 3,
            required: true,
            autocomplete: true
        },
        {
            name: 'idioma',
            description: 'Idioma do catálogo (Português / English)',
            type: 3,
            required: true,
            choices: [
                { name: 'Português', value: 'pt' },
                { name: 'English', value: 'en' }
            ]
        },
        {
            name: 'item',
            description: 'Item que deseja presentear',
            type: 3,
            required: true,
            autocomplete: true
        },
        {
            name: 'mensagem',
            description: 'Mensagem enviada com o presente',
            type: 3,
            required: false
        },
        {
            name: 'quantidade',
            description: 'Quantidade (ex: pacotes ou orbes). Padrão é 1.',
            type: 4,
            required: false
        }
    ],
    async autocomplete(interaction) {
        const focused = interaction.options.getFocused(true);
        const focusedName = focused.name;
        const focusedValue = (focused.value || '').toString().trim();
        
        const session = getActiveSession(interaction.user.id);

        if (focusedName === 'riot_id') {
            try {
                let friends = [];
                if (session) {
                    const key = session.accountName || session.accessToken;
                    if (friendlistCacheMap.has(key)) {
                        friends = friendlistCacheMap.get(key).friends || [];
                    } else if (friendlistCacheMap.has(session.accessToken)) {
                        friends = friendlistCacheMap.get(session.accessToken).friends || [];
                    }
                }
                
                // If specific account cache is empty, aggregate friends from all cached accounts
                if (!friends || friends.length === 0) {
                    for (const entry of friendlistCacheMap.values()) {
                        if (entry.friends && entry.friends.length > 0) {
                            friends = friends.concat(entry.friends);
                        }
                    }
                }

                // If still empty and session exists, attempt fast fetch
                if ((!friends || friends.length === 0) && session) {
                    try {
                        friends = await Promise.race([
                            getFriendList(session.accessToken, session.entitlementsToken, session.region || 'BR1'),
                            new Promise(resolve => setTimeout(() => resolve([]), 2000))
                        ]);
                        if (friends && friends.length > 0) {
                            const key = session.accountName || session.accessToken;
                            friendlistCacheMap.set(key, { timestamp: Date.now(), friends });
                        }
                    } catch(e) {}
                }
                
                if (!friends || friends.length === 0) return interaction.respond([]);
                
                const q = focusedValue.toLowerCase().replace(/[^a-z0-9]/g, '');
                const seen = new Set();
                const validFriends = [];

                for (const f of friends) {
                    const displayName = (f.name || f.nick || '').trim();
                    if (!displayName || seen.has(displayName.toLowerCase())) continue;
                    seen.add(displayName.toLowerCase());
                    validFriends.push(f);
                }

                const matches = validFriends.filter(f => {
                    if (!q) return true;
                    const friendName = (f.name || f.nick || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                    return friendName.includes(q);
                });
                
                return interaction.respond(
                    matches.slice(0, 25).map(f => {
                        const displayName = f.name || f.nick;
                        return {
                            name: displayName,
                            value: displayName
                        };
                    })
                );
            } catch(e) {
                console.error('Friend autocomplete error:', e.message);
                return interaction.respond([]);
            }
        }
        else if (focusedName === 'item') {
            const lang = interaction.options.getString('idioma') || 'pt';
            const results = searchItems(focusedValue, 25, lang);
            return interaction.respond(
                results.map(item => ({
                    name: `${item.name} (${Number(item.price).toLocaleString('en-US')} RP) [${item.inventoryType}]`,
                    value: item.name
                }))
            );
        }
        return interaction.respond([]);
    },
    async execute(interaction) {
        const session = getActiveSession(interaction.user.id);
        if (!session) {
            return interaction.reply({ content: '❌ Nenhuma conta configurada. Use o comando `/link` para vincular uma conta.', ephemeral: true });
        }
        
        await interaction.deferReply({ ephemeral: true });
        
        const riotId = interaction.options.getString('riot_id');
        const itemName = interaction.options.getString('item');
        const lang = interaction.options.getString('idioma') || 'pt';
        const giftMessage = interaction.options.getString('mensagem') || '';
        
        const item = getItemByName(itemName, lang);
        if (!item) {
            return interaction.followUp({ content: '❌ Item não encontrado no catálogo.', ephemeral: true });
        }
        
        let friends = await getFriendList(session.accessToken, session.entitlementsToken, session.region);
        
        // If current session token expired or returned empty, try finding another active account in riot_accounts.json
        if (!friends || friends.length === 0) {
            const accountsPath = path.join(__dirname, '../../config', 'riot_accounts.json');
            if (fs.existsSync(accountsPath)) {
                try {
                    const accounts = JSON.parse(fs.readFileSync(accountsPath, 'utf8'));
                    for (const name in accounts) {
                        const acc = accounts[name];
                        if (!acc.expired && acc.accessToken) {
                            session.accessToken = acc.accessToken;
                            session.entitlementsToken = acc.entitlementsToken;
                            session.region = acc.region || 'BR1';
                            session.accountName = name;
                            friends = await getFriendList(session.accessToken, session.entitlementsToken, session.region);
                            if (friends && friends.length > 0) break;
                        }
                    }
                } catch(e) {}
            }
        }
        
        const cleanStr = str => (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const targetClean = cleanStr(riotId);
        const targetBase = cleanStr(riotId.split('#')[0]);

        let friendInfo = (friends || []).find(f => {
            if (!f) return false;
            const fNameClean = cleanStr(f.name);
            const fNickClean = cleanStr(f.nick);
            const fGameClean = cleanStr(f.gameName);

            return fNameClean === targetClean ||
                   fNickClean === targetClean ||
                   fGameClean === targetClean ||
                   fNameClean === targetBase ||
                   fNickClean === targetBase ||
                   fGameClean === targetBase ||
                   (targetClean.length > 2 && (fNameClean.includes(targetClean) || targetClean.includes(fNameClean) || fNickClean.includes(targetClean)));
        });

        if (!friendInfo && (!friends || friends.length === 0)) {
            return interaction.followUp({ content: '❌ O token da conta Riot expirou. Por favor, faça login novamente com o comando `/login` para renovar a sessão.', ephemeral: true });
        }
        
        if (!friendInfo) {
            return interaction.followUp({ content: `❌ Amigo **${riotId}** não foi localizado na lista da conta **${session.accountName}**. Selecione o amigo nas sugestões do comando /gift.`, ephemeral: true });
        }
        
        const { getStoreBalance } = require('../../utils/riotAuth.js');
        const storeInfo = await getStoreBalance(session.accessToken, session.entitlementsToken, session.region);
        if (!storeInfo || !storeInfo.accountId) {
            return interaction.followUp({ content: '❌ Falha ao obter o saldo da conta na Riot. Tente novamente em alguns instantes.', ephemeral: true });
        }
        
        const accountId = storeInfo.accountId;
        const quantity = interaction.options.getInteger('quantidade') || 1;
        const totalPrice = item.price * quantity;
        
        if (storeInfo.rp < totalPrice) {
            return interaction.followUp({ content: `❌ Saldo insuficiente! Você tem **${storeInfo.rp} RP**, mas ${quantity}x o item custa **${totalPrice} RP**.`, ephemeral: true });
        }

        const { sendGift, getUserInfo, getPuuidByRiotId } = require('../../utils/riotAuth.js');

        function getPuuidFromToken(token) {
            if (!token || typeof token !== 'string') return '';
            try {
                const parts = token.split('.');
                if (parts.length < 2) return '';
                const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
                return payload.sub || payload.puuid || '';
            } catch(e) {
                return '';
            }
        }

        let purchaserPuuid = getPuuidFromToken(session.accessToken);
        if (!purchaserPuuid && session.tokens) {
            purchaserPuuid = getPuuidFromToken(session.tokens.idToken) || session.tokens.puuid || '';
        }
        if (!purchaserPuuid) {
            try {
                const uinfo = await getUserInfo(session.accessToken);
                if (uinfo && typeof uinfo.sub === 'string') purchaserPuuid = uinfo.sub;
                else if (uinfo && typeof uinfo.puuid === 'string') purchaserPuuid = uinfo.puuid;
            } catch(e) {}
        }

        let receiverPuuid = (friendInfo && typeof friendInfo.puuid === 'string' && friendInfo.puuid.length > 15) ? friendInfo.puuid : null;

        if (!receiverPuuid) {
            const parts = riotId.split('#');
            if (parts.length === 2) {
                const fetchedPuuid = await getPuuidByRiotId(parts[0], parts[1], session.accessToken);
                if (fetchedPuuid && fetchedPuuid.length > 15) {
                    receiverPuuid = fetchedPuuid;
                }
            }
        }

        if (!receiverPuuid && friendInfo && friendInfo.summonerId) {
            receiverPuuid = String(friendInfo.summonerId);
        }

        if (!receiverPuuid) {
            return interaction.followUp({ content: `❌ Não foi possível identificar a conta de **${friendInfo.name}**. Verifique se a amizade está ativa no League of Legends.`, ephemeral: true });
        }

        console.log(`[Gift] Purchaser PUUID: ${purchaserPuuid} | Receiver ID: ${receiverPuuid}`);
        console.log(`[Gift] Executing CAP V2 Gift API...`);

        let result = await sendGift(
            session.accessToken,
            session.region,
            purchaserPuuid,
            receiverPuuid,
            item.itemId,
            giftMessage,
            quantity
        );

        // Fail-safe: If CAP V2 API failed (e.g. invalid recipientId format), fallback to Storefront V3 API with summonerId
        if (!result.success && friendInfo.summonerId) {
            console.log(`[Gift] CAP V2 failed (${result.error}), falling back to Storefront V3 API...`);
            const { sendGiftV3 } = require('../../utils/riotAuth.js');
            result = await sendGiftV3(
                session.accessToken,
                session.region,
                accountId,
                friendInfo.summonerId,
                item.itemId,
                item.price,
                item.inventoryType,
                giftMessage,
                quantity
            );
        }

        if (result.success) {
            const newRp = Math.max(0, storeInfo.rp - totalPrice);
            
            if (session.tokens) session.tokens.rp = newRp;
            
            const accountsPath = path.join(__dirname, '../../config', 'riot_accounts.json');
            if (fs.existsSync(accountsPath)) {
                try {
                    const accounts = JSON.parse(fs.readFileSync(accountsPath, 'utf8'));
                    if (accounts[session.accountName]) {
                        accounts[session.accountName].rp = newRp;
                        fs.writeFileSync(accountsPath, JSON.stringify(accounts, null, 2));
                    }
                } catch(e) {}
            }

            const embed = new EmbedBuilder()
                .setTitle('🎁 Presente Enviado com Sucesso!')
                .setColor('#10B981')
                .setDescription(`Você enviou **${quantity}x ${item.name}** para **${riotId}**!`)
                .addFields(
                    { name: 'Item', value: `${item.name}`, inline: true },
                    { name: 'Para (Riot ID)', value: `**${riotId}**`, inline: true },
                    { name: 'Quantidade', value: `${quantity}`, inline: true },
                    { name: 'Mensagem', value: giftMessage ? `"${giftMessage}"` : '---', inline: false },
                    { name: 'Descontado (Custo Total)', value: `\`-${totalPrice.toLocaleString('en-US')} RP\``, inline: true },
                    { name: 'Novo Saldo de RP', value: `\`${newRp.toLocaleString('en-US')} RP\``, inline: true }
                )
                .setTimestamp();

            if (item.iconUrl || item.image) {
                embed.setThumbnail(item.iconUrl || item.image);
            }

            // Send Staff Audit Log via DM to Server Administrators / Staff
            try {
                const { PermissionsBitField } = require('discord.js');
                const staffLogEmbed = new EmbedBuilder()
                    .setTitle('🎁 Log de Presente Enviado (Staff Audit)')
                    .setColor('#F59E0B')
                    .setDescription(`Um novo presente foi enviado com sucesso!`)
                    .addFields(
                        { name: 'Comprador (Discord)', value: `<@${interaction.user.id}> (\`${interaction.user.tag}\`)`, inline: true },
                        { name: 'Conta Enviadora (Alt)', value: `**${session.accountName}** (\`${session.region || 'BR1'}\`)`, inline: true },
                        { name: 'Destinatário (Riot ID)', value: `**${riotId}**`, inline: true },
                        { name: 'Item Enviado', value: `**${quantity}x ${item.name}**`, inline: true },
                        { name: 'Valor Descontado', value: `\`-${totalPrice.toLocaleString('en-US')} RP\``, inline: true },
                        { name: 'Novo Saldo de RP', value: `\`${newRp.toLocaleString('en-US')} RP\``, inline: true },
                        { name: 'Mensagem', value: giftMessage ? `"${giftMessage}"` : '---', inline: false }
                    )
                    .setFooter({ text: '© Kitsune Store • Staff Audit Log', iconURL: interaction.client.user.displayAvatarURL() })
                    .setTimestamp();

                if (item.iconUrl || item.image) {
                    staffLogEmbed.setThumbnail(item.iconUrl || item.image);
                }

                if (interaction.guild) {
                    const members = await interaction.guild.members.fetch();
                    const staffMembers = members.filter(m => !m.user.bot && (m.permissions.has(PermissionsBitField.Flags.Administrator) || m.permissions.has(PermissionsBitField.Flags.ManageGuild)));
                    for (const [id, member] of staffMembers) {
                        try {
                            await member.send({ embeds: [staffLogEmbed] });
                        } catch(dmErr) {}
                    }
                }
            } catch(e) {
                console.error('[Gift Log Error]', e.message);
            }

            return interaction.followUp({ embeds: [embed], ephemeral: true });
        } else {
            const errorMsg = typeof result.error === 'object' ? (result.error.message || JSON.stringify(result.error)) : result.error;
            const failEmbed = new EmbedBuilder()
                .setTitle('❌ Falha no Envio do Presente')
                .setColor('#EF4444')
                .setDescription(`Não foi possível enviar **${item.name}** para **${riotId}**.\n\n**Motivo do Erro (Riot API):**\n\`\`\`${errorMsg}\`\`\``)
                .setTimestamp();
            return interaction.followUp({ embeds: [failEmbed], ephemeral: true });
        }
    }
};
