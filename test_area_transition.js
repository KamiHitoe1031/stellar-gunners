const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    const errors = [];
    page.on('console', msg => {
        if (msg.type() === 'error' && !msg.text().includes('favicon')) {
            errors.push(msg.text());
        }
    });
    page.on('pageerror', err => {
        errors.push(`PAGE ERROR: ${err.message}`);
    });

    console.log('=== Loading game ===');
    await page.goto('http://localhost:8081/index.html', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 6000));

    // Start GameScene
    console.log('=== Starting GameScene ===');
    await page.evaluate(() => {
        const chars = game.cache.json.get('characters');
        const stages = game.cache.json.get('stages');
        const weapons = game.cache.json.get('weapons');
        const modules = game.cache.json.get('modules');
        const save = SaveManager.load();
        const stage = stages[0];
        const party = chars.slice(0, 3).map(c => EquipmentSystem.getCharBattleStats(c, save, weapons, modules));
        game.scene.scenes.forEach(s => { if (s.scene.isActive()) s.scene.stop(); });
        game.scene.start('GameScene', { stageId: stage.id, stageData: stage, party });
    });
    await new Promise(r => setTimeout(r, 4000));

    // Check initial area state
    let state = await page.evaluate(() => {
        const gs = game.scene.getScene('GameScene');
        return {
            area: gs.waveManager.currentAreaIndex,
            totalAreas: gs.waveManager.getTotalAreas(),
            wave: gs.waveManager.currentWaveInArea,
            waveActive: gs.waveManager.waveActive,
            enemies: gs.waveManager.enemiesAlive,
            activeEnemies: gs.enemyPool.getActiveEnemies().length
        };
    });
    console.log('Initial state: ' + JSON.stringify(state));

    // Fast-kill all enemies to clear wave 1
    console.log('\n=== Force-killing all enemies in wave 1 ===');
    await page.evaluate(() => {
        const gs = game.scene.getScene('GameScene');
        gs.enemyPool.getActiveEnemies().forEach(e => {
            e.currentHp = 0;
            e.die();
            gs.waveManager.onEnemyDefeated();
        });
    });
    await new Promise(r => setTimeout(r, 1000));

    state = await page.evaluate(() => {
        const gs = game.scene.getScene('GameScene');
        return {
            area: gs.waveManager.currentAreaIndex,
            wave: gs.waveManager.currentWaveInArea,
            waveActive: gs.waveManager.waveActive,
            enemies: gs.waveManager.enemiesAlive,
            isAreaComplete: gs.waveManager.isAreaComplete()
        };
    });
    console.log('After wave 1 clear: ' + JSON.stringify(state));

    // Wait for wave 2 to start (2s delay)
    console.log('\n=== Waiting for wave 2 ===');
    await new Promise(r => setTimeout(r, 3000));

    state = await page.evaluate(() => {
        const gs = game.scene.getScene('GameScene');
        return {
            area: gs.waveManager.currentAreaIndex,
            wave: gs.waveManager.currentWaveInArea,
            waveActive: gs.waveManager.waveActive,
            enemies: gs.waveManager.enemiesAlive,
            activeEnemies: gs.enemyPool.getActiveEnemies().length
        };
    });
    console.log('Wave 2 state: ' + JSON.stringify(state));

    // Kill wave 2 enemies
    console.log('\n=== Force-killing all enemies in wave 2 ===');
    await page.evaluate(() => {
        const gs = game.scene.getScene('GameScene');
        gs.enemyPool.getActiveEnemies().forEach(e => {
            e.currentHp = 0;
            e.die();
            gs.waveManager.onEnemyDefeated();
        });
    });
    await new Promise(r => setTimeout(r, 1000));

    state = await page.evaluate(() => {
        const gs = game.scene.getScene('GameScene');
        return {
            area: gs.waveManager.currentAreaIndex,
            wave: gs.waveManager.currentWaveInArea,
            waveActive: gs.waveManager.waveActive,
            enemies: gs.waveManager.enemiesAlive,
            isAreaComplete: gs.waveManager.isAreaComplete(),
            hasExitPortal: !!gs.exitPortal,
            isTransitioning: gs.isTransitioning
        };
    });
    console.log('After area 1 clear: ' + JSON.stringify(state));

    // Wait for portal to appear (AREA_TRANSITION_DELAY = 2000ms)
    console.log('\n=== Waiting for exit portal ===');
    await new Promise(r => setTimeout(r, 3000));

    state = await page.evaluate(() => {
        const gs = game.scene.getScene('GameScene');
        return {
            hasExitPortal: !!gs.exitPortal,
            portalX: gs.exitPortal?.x,
            portalY: gs.exitPortal?.y,
            isTransitioning: gs.isTransitioning
        };
    });
    console.log('Portal state: ' + JSON.stringify(state));

    // Force player to reach portal (or wait for auto-transition at 8s)
    console.log('\n=== Triggering portal transition ===');
    await page.evaluate(() => {
        const gs = game.scene.getScene('GameScene');
        if (gs.exitPortal) {
            gs.onPlayerReachPortal();
        }
    });
    await new Promise(r => setTimeout(r, 3000));

    // Check area 2
    state = await page.evaluate(() => {
        const gs = game.scene.getScene('GameScene');
        if (!gs || !gs.scene.isActive()) return { error: 'GameScene not active' };
        return {
            area: gs.waveManager.currentAreaIndex,
            totalAreas: gs.waveManager.getTotalAreas(),
            wave: gs.waveManager.currentWaveInArea,
            waveActive: gs.waveManager.waveActive,
            enemies: gs.waveManager.enemiesAlive,
            activeEnemies: gs.enemyPool.getActiveEnemies().length,
            obstacleCount: gs.obstacleManager.obstacles.length,
            floorCount: gs.floorObjects.length,
            isTransitioning: gs.isTransitioning,
            isCleared: gs.isCleared,
            isGameOver: gs.isGameOver
        };
    });
    console.log('\n=== Area 2 State ===');
    console.log(JSON.stringify(state, null, 2));

    // Kill area 2 enemies to test stage clear
    if (state.activeEnemies > 0) {
        console.log('\n=== Killing area 2 enemies ===');
        await page.evaluate(() => {
            const gs = game.scene.getScene('GameScene');
            gs.enemyPool.getActiveEnemies().forEach(e => {
                e.currentHp = 0;
                e.die();
                gs.waveManager.onEnemyDefeated();
            });
        });
        await new Promise(r => setTimeout(r, 4000));

        state = await page.evaluate(() => {
            const gs = game.scene.getScene('GameScene');
            if (!gs || !gs.scene.isActive()) {
                // Check if ResultScene is active
                const rs = game.scene.getScene('ResultScene');
                if (rs && rs.scene.isActive()) {
                    return { resultScene: true, stageData: rs.stageData?.id };
                }
                return { error: 'GameScene stopped' };
            }
            return {
                isCleared: gs.isCleared,
                isGameOver: gs.isGameOver,
                allAreasComplete: gs.waveManager.allAreasComplete
            };
        });
        console.log('Final state: ' + JSON.stringify(state));
    }

    // Wait for transition to ResultScene
    await new Promise(r => setTimeout(r, 4000));
    const finalScenes = await page.evaluate(() => {
        return game.scene.scenes.filter(s => s.scene.isActive()).map(s => s.scene.key);
    });
    console.log('\n=== Final active scenes: ' + JSON.stringify(finalScenes) + ' ===');

    console.log('\n=== All Errors ===');
    if (errors.length === 0) {
        console.log('  No errors!');
    } else {
        errors.forEach(e => console.log(`  ERROR: ${e}`));
    }

    await browser.close();
    console.log('\n=== Area Transition Test Complete ===');
})();
