const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('../database/catalogo.db');

async function run() {
    try {
        console.log("Downloading LootBundles from CDragon...");
        const res = await fetch('https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/loot.json');
        const data = await res.json();
        const bundles = data.LootBundles;
        console.log(`Found ${bundles.length} bundles.`);

        let inserted = 0;
        let skipped = 0;

        db.serialize(() => {
            db.run("BEGIN TRANSACTION");
            // Do not insert 'id' so it auto-increments
            const stmt = db.prepare("INSERT INTO itens (nome, tipo) VALUES (?, ?)");

            for (const bundle of bundles) {
                if (!bundle.description || bundle.description.trim() === '') {
                    skipped++;
                    continue;
                }
                const name = bundle.description;
                if (name.length > 255) {
                    skipped++;
                    continue;
                }
                stmt.run(name, 'BUNDLE');
                inserted++;
            }

            stmt.finalize();
            db.run("COMMIT", () => {
                console.log(`Finished! Inserted: ${inserted}, Skipped: ${skipped}`);
                db.close();
            });
        });

    } catch (e) {
        console.error("Error importing bundles:", e);
    }
}

run();
