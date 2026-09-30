const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

(async () => {
    console.log('Launching browser...');
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    console.log('Navigating to http://127.0.0.1:5000...');
    await page.goto('http://127.0.0.1:5000/', { waitUntil: 'networkidle2' });

    // Login
    console.log('Filling login credentials...');
    await page.type('#login_api', 'jeff');
    await page.type('#key_api', 'dias');
    await page.click('#btn-login-submit');

    console.log('Waiting for dashboard...');
    await page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {});
    await new Promise(r => setTimeout(r, 3000));

    // Passes
    console.log('Testing Passes subtab...');
    const passesRadio = await page.$('input[value="Pass"]');
    if (passesRadio) {
        await page.evaluate(() => {
            const el = document.querySelector('input[value="Pass"]');
            el.checked = true;
            el.dispatchEvent(new Event('change', { bubbles: true }));
        });
        await new Promise(r => setTimeout(r, 2000));
        const passesItems = await page.evaluate(() => {
            const cards = Array.from(document.querySelectorAll('#item-list li, .catalog-card-node'));
            return cards.map(c => {
                const name = c.querySelector('h4, .item-name, [class*="name"]')?.textContent?.trim() || '';
                const price = c.querySelector('.rp-price, [class*="price"]')?.textContent?.trim() || '';
                const img = c.querySelector('img')?.src || '';
                return { name, price, img };
            });
        });
        console.log(`Found ${passesItems.length} items in Passes:`);
        passesItems.forEach(i => console.log(` - ${i.name} (${i.price}) -> ${i.img}`));
        await page.screenshot({ path: path.join(__dirname, 'passes_screenshot.png') });
        console.log('Saved passes_screenshot.png');
    } else {
        console.log('Could not find Passes radio!');
    }

    // Bundles
    console.log('\nTesting Bundles subtab...');
    const bundlesRadio = await page.$('input[value="Bundle"]');
    if (bundlesRadio) {
        await page.evaluate(() => {
            const el = document.querySelector('input[value="Bundle"]');
            el.checked = true;
            el.dispatchEvent(new Event('change', { bubbles: true }));
        });
        await new Promise(r => setTimeout(r, 2000));
        const bundleItems = await page.evaluate(() => {
            const cards = Array.from(document.querySelectorAll('#item-list li, .catalog-card-node'));
            return cards.map(c => {
                const name = c.querySelector('h4, .item-name, [class*="name"]')?.textContent?.trim() || '';
                const price = c.querySelector('.rp-price, [class*="price"]')?.textContent?.trim() || '';
                const img = c.querySelector('img')?.src || '';
                return { name, price, img };
            });
        });
        console.log(`Found ${bundleItems.length} items in Bundles:`);
        bundleItems.slice(0, 15).forEach(i => console.log(` - ${i.name} (${i.price}) -> ${i.img}`));
        await page.screenshot({ path: path.join(__dirname, 'bundles_screenshot.png') });
        console.log('Saved bundles_screenshot.png');
    } else {
        console.log('Could not find Bundles radio!');
    }

    await browser.close();
    console.log('\nDone verifying!');
})();
