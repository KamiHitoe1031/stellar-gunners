const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    const errors = [];
    const warnings = [];
    page.on('console', msg => {
        const text = msg.text();
        if (msg.type() === 'error' && !text.includes('favicon')) {
            errors.push(text);
        }
        if (msg.type() === 'warning') {
            warnings.push(text);
        }
    });
    page.on('pageerror', err => {
        errors.push(`PAGE ERROR: ${err.message}`);
    });

    console.log('=== Loading game ===');
    await page.goto('http://localhost:8081/index.html', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 6000)); // Wait for PreloadScene to finish

    // Check we're at TitleScene
    let scene = await page.evaluate(() => {
        return game.scene.scenes.filter(s => s.scene.isActive()).map(s => s.scene.key);
    });
    console.log('Active scenes after load: ' + JSON.stringify(scene));

    // Click to start (TitleScene expects a click/tap)
    console.log('\n=== Clicking to enter MenuScene ===');
    await page.click('canvas');
    await new Promise(r => setTimeout(r, 2000));

    scene = await page.evaluate(() => {
        return game.scene.scenes.filter(s => s.scene.isActive()).map(s => s.scene.key);
    });
    console.log('Active scenes: ' + JSON.stringify(scene));

    // Navigate to a battle - programmatically start GameScene
    console.log('\n=== Starting GameScene programmatically ===');
    const startResult = await page.evaluate(() => {
        try {
            const chars = game.cache.json.get('characters');
            const stages = game.cache.json.get('stages');
            const weapons = game.cache.json.get('weapons');
            const modules = game.cache.json.get('modules');
            const save = SaveManager.load();

            if (!chars || !stages) return { error: 'Data not loaded', chars: !!chars, stages: !!stages };

            const stage = stages[0]; // First stage
            const party = chars.slice(0, 3).map(c =>
                EquipmentSystem.getCharBattleStats(c, save, weapons, modules)
            );

            // Stop current scene, start GameScene
            game.scene.scenes.forEach(s => {
                if (s.scene.isActive()) s.scene.stop();
            });

            game.scene.start('GameScene', {
                stageId: stage.id,
                stageData: stage,
                party: party
            });

            return { success: true, stageId: stage.id, partySize: party.length };
        } catch (e) {
            return { error: e.message, stack: e.stack };
        }
    });
    console.log('Start result: ' + JSON.stringify(startResult, null, 2));
    await new Promise(r => setTimeout(r, 4000)); // Wait for GameScene to initialize

    // Check GameScene is active
    scene = await page.evaluate(() => {
        return game.scene.scenes.filter(s => s.scene.isActive()).map(s => s.scene.key);
    });
    console.log('Active scenes after start: ' + JSON.stringify(scene));

    // Check GameScene state
    const gameState = await page.evaluate(() => {
        try {
            const gs = game.scene.getScene('GameScene');
            if (!gs || !gs.scene.isActive()) return { error: 'GameScene not active' };

            return {
                stageId: gs.stageId,
                playerCount: gs.players?.length || 0,
                activePlayerAlive: gs.activePlayer?.isDead === false,
                enemyPoolSize: gs.enemyPool?.pool?.length || 0,
                activeEnemies: gs.enemyPool?.getActiveEnemies?.()?.length || 0,
                waveManagerState: gs.waveManager ? {
                    currentArea: gs.waveManager.currentAreaIndex,
                    totalAreas: gs.waveManager.getTotalAreas(),
                    currentWave: gs.waveManager.currentWaveInArea,
                    waveActive: gs.waveManager.waveActive,
                    enemiesAlive: gs.waveManager.enemiesAlive
                } : null,
                obstacleCount: gs.obstacleManager?.obstacles?.length || 0,
                floorObjectCount: gs.floorObjects?.length || 0,
                hasShieldSystem: !!gs.shieldSystem,
                hasSkillSystem: !!gs.skillSystem,
                hasEffects: !!gs.effects,
                isGameOver: gs.isGameOver,
                isCleared: gs.isCleared,
                isTransitioning: gs.isTransitioning
            };
        } catch (e) {
            return { error: e.message };
        }
    });
    console.log('\n=== GameScene State ===');
    console.log(JSON.stringify(gameState, null, 2));

    // Wait a bit more for enemies to spawn and check
    await new Promise(r => setTimeout(r, 3000));

    const afterWait = await page.evaluate(() => {
        try {
            const gs = game.scene.getScene('GameScene');
            if (!gs || !gs.scene.isActive()) return { error: 'GameScene not active' };

            const activeEnemies = gs.enemyPool?.getActiveEnemies?.() || [];
            return {
                activeEnemies: activeEnemies.length,
                enemyDetails: activeEnemies.slice(0, 3).map(e => ({
                    id: e.enemyData?.id,
                    hp: e.currentHp,
                    alive: !e.isDead,
                    animState: e.animState,
                    active: e.active
                })),
                playerDetails: gs.players?.map(p => ({
                    id: p.charId,
                    hp: p.currentHp,
                    alive: !p.isDead,
                    animState: p.animState,
                    active: p.isActive
                })) || [],
                waveState: gs.waveManager ? {
                    currentArea: gs.waveManager.currentAreaIndex,
                    currentWave: gs.waveManager.currentWaveInArea,
                    waveActive: gs.waveManager.waveActive,
                    enemiesAlive: gs.waveManager.enemiesAlive
                } : null,
                obstacleCount: gs.obstacleManager?.obstacles?.length || 0,
                floorCount: gs.floorObjects?.length || 0
            };
        } catch (e) {
            return { error: e.message };
        }
    });
    console.log('\n=== After 3s gameplay ===');
    console.log(JSON.stringify(afterWait, null, 2));

    // Collect all errors
    console.log('\n=== All Errors ===');
    if (errors.length === 0) {
        console.log('  No errors!');
    } else {
        errors.forEach(e => console.log(`  ERROR: ${e}`));
    }

    if (warnings.length > 0) {
        console.log('\n=== Warnings ===');
        warnings.slice(0, 20).forEach(w => console.log(`  WARN: ${w}`));
    }

    await browser.close();
    console.log('\n=== Gameplay Test Complete ===');
})();
