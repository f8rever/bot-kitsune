const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config();

async function run() {
    console.log('1. Renderizando tag de promoção oficial do LoL...');
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 128, height: 128 });

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          width: 128px;
          height: 128px;
          background: transparent;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .sale-badge {
          background: linear-gradient(180deg, #E81A4C 0%, #A80D34 100%);
          color: #FFFFFF;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          font-weight: 900;
          font-size: 38px;
          letter-spacing: -1px;
          padding: 8px 16px;
          border-radius: 18px;
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.75), inset 0 2px 2px rgba(255, 255, 255, 0.4);
          border: 2px solid #FFA3B8;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
        }
      </style>
    </head>
    <body>
      <div class="sale-badge">-50%</div>
    </body>
    </html>
    `;

    await page.setContent(html);
    const pngBuffer = await page.screenshot({ type: 'png', omitBackground: true });
    await browser.close();

    const tempPath = path.join(__dirname, 'temp_sale_badge.png');
    fs.writeFileSync(tempPath, pngBuffer);
    console.log('2. Tag renderizada com sucesso (tamanho:', pngBuffer.length, 'bytes)');

    console.log('3. Conectando ao Discord para registrar nos Application Emojis...');
    const client = new Client({ intents: [GatewayIntentBits.Guilds] });

    client.once('ready', async () => {
        try {
            const dataUri = `data:image/png;base64,${pngBuffer.toString('base64')}`;
            const created = await client.application.emojis.create({
                attachment: dataUri,
                name: 'lol_sale'
            });
            console.log(`✅ [Sucesso] Emoji oficial criado: <:${created.name}:${created.id}>`);
        } catch (err) {
            console.error('Erro ao criar emoji no Discord:', err.message);
        } finally {
            client.destroy();
            if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
            process.exit(0);
        }
    });

    client.login(process.env.DISCORD_TOKEN);
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});
