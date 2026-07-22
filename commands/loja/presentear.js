const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { searchItems, getItemByName } = require('../../utils/catalog.js');
const { sendGiftV3, getFriendList } = require('../../utils/riotAuth.js');

module.exports = {
    name: 'presentear',
    description: 'Envia um presente para um amigo.',
    options: [
        {
            name: 'riot_id',
            description: 'Nome#TAG do amigo (precisa estar na sua lista)',
            type: 3,
            required: true
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
            type: 4, // Integer
            required: false
        }
    ],
    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused();
        const results = searchItems(focusedValue);
        await interaction.respond(
            results.map(item => ({
                name: `${item.name} (${Number(item.price).toLocaleString('en-US')} RP) [${item.inventoryType}]`,
                value: item.name
            }))
        );
    },
    async execute(interaction) {
        if (!global.userStoreSessions || !global.userStoreSessions.has(interaction.user.id)) {
            return interaction.reply({ content: '❌ Nenhuma sessão ativa. Use o comando /login primeiro.', ephemeral: true });
        }
        
        await interaction.deferReply({ ephemeral: true });
        
        const session = global.userStoreSessions.get(interaction.user.id);
        const riotId = interaction.options.getString('riot_id');
        const itemName = interaction.options.getString('item');
        const giftMessage = interaction.options.getString('mensagem') || 'Presente via KITSUNE!';
        
        const item = getItemByName(itemName);
        if (!item) {
            return interaction.followUp({ content: '❌ Item não encontrado no catálogo.', ephemeral: true });
        }
        
        // Obter Summoner ID do recebedor
        const friends = await getFriendList(session.accessToken, session.entitlementsToken, session.region);
        if (!friends || friends.length === 0) {
            return interaction.followUp({ content: '❌ Não foi possível carregar a lista de amigos para pegar o Summoner ID. A loja pode estar indisponível.', ephemeral: true });
        }
        
        const formattedTarget = riotId.replace(/\s+/g, '').toLowerCase();
        const friendInfo = friends.find(f => f.name && f.name.replace(/\s+/g, '').toLowerCase() === formattedTarget);
        
        if (!friendInfo) {
            return interaction.followUp({ content: `❌ Amigo **${riotId}** não encontrado na sua lista de amigos. Certifique-se de que ele já aceitou seu pedido.`, ephemeral: true });
        }
        
        // Fetch account ID of the sender (required for sendGiftV3)
        // Wait, storeBalance already saves it if we fetched it, but let's fetch again or use a default.
        // I updated getStoreBalance to return accountId. I should fetch it here just to be sure.
        const { getStoreBalance } = require('../../utils/riotAuth.js');
        const storeInfo = await getStoreBalance(session.accessToken, session.entitlementsToken, session.region);
        if (!storeInfo.accountId) {
            return interaction.followUp({ content: '❌ Falha ao obter seu accountId. Tente novamente.', ephemeral: true });
        }
        
        const accountId = storeInfo.accountId;
        const receiverSummonerId = friendInfo.summonerId;
        const quantity = interaction.options.getInteger('quantidade') || 1;
        const totalPrice = item.price * quantity;
        
        if (storeInfo.rp < totalPrice) {
            return interaction.followUp({ content: `❌ Saldo insuficiente! Você tem **${storeInfo.rp} RP**, mas ${quantity}x o item custa **${totalPrice} RP**.`, ephemeral: true });
        }

        const result = await sendGiftV3(
            session.accessToken,
            session.region,
            accountId,
            receiverSummonerId,
            item.itemId,
            item.price,
            item.inventoryType,
            giftMessage,
            quantity
        );
        
        if (result.success) {
            const newRp = Math.max(0, storeInfo.rp - totalPrice);
            
            // 1. Update active session RP
            session.tokens.rp = newRp;
            
            // 2. Save new RP balance to riot_accounts.json for autocomplete and persistence
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
                    { name: 'Quantidade', value: `${quantity}`, inline: true },
                    { name: 'Mensagem', value: `"${giftMessage}"`, inline: false },
                    { name: 'Descontado (Custo Total)', value: `\`-${totalPrice.toLocaleString('en-US')} RP\``, inline: true },
                    { name: 'Novo Saldo de RP', value: `\`${newRp.toLocaleString('en-US')} RP\``, inline: true }
                )
                .setTimestamp();

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
