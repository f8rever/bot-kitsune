const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({
        headless: 'new',
        executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1536, height: 864 });

    console.log("Navigating to login page...");
    await page.goto('http://localhost:5000/', { waitUntil: 'networkidle2' });
    
    // Check if login lang switch exists
    const loginLangSwitch = await page.$('#loginLangSwitch');
    console.log("Login lang switch present?", !!loginLangSwitch);

    await page.screenshot({ path: 'scratch/screenshot_login.png' });
    console.log("Screenshot login saved.");

    // Fill login
    await page.type('#login_api', 'jeff');
    await page.type('#key_api', 'dias');
    
    await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(e => console.log("Nav wait handled")),
        page.click('.btn-login-submit')
    ]);

    if (!page.url().includes('api_frontend')) {
        await page.goto('http://localhost:5000/api_frontend', { waitUntil: 'networkidle2' });
    }

    console.log("Waiting for catalog items...");
    await page.waitForSelector('.catalog-card-node', { timeout: 15000 });
    await new Promise(r => setTimeout(r, 1200));

    async function checkMetrics(lang) {
        return await page.evaluate((l) => {
            const doc = document.documentElement;
            const kcBar = document.querySelector('.kitsune-console-3d');
            const catalogPanel = document.querySelector('.catalog-panel-3d');
            const cardsGrid = document.querySelector('.catalog-cards-grid-3d');
            const cards = document.querySelectorAll('.catalog-card-node');
            const qaRp = document.querySelector('.kc-btn-rp');
            const qaFriend = document.querySelector('.kc-btn-friend');
            const qaGift = document.querySelector('.kc-btn-gift');

            return {
                lang: l,
                windowWidth: window.innerWidth,
                docScrollWidth: doc.scrollWidth,
                hasOverflow: doc.scrollWidth > window.innerWidth,
                kcBarWidth: kcBar ? kcBar.getBoundingClientRect().width : null,
                catalogPanelWidth: catalogPanel ? catalogPanel.getBoundingClientRect().width : null,
                cardsCount: cards.length,
                hasRpBtn: !!qaRp,
                hasFriendBtn: !!qaFriend,
                hasGiftBtn: !!qaGift
            };
        }, lang);
    }

    await page.setViewport({ width: 1536, height: 1080 });

    console.log("Checking PT metrics...");
    await page.evaluate(() => changeStoreLanguage('pt'));
    await new Promise(r => setTimeout(r, 1000));
    const ptMetrics = await checkMetrics('PT');
    console.log("PT metrics:", JSON.stringify(ptMetrics, null, 2));

    // Click first card (DJ Sona) to select it with rarity badge and glow
    const cards = await page.$$('.catalog-card-node');
    if (cards.length > 0) {
        await cards[0].click();
        await new Promise(r => setTimeout(r, 400));
    }
    // Hover over second card (Lux Elementalista) to show hover beam
    if (cards.length > 1) {
        await cards[1].hover();
        await new Promise(r => setTimeout(r, 600));
    }
    await page.screenshot({ path: 'scratch/screenshot_dashboard_pt.png' });

    console.log("Checking EN metrics...");
    await page.evaluate(() => changeStoreLanguage('en'));
    await new Promise(r => setTimeout(r, 1000));
    const enMetrics = await checkMetrics('EN');
    console.log("EN metrics:", JSON.stringify(enMetrics, null, 2));
    await page.screenshot({ path: 'scratch/screenshot_dashboard_en.png' });

    await browser.close();
    console.log("Verification finished successfully!");
})();
