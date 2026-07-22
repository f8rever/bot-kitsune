const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'contas',
    description: 'Mostra as contas da Riot salvas no sistema para login rápido.',
    async execute(interaction) {
        const accountsPath = path.join(__dirname, '../../config', 'riot_accounts.json');
        if (!fs.existsSync(accountsPath)) {
            return interaction.reply({ content: '❌ Nenhuma conta salva encontrada. Use /login primeiro.', ephemeral: true });
        }
        
        const accounts = JSON.parse(fs.readFileSync(accountsPath, 'utf8'));
        const accountNames = Object.keys(accounts);
        
        if (accountNames.length === 0) {
            return interaction.reply({ content: '❌ Nenhuma conta salva encontrada.', ephemeral: true });
        }
        
        const options = accountNames.map(name => {
            const acc = accounts[name];
            return {
                label: name.substring(0, 100),
                description: `Região: ${acc.region || 'BR1'}`,
                value: name.substring(0, 100)
            };
        }).slice(0, 25);
        
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('select_account_login')
            .setPlaceholder('Selecione uma conta para logar')
            .addOptions(options);
            
        const row = new ActionRowBuilder().addComponents(selectMenu);
        
        const embed = new EmbedBuilder()
            .setTitle('📂 Contas Salvas')
            .setDescription('Selecione uma das contas abaixo para logar instantaneamente sem abrir o navegador.\nSe o token estiver expirado, será necessário usar o comando `/login` novamente.')
            .setColor('#2B2D31');
            
        await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    }
};
