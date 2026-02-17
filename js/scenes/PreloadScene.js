class PreloadScene extends Phaser.Scene {
    constructor() {
        super('PreloadScene');
    }

    preload() {
        const cx = GAME_WIDTH / 2;
        const cy = GAME_HEIGHT / 2;

        const progressBg = this.add.rectangle(cx, cy, 400, 30, 0x222233);
        const progressFill = this.add.rectangle(cx - 200, cy, 0, 30, 0x4488ff).setOrigin(0, 0.5);
        const loadText = this.add.text(cx, cy - 40, 'LOADING...', {
            fontSize: '20px', fontFamily: 'Arial', color: '#ffffff'
        }).setOrigin(0.5);

        this.load.on('progress', (value) => {
            progressFill.width = 400 * value;
        });

        this.load.on('complete', () => {
            loadText.setText('COMPLETE');
        });

        // Load JSON data
        this.load.json('characters', 'assets/data/characters.json');
        this.load.json('weapons', 'assets/data/weapons.json');
        this.load.json('modules', 'assets/data/modules.json');
        this.load.json('enemies', 'assets/data/enemies.json');
        this.load.json('stages', 'assets/data/stages.json');
        this.load.json('progression', 'assets/data/progression.json');
        this.load.json('scenarios', 'assets/data/scenarios.json');
        this.load.json('scenario_gallery', 'assets/data/scenario_gallery.json');
        this.load.json('drop_tables', 'assets/data/drop_tables.json');

        // Load character sprites (game-ready processed images)
        for (let i = 1; i <= 6; i++) {
            const id = `chr_0${i}`;
            this.load.image(`${id}_normal`, `assets/images/game/characters/${id}.png`);
            this.load.image(`icon_${id}`, `assets/images/game/ui/${id}_icon.png`);
        }

        // Load enemy sprites
        const enemyFiles = [
            'enemy_drone_01', 'enemy_elite_01', 'enemy_healer_01',
            'enemy_mech_01', 'enemy_soldier_01', 'enemy_turret_01',
            'boss_xr07'
        ];
        enemyFiles.forEach(id => {
            this.load.image(id, `assets/images/game/enemies/${id}.png`);
        });

        // Load battle backgrounds
        const bgFiles = [
            'bg_battle_city', 'bg_battle_lab',
            'bg_city_ruin', 'bg_city_ruin_deep', 'bg_city_lab'
        ];
        bgFiles.forEach(id => {
            this.load.image(id, `assets/images/game/backgrounds/${id}.png`);
        });

        // Load scenario portraits
        const portraits = [
            'chr_01_confident', 'chr_01_serious', 'chr_01_battle',
            'chr_01_surprised', 'chr_01_calm',
            'chr_02_calm', 'chr_02_worried',
            'chr_03_excited', 'chr_03_confident', 'chr_03_worried',
            'chr_03_amazed', 'chr_03_exhausted',
            'chr_04_cool',
            'chr_05_cheerful', 'chr_05_wink',
            'chr_06_focused', 'chr_06_cold'
        ];
        portraits.forEach(id => {
            this.load.image(`portrait_${id}`, `assets/images/game/portraits/${id}.png`);
        });

        // Don't fail on missing images - generate placeholders as fallback
        this.load.on('loaderror', (file) => {
            console.warn(`Failed to load: ${file.key} (${file.url}) - will use placeholder`);
        });
    }

    create() {
        this.generatePlaceholderTextures();
        SaveManager.initCharacters(this.cache.json.get('characters'));
        this.scene.start('TitleScene');
    }

    generatePlaceholderTextures() {
        // Player characters - only generate placeholder if image failed to load
        const characters = this.cache.json.get('characters');
        characters.forEach(c => {
            if (!this.textures.exists(c.spriteKey)) {
                const color = ATTRIBUTE_COLORS[c.attribute] || 0xffffff;
                this.generateRect(c.spriteKey, 32, 32, color, c.name.charAt(0));
            }
        });

        // Enemy textures - only if not loaded
        const enemies = this.cache.json.get('enemies');
        enemies.forEach(e => {
            if (!this.textures.exists(e.spriteKey)) {
                let size = 24;
                let color = 0xff4444;
                if (e.category === 'elite') { size = 32; color = 0xff8800; }
                if (e.category === 'boss') { size = 64; color = 0xdd00dd; }
                this.generateRect(e.spriteKey, size, size, color, e.name.charAt(0));
            }
        });

        // Default textures (always needed as fallback)
        if (!this.textures.exists('enemy_default')) {
            this.generateRect('enemy_default', 24, 24, 0xff4444, '?');
        }
        if (!this.textures.exists('boss_default')) {
            this.generateRect('boss_default', 64, 64, 0xdd00dd, 'B');
        }

        // Bullet textures
        this.generateCircle('bullet_player', 4, 0xffff00);
        this.generateCircle('bullet_enemy', 4, 0xff4444);
        this.generateCircle('bullet_boss', 6, 0xdd44ff);

        // Background tile fallback
        this.generateRect('tile_floor', 32, 32, 0x2a2a3a, '');
    }

    generateRect(key, w, h, color, label) {
        if (this.textures.exists(key)) return;
        const g = this.add.graphics();
        g.fillStyle(color, 1);
        g.fillRect(0, 0, w, h);
        g.lineStyle(1, 0xffffff, 0.3);
        g.strokeRect(0, 0, w, h);
        g.generateTexture(key, w, h);
        g.destroy();
    }

    generateCircle(key, radius, color) {
        if (this.textures.exists(key)) return;
        const g = this.add.graphics();
        g.fillStyle(color, 1);
        g.fillCircle(radius, radius, radius);
        g.generateTexture(key, radius * 2, radius * 2);
        g.destroy();
    }
}
