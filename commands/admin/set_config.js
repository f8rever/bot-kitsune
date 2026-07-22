const { EmbedBuilder, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'set_config',
    description: '⚙️ Personaliza as cores e emojis de todos os comandos do bot.',
    options: [
        { name: 'cor', description: 'Nova cor em HEX (Ex: #FF0000)', type: 3, required: false },
        { name: 'emoji_sucesso', description: 'Emoji para mensagens positivas', type: 3, required: false },
        { name: 'emoji_erro', description: 'Emoji para mensagens de erro', type: 3, required: false },
        { name: 'logo', description: 'Link da nova imagem/logo do bot', type: 3, required: false }
    ],
    async execute(interaction) {
        // Apenas admins podem usar
        if (!interaction.member.permissions.has('Administrator')) {
            return interaction.reply({ content: '🏮 Apenas administradores podem configurar o bot.', flags: MessageFlags.Ephemeral });
        }

        const configPath = path.join(__dirname, '../../config/config.json');
        
        // Carrega ou cria a config inicial
        let config = {
            cor: "#F43F5E",
            emoji_sucesso: "🌸",
            emoji_erro: "🏮",
            logo: "https://cdn-icons-png.flaticon.com/512/2589/2589175.png"
        };

        if (fs.existsSync(configPath)) {
            config = JSON.parse(fs.readFileSync(configPath));
        }

        // Atualiza apenas o que foi enviado
        const novaCor = interaction.options.getString('cor');
        const eSucesso = interaction.options.getString('emoji_sucesso');
        const eErro = interaction.options.getString('emoji_erro');
        const novaLogo = interaction.options.getString('logo');

        if (novaCor) config.cor = novaCor;
        if (eSucesso) config.emoji_sucesso = eSucesso;
        if (eErro) config.emoji_erro = eErro;
        if (novaLogo) config.logo = novaLogo;

        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

        const embed = new EmbedBuilder()
            .setTitle('⚙️ Configurações Atualizadas!')
            .setColor(config.cor)
            .setThumbnail(config.logo)
            .setDescription('As novas definições foram aplicadas a todos os comandos do sistema.')
            .addFields(
                { name: 'Cor Atual', value: `\`${config.cor}\``, inline: true },
                { name: 'Emojis', value: `Sucesso: ${config.emoji_sucesso} | Erro: ${config.emoji_erro}`, inline: true }
            );

        await interaction.reply({ embeds: [embed] });
    }
};