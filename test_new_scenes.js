/**
 * Test: RulesScene, CharacterGuideScene, TitleScene (KV), MenuScene buttons
 */
const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push('PAGE: ' + e.message));

    await page.goto('http://localhost:8081', { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 5000));

    // Helper to access game (const game doesn't go on window)
    const evalGame = (fn) => page.evaluate(new Function('return (' + fn.toString() + ')()'));

    // Check game loaded
    const gameState = await page.evaluate(() => {
        return {
            isRunning: game.isRunning,
            sceneCount: game.scene.scenes.length,
            activeScenes: game.scene.scenes.filter(s => s.sys.isActive()).map(s => s.sys.settings.key),
        };
    });
    console.log('=== Game Status ===');
    console.log(JSON.stringify(gameState, null, 2));

    // Verify new scenes are registered
    const sceneKeys = await page.evaluate(() =>
        game.scene.scenes.map(s => s.sys.settings.key)
    );
    console.log('\n=== Registered Scenes ===');
    const hasRules = sceneKeys.includes('RulesScene');
    const hasCharGuide = sceneKeys.includes('CharacterGuideScene');
    console.log(`RulesScene: ${hasRules ? '✓' : '✗'}`);
    console.log(`CharacterGuideScene: ${hasCharGuide ? '✓' : '✗'}`);
    console.log(`Total scenes: ${sceneKeys.length}`);

    // Check TitleScene assets
    const titleCheck = await page.evaluate(() => {
        const scene = game.scene.getScene('TitleScene');
        return {
            hasKeyVisual: scene.textures.exists('key_visual'),
            hasTitleLogo: scene.textures.exists('title_logo'),
        };
    });
    console.log('\n=== Title Assets ===');
    console.log(`Key Visual: ${titleCheck.hasKeyVisual ? '✓ LOADED' : '✗ missing'}`);
    console.log(`Title Logo: ${titleCheck.hasTitleLogo ? '✓ LOADED' : '✗ missing'}`);

    // Navigate to MenuScene
    await page.evaluate(() => {
        const scene = game.scene.getScene('TitleScene');
        if (scene.sys.isActive()) scene.scene.start('MenuScene');
    });
    await new Promise(r => setTimeout(r, 1000));

    const menuActive = await page.evaluate(() =>
        game.scene.scenes.filter(s => s.sys.isActive()).map(s => s.sys.settings.key)
    );
    console.log('\n=== Menu ===');
    console.log('Active:', menuActive.join(', '));

    // Navigate to RulesScene
    await page.evaluate(() => {
        game.scene.getScene('MenuScene').scene.start('RulesScene');
    });
    await new Promise(r => setTimeout(r, 1500));

    const rulesCheck = await page.evaluate(() => {
        const scene = game.scene.getScene('RulesScene');
        return {
            active: scene.sys.isActive(),
            currentPage: scene.currentPage,
            totalPages: scene.pages ? scene.pages.length : 0,
        };
    });
    console.log('\n=== RulesScene ===');
    console.log(`Active: ${rulesCheck.active ? '✓' : '✗'}`);
    console.log(`Pages: ${rulesCheck.currentPage + 1}/${rulesCheck.totalPages}`);

    // Navigate through pages
    for (let p = 0; p < 7; p++) {
        await page.evaluate(() => {
            game.scene.getScene('RulesScene').changePage(1);
        });
    }
    await new Promise(r => setTimeout(r, 300));

    const lastPage = await page.evaluate(() => game.scene.getScene('RulesScene').currentPage);
    console.log(`After navigating to last: page ${lastPage + 1}/8`);

    // Navigate to CharacterGuideScene
    await page.evaluate(() => {
        game.scene.getScene('RulesScene').scene.start('CharacterGuideScene');
    });
    await new Promise(r => setTimeout(r, 1500));

    const charCheck = await page.evaluate(() => {
        const scene = game.scene.getScene('CharacterGuideScene');
        return {
            active: scene.sys.isActive(),
            selectedIndex: scene.selectedIndex,
            characterCount: scene.characters ? scene.characters.length : 0,
            detailObjects: scene.detailObjects ? scene.detailObjects.length : 0,
            charName: scene.characters?.[scene.selectedIndex]?.name,
        };
    });
    console.log('\n=== CharacterGuideScene ===');
    console.log(`Active: ${charCheck.active ? '✓' : '✗'}`);
    console.log(`Characters: ${charCheck.characterCount}`);
    console.log(`Selected: ${charCheck.charName} (index ${charCheck.selectedIndex})`);
    console.log(`Detail objects: ${charCheck.detailObjects}`);

    // Switch through all characters
    for (let i = 0; i < 6; i++) {
        await page.evaluate((idx) => {
            game.scene.getScene('CharacterGuideScene').showCharacterDetail(idx);
        }, i);
        await new Promise(r => setTimeout(r, 200));
    }
    const finalChar = await page.evaluate(() => {
        const scene = game.scene.getScene('CharacterGuideScene');
        return {
            selectedIndex: scene.selectedIndex,
            charName: scene.characters[scene.selectedIndex]?.name,
        };
    });
    console.log(`After browsing all: ${finalChar.charName} (index ${finalChar.selectedIndex})`);

    // Back to menu and verify buttons
    await page.evaluate(() => {
        game.scene.getScene('CharacterGuideScene').scene.start('MenuScene');
    });
    await new Promise(r => setTimeout(r, 500));

    const menuCheck = await page.evaluate(() =>
        game.scene.scenes.filter(s => s.sys.isActive()).map(s => s.sys.settings.key)
    );
    console.log('\n=== Return to Menu ===');
    console.log('Active:', menuCheck.join(', '));

    // Print errors
    console.log('\n=== Errors ===');
    const criticalErrors = errors.filter(e => !e.includes('favicon') && !e.includes('404'));
    if (criticalErrors.length === 0) {
        console.log('No critical errors! ✓');
    } else {
        criticalErrors.forEach(e => console.log(`  ${e}`));
    }

    console.log('\n=== All Tests Complete ===');
    await browser.close();
})();
