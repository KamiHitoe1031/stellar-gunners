const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    // Collect console messages and errors
    const logs = [];
    const errors = [];
    page.on('console', msg => {
        const text = msg.text();
        const type = msg.type();
        if (type === 'error') {
            errors.push(text);
        } else if (type === 'warning') {
            errors.push(`WARN: ${text}`);
        }
        logs.push(`[${type}] ${text}`);
    });
    page.on('response', resp => {
        if (resp.status() === 404) {
            errors.push(`404: ${resp.url()}`);
        }
    });
    page.on('pageerror', err => {
        errors.push(`PAGE ERROR: ${err.message}`);
    });
    page.on('requestfailed', req => {
        errors.push(`FAILED: ${req.url()} - ${req.failure()?.errorText || 'unknown'}`);
    });

    console.log('=== Loading game page ===');
    try {
        await page.goto('http://localhost:8081/index.html', { waitUntil: 'domcontentloaded', timeout: 30000 });
    } catch (e) {
        console.log('Navigation error: ' + e.message);
    }

    // Wait for Phaser to initialize and scenes to load
    console.log('Waiting for game initialization...');
    await new Promise(r => setTimeout(r, 8000));

    // Check if Phaser game exists
    const gameStatus = await page.evaluate(() => {
        if (typeof Phaser === 'undefined') return { error: 'Phaser not loaded' };
        // game is a global const, try to access it
        if (typeof game === 'undefined') return { error: 'Game variable not defined' };
        if (!game) return { error: 'Game is null' };
        return {
            isRunning: game.isRunning,
            sceneCount: game.scene.scenes.length,
            activeScenes: game.scene.scenes.filter(s => s.scene.isActive()).map(s => s.scene.key),
            width: game.config.width,
            height: game.config.height
        };
    });
    console.log('\n=== Game Status ===');
    console.log(JSON.stringify(gameStatus, null, 2));

    // Check texture generation
    const textureStatus = await page.evaluate(() => {
        if (typeof game === 'undefined' || !game) return { error: 'no game' };
        const texMgr = game.textures;
        if (!texMgr) return { error: 'no texture manager' };

        const checkKeys = [
            'chr_01_normal', 'chr_02_normal',
            'enemy_drone_01', 'enemy_soldier_01', 'boss_xr07',
            'bullet_player', 'bullet_enemy',
            'obstacle_wall', 'obstacle_crate', 'obstacle_pillar', 'obstacle_barricade',
            'bg_theme_city', 'bg_theme_city_interior', 'bg_theme_boss_arena',
            'particle_white', 'muzzle_flash',
            'result_panel', 'result_star_filled'
        ];

        const results = {};
        checkKeys.forEach(k => {
            if (texMgr.exists(k)) {
                const tex = texMgr.get(k);
                results[k] = { exists: true, frameTotal: tex.frameTotal, width: tex.source[0]?.width || 0 };
            } else {
                results[k] = { exists: false };
            }
        });
        return results;
    });
    console.log('\n=== Texture Status ===');
    for (const [key, val] of Object.entries(textureStatus)) {
        if (val.exists) {
            console.log(`  ✓ ${key} (frames: ${val.frameTotal}, width: ${val.width})`);
        } else {
            console.log(`  ✗ ${key} MISSING`);
        }
    }

    // Check animations
    const animStatus = await page.evaluate(() => {
        if (typeof game === 'undefined' || !game) return { error: 'no game' };
        const animMgr = game.anims;
        if (!animMgr) return { error: 'no anim manager' };

        const checkAnims = [
            'chr_01_normal_idle', 'chr_01_normal_walk', 'chr_01_normal_fire',
            'chr_01_normal_hit', 'chr_01_normal_death',
            'enemy_drone_01_idle', 'enemy_drone_01_walk',
            'enemy_drone_01_hit', 'enemy_drone_01_death',
            'boss_xr07_idle', 'boss_xr07_death'
        ];
        const results = {};
        checkAnims.forEach(k => {
            results[k] = animMgr.exists(k);
        });
        return results;
    });
    console.log('\n=== Animation Status ===');
    for (const [key, val] of Object.entries(animStatus)) {
        console.log(`  ${val ? '✓' : '✗'} ${key}`);
    }

    // Print errors
    console.log('\n=== Console Errors ===');
    if (errors.length === 0) {
        console.log('  No errors!');
    } else {
        errors.forEach(e => console.log(`  ERROR: ${e}`));
    }

    // Print warnings (asset load failures etc.)
    const warnings = logs.filter(l => l.includes('[warning]') || l.includes('Failed to load'));
    if (warnings.length > 0) {
        console.log('\n=== Warnings ===');
        warnings.forEach(w => console.log(`  ${w}`));
    }

    await browser.close();
    console.log('\n=== Test Complete ===');
})();
