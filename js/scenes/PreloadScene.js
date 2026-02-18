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
        this.load.json('weapon_parts', 'assets/data/weapon_parts.json');

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

        // Load audio (BGM + SFX) - gracefully skip if files don't exist
        const bgmTracks = [
            { key: 'bgm_title', path: 'assets/audio/bgm/title.mp3' },
            { key: 'bgm_menu', path: 'assets/audio/bgm/menu.mp3' },
            { key: 'bgm_battle', path: 'assets/audio/bgm/battle.mp3' },
            { key: 'bgm_boss', path: 'assets/audio/bgm/boss.mp3' },
            { key: 'bgm_result', path: 'assets/audio/bgm/result.mp3' },
            { key: 'bgm_scenario', path: 'assets/audio/bgm/scenario.mp3' }
        ];
        bgmTracks.forEach(t => this.load.audio(t.key, t.path));

        const sfxFiles = [
            { key: 'sfx_shoot', path: 'assets/audio/sfx/shoot.mp3' },
            { key: 'sfx_hit', path: 'assets/audio/sfx/hit.mp3' },
            { key: 'sfx_explosion', path: 'assets/audio/sfx/explosion.mp3' },
            { key: 'sfx_skill', path: 'assets/audio/sfx/skill.mp3' },
            { key: 'sfx_ult', path: 'assets/audio/sfx/ult.mp3' },
            { key: 'sfx_dodge', path: 'assets/audio/sfx/dodge.mp3' },
            { key: 'sfx_levelup', path: 'assets/audio/sfx/levelup.mp3' },
            { key: 'sfx_button', path: 'assets/audio/sfx/button.mp3' },
            { key: 'sfx_wave', path: 'assets/audio/sfx/wave.mp3' }
        ];
        sfxFiles.forEach(t => this.load.audio(t.key, t.path));

        // Don't fail on missing assets - generate placeholders as fallback
        this.load.on('loaderror', (file) => {
            console.warn(`Failed to load: ${file.key} (${file.url}) - will use placeholder`);
        });
    }

    create() {
        this.generatePlaceholderTextures();
        SaveManager.initCharacters(this.cache.json.get('characters'));
        AudioManager.init(this);
        this.scene.start('TitleScene');
    }

    generatePlaceholderTextures() {
        const characters = this.cache.json.get('characters');
        const enemies = this.cache.json.get('enemies');

        // === Character battle sprites (48x48 chibi figures) ===
        characters.forEach(c => {
            if (!this.textures.exists(c.spriteKey)) {
                this.genCharSprite(c);
            }
        });

        // === Character UI icons (48x48 framed portrait) ===
        characters.forEach(c => {
            const charId = c.charId || c.id.replace('_normal', '');
            const iconKey = `icon_${charId}`;
            if (!this.textures.exists(iconKey)) {
                this.genCharIcon(c, iconKey);
            }
        });

        // === Skill type icons (40x40) ===
        this.genAllSkillIcons();

        // === Enemy battle sprites (shaped by type) ===
        enemies.forEach(e => {
            if (!this.textures.exists(e.spriteKey)) {
                this.genEnemySprite(e);
            }
        });

        // Default fallbacks
        if (!this.textures.exists('enemy_default')) {
            this.genSimpleRect('enemy_default', 28, 0xff4444);
        }
        if (!this.textures.exists('boss_default')) {
            this.genSimpleRect('boss_default', 72, 0xdd00dd);
        }

        // Bullet textures (glow circles)
        this.genBullet('bullet_player', 5, 0xffff00);
        this.genBullet('bullet_enemy', 5, 0xff4444);
        this.genBullet('bullet_boss', 7, 0xdd44ff);

        // === Effect particle textures ===
        this.genEffectTextures();

        // === Result screen textures ===
        this.genResultTextures();

        // Tile fallback
        if (!this.textures.exists('tile_floor')) {
            this.genSimpleRect('tile_floor', 32, 0x2a2a3a);
        }
    }

    // ===== Color helpers =====
    _rgb(hex) {
        return `rgb(${(hex>>16)&0xff},${(hex>>8)&0xff},${hex&0xff})`;
    }
    _rgba(hex, a) {
        return `rgba(${(hex>>16)&0xff},${(hex>>8)&0xff},${hex&0xff},${a})`;
    }
    _lighten(hex, amt) {
        const r = Math.min(255, ((hex>>16)&0xff) + amt);
        const g = Math.min(255, ((hex>>8)&0xff) + amt);
        const b = Math.min(255, (hex&0xff) + amt);
        return `rgb(${r},${g},${b})`;
    }
    _darken(hex, amt) {
        const r = Math.max(0, ((hex>>16)&0xff) - amt);
        const g = Math.max(0, ((hex>>8)&0xff) - amt);
        const b = Math.max(0, (hex&0xff) - amt);
        return `rgb(${r},${g},${b})`;
    }
    _makeCanvas(key, w, h) {
        if (this.textures.exists(key)) return null;
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        return c;
    }
    _save(key, canvas) {
        this.textures.addCanvas(key, canvas);
    }
    _roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }

    // ===== Character battle sprite (48x48 chibi) =====
    genCharSprite(charData) {
        const s = 48;
        const canvas = this._makeCanvas(charData.spriteKey, s, s);
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const col = ATTRIBUTE_COLORS[charData.attribute] || 0xffffff;

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.beginPath();
        ctx.ellipse(s/2, s - 3, 13, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Legs
        ctx.fillStyle = this._darken(col, 60);
        ctx.fillRect(16, 36, 6, 8);
        ctx.fillRect(26, 36, 6, 8);

        // Body
        ctx.fillStyle = this._darken(col, 30);
        this._roundRect(ctx, 12, 18, 24, 22, 4);
        ctx.fill();
        ctx.fillStyle = this._rgb(col);
        this._roundRect(ctx, 13, 19, 22, 20, 3);
        ctx.fill();

        // Body highlight
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        this._roundRect(ctx, 14, 20, 10, 10, 2);
        ctx.fill();

        // Body outline
        ctx.strokeStyle = 'rgba(255,255,255,0.35)';
        ctx.lineWidth = 1.2;
        this._roundRect(ctx, 12, 18, 24, 22, 4);
        ctx.stroke();

        // Head
        ctx.fillStyle = this._lighten(col, 40);
        ctx.beginPath();
        ctx.arc(s/2, 13, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Hair highlight
        ctx.fillStyle = this._lighten(col, 70);
        ctx.beginPath();
        ctx.arc(s/2 - 2, 8, 5, Math.PI, 0);
        ctx.fill();

        // Eyes
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(s/2 - 4, 14, 2.5, 3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(s/2 + 4, 14, 2.5, 3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#222244';
        ctx.beginPath();
        ctx.arc(s/2 - 3.5, 14.5, 1.5, 0, Math.PI * 2);
        ctx.arc(s/2 + 4.5, 14.5, 1.5, 0, Math.PI * 2);
        ctx.fill();
        // Eye highlights
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(s/2 - 4.5, 13.5, 0.7, 0, Math.PI * 2);
        ctx.arc(s/2 + 3.5, 13.5, 0.7, 0, Math.PI * 2);
        ctx.fill();

        // Weapon indicator
        const wpnColors = {
            assault_rifle: '#88aacc', pistol: '#ccaa88', shotgun: '#cc8844',
            sniper_rifle: '#44cccc', launcher: '#cc6644'
        };
        const wCol = wpnColors[charData.weaponType] || '#888888';
        ctx.fillStyle = wCol;
        ctx.fillRect(36, 22, 8, 3);
        ctx.fillRect(37, 26, 6, 2);
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.fillRect(36, 22, 8, 1);

        // Type indicator dot (bottom-right)
        const typeColors = { dps: '#ff6644', medic: '#44ff88', tank: '#4488ff', support: '#ffcc44', breaker: '#ff44aa' };
        ctx.fillStyle = typeColors[charData.type] || '#ffffff';
        ctx.beginPath();
        ctx.arc(s - 6, s - 6, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.stroke();

        this._save(charData.spriteKey, canvas);
    }

    // ===== Character UI icon (48x48 framed) =====
    genCharIcon(charData, key) {
        const s = 48;
        const canvas = this._makeCanvas(key, s, s);
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const col = ATTRIBUTE_COLORS[charData.attribute] || 0xffffff;

        // Outer border (attribute color)
        ctx.fillStyle = this._rgb(col);
        this._roundRect(ctx, 0, 0, s, s, 6);
        ctx.fill();

        // Inner dark fill
        ctx.fillStyle = '#0e0e1a';
        this._roundRect(ctx, 3, 3, s - 6, s - 6, 4);
        ctx.fill();

        // Gradient overlay
        const grad = ctx.createLinearGradient(3, 3, s - 3, s - 3);
        grad.addColorStop(0, this._rgba(col, 0.25));
        grad.addColorStop(0.5, this._rgba(col, 0.05));
        grad.addColorStop(1, this._rgba(col, 0.15));
        ctx.fillStyle = grad;
        this._roundRect(ctx, 3, 3, s - 6, s - 6, 4);
        ctx.fill();

        // Diagonal stripe accent
        ctx.strokeStyle = this._rgba(col, 0.15);
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(s + 5, -5);
        ctx.lineTo(-5, s + 5);
        ctx.stroke();
        // Clip to inner area (redraw border to cover stripe overflow)
        ctx.fillStyle = this._rgb(col);
        ctx.fillRect(0, 0, s, 3);
        ctx.fillRect(0, s - 3, s, 3);
        ctx.fillRect(0, 0, 3, s);
        ctx.fillRect(s - 3, 0, 3, s);
        this._roundRect(ctx, 0, 0, s, s, 6);
        ctx.strokeStyle = this._lighten(col, 40);
        ctx.lineWidth = 1;
        ctx.stroke();

        // Character initial (large)
        ctx.fillStyle = this._lighten(col, 60);
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 3;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;
        ctx.fillText(charData.name.charAt(0), s / 2, s / 2 - 3);
        ctx.shadowBlur = 0;

        // Type symbol (bottom-right)
        const typeSymbols = { dps: '⚔', medic: '✚', tank: '◆', support: '★', breaker: '⚡' };
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(typeSymbols[charData.type] || '?', s - 11, s - 11);

        // Rarity stars (top)
        ctx.fillStyle = '#ffcc00';
        ctx.font = '8px Arial';
        ctx.textAlign = 'center';
        const starStr = '★'.repeat(charData.rarity || 1);
        ctx.fillText(starStr, s / 2, 10);

        this._save(key, canvas);
    }

    // ===== Skill type icons (40x40 each) =====
    genAllSkillIcons() {
        const s = 40;

        // icon_skill_shoot - crosshair
        this._genSkillIcon('icon_skill_shoot', s, (ctx) => {
            const cx = s/2, cy = s/2, r = s*0.3;
            ctx.strokeStyle = '#ff8844';
            ctx.lineWidth = 2.5;
            ctx.shadowColor = '#ff6622';
            ctx.shadowBlur = 4;
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.stroke();
            ctx.shadowBlur = 0;
            // Cross lines
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(cx, cy - r - 5); ctx.lineTo(cx, cy - r * 0.4);
            ctx.moveTo(cx, cy + r * 0.4); ctx.lineTo(cx, cy + r + 5);
            ctx.moveTo(cx - r - 5, cy); ctx.lineTo(cx - r * 0.4, cy);
            ctx.moveTo(cx + r * 0.4, cy); ctx.lineTo(cx + r + 5, cy);
            ctx.stroke();
            // Center dot
            ctx.fillStyle = '#ffaa66';
            ctx.beginPath();
            ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
            ctx.fill();
        });

        // icon_skill_heal - medical cross
        this._genSkillIcon('icon_skill_heal', s, (ctx) => {
            const cx = s/2, cy = s/2, arm = s*0.11, len = s*0.32;
            ctx.fillStyle = '#44ff88';
            ctx.shadowColor = '#22cc66';
            ctx.shadowBlur = 5;
            ctx.fillRect(cx - arm, cy - len, arm*2, len*2);
            ctx.fillRect(cx - len, cy - arm, len*2, arm*2);
            ctx.shadowBlur = 0;
            // Highlight
            ctx.fillStyle = 'rgba(255,255,255,0.25)';
            ctx.fillRect(cx - arm + 1, cy - len + 1, arm - 1, len*2 - 2);
            ctx.fillRect(cx - len + 1, cy - arm + 1, arm - 1, arm*2 - 2);
        });

        // icon_skill_shield - shield pentagon
        this._genSkillIcon('icon_skill_shield', s, (ctx) => {
            const cx = s/2, cy = s/2;
            ctx.fillStyle = '#4488ff';
            ctx.shadowColor = '#2266dd';
            ctx.shadowBlur = 5;
            ctx.beginPath();
            ctx.moveTo(cx, cy - s*0.38);
            ctx.lineTo(cx + s*0.32, cy - s*0.18);
            ctx.lineTo(cx + s*0.26, cy + s*0.2);
            ctx.lineTo(cx, cy + s*0.38);
            ctx.lineTo(cx - s*0.26, cy + s*0.2);
            ctx.lineTo(cx - s*0.32, cy - s*0.18);
            ctx.closePath();
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.strokeStyle = '#88bbff';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            // Inner shine
            ctx.fillStyle = 'rgba(136,187,255,0.25)';
            ctx.beginPath();
            ctx.moveTo(cx - 2, cy - s*0.25);
            ctx.lineTo(cx + s*0.12, cy - s*0.1);
            ctx.lineTo(cx, cy + s*0.15);
            ctx.lineTo(cx - s*0.14, cy - s*0.08);
            ctx.closePath();
            ctx.fill();
        });

        // icon_skill_buff - up arrow
        this._genSkillIcon('icon_skill_buff', s, (ctx) => {
            const cx = s/2, cy = s/2;
            ctx.fillStyle = '#ffcc44';
            ctx.shadowColor = '#ddaa22';
            ctx.shadowBlur = 4;
            // Triangle
            ctx.beginPath();
            ctx.moveTo(cx, cy - s*0.34);
            ctx.lineTo(cx + s*0.3, cy + s*0.06);
            ctx.lineTo(cx - s*0.3, cy + s*0.06);
            ctx.closePath();
            ctx.fill();
            ctx.shadowBlur = 0;
            // Bar
            ctx.fillRect(cx - s*0.2, cy + s*0.14, s*0.4, s*0.1);
            // Highlight
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.beginPath();
            ctx.moveTo(cx, cy - s*0.22);
            ctx.lineTo(cx + s*0.1, cy);
            ctx.lineTo(cx - s*0.1, cy);
            ctx.closePath();
            ctx.fill();
        });

        // icon_skill_debuff - circle with X
        this._genSkillIcon('icon_skill_debuff', s, (ctx) => {
            const cx = s/2, cy = s/2, r = s*0.3;
            ctx.strokeStyle = '#cc44ff';
            ctx.lineWidth = 2.5;
            ctx.shadowColor = '#aa22dd';
            ctx.shadowBlur = 4;
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.stroke();
            ctx.shadowBlur = 0;
            // X mark
            const d = s*0.18;
            ctx.beginPath();
            ctx.moveTo(cx - d, cy - d); ctx.lineTo(cx + d, cy + d);
            ctx.moveTo(cx + d, cy - d); ctx.lineTo(cx - d, cy + d);
            ctx.stroke();
            // Center
            ctx.fillStyle = '#cc44ff';
            ctx.beginPath();
            ctx.arc(cx, cy, 3, 0, Math.PI * 2);
            ctx.fill();
        });

        // icon_skill_aoe - starburst
        this._genSkillIcon('icon_skill_aoe', s, (ctx) => {
            const cx = s/2, cy = s/2;
            ctx.fillStyle = '#ff6644';
            ctx.shadowColor = '#dd4422';
            ctx.shadowBlur = 5;
            ctx.beginPath();
            for (let i = 0; i < 10; i++) {
                const angle = (i / 10) * Math.PI * 2 - Math.PI / 2;
                const r = (i % 2 === 0) ? s*0.38 : s*0.16;
                const x = cx + Math.cos(angle) * r;
                const y = cy + Math.sin(angle) * r;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.fill();
            ctx.shadowBlur = 0;
            // Center glow
            ctx.fillStyle = '#ffaa88';
            ctx.beginPath();
            ctx.arc(cx, cy, s*0.08, 0, Math.PI * 2);
            ctx.fill();
        });

        // icon_skill_break - lightning bolt
        this._genSkillIcon('icon_skill_break', s, (ctx) => {
            const cx = s/2, cy = s/2;
            ctx.fillStyle = '#ff4444';
            ctx.shadowColor = '#dd2222';
            ctx.shadowBlur = 5;
            ctx.beginPath();
            ctx.moveTo(cx + 2, cy - s*0.38);
            ctx.lineTo(cx + s*0.2, cy - s*0.38);
            ctx.lineTo(cx - 2, cy - s*0.02);
            ctx.lineTo(cx + s*0.15, cy - s*0.02);
            ctx.lineTo(cx - s*0.1, cy + s*0.38);
            ctx.lineTo(cx, cy + s*0.05);
            ctx.lineTo(cx - s*0.18, cy + s*0.05);
            ctx.closePath();
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.strokeStyle = '#ffaa88';
            ctx.lineWidth = 0.8;
            ctx.stroke();
        });
    }

    _genSkillIcon(key, size, drawFn) {
        const canvas = this._makeCanvas(key, size, size);
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        drawFn(ctx);
        this._save(key, canvas);
    }

    // ===== Enemy sprites (shaped by type) =====
    genEnemySprite(enemyData) {
        const key = enemyData.spriteKey;
        let size;
        if (enemyData.category === 'boss') size = 72;
        else if (enemyData.category === 'elite') size = 40;
        else size = 28;

        const canvas = this._makeCanvas(key, size, size);
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        const attrCol = ATTRIBUTE_COLORS[enemyData.attribute] || 0xff4444;
        let baseCol;
        if (enemyData.category === 'boss') baseCol = 0xdd00dd;
        else if (enemyData.category === 'elite') baseCol = 0xff8800;
        else baseCol = attrCol;

        const fill = this._rgb(baseCol);
        const light = this._lighten(baseCol, 50);
        const dark = this._darken(baseCol, 40);
        const cx = size/2, cy = size/2;

        if (enemyData.category === 'boss') {
            // Hexagon boss with details
            ctx.fillStyle = dark;
            ctx.shadowColor = light;
            ctx.shadowBlur = 8;
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
                const x = cx + Math.cos(a) * (size/2 - 4);
                const y = cy + Math.sin(a) * (size/2 - 4);
                if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.fill();
            ctx.shadowBlur = 0;
            // Inner layer
            ctx.fillStyle = fill;
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
                const x = cx + Math.cos(a) * (size/2 - 10);
                const y = cy + Math.sin(a) * (size/2 - 10);
                if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.fill();
            // Outline
            ctx.strokeStyle = light;
            ctx.lineWidth = 2;
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
                const x = cx + Math.cos(a) * (size/2 - 4);
                const y = cy + Math.sin(a) * (size/2 - 4);
                if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.stroke();
            // Eyes
            ctx.fillStyle = '#ff0000';
            ctx.shadowColor = '#ff0000';
            ctx.shadowBlur = 6;
            ctx.beginPath();
            ctx.arc(cx - 10, cy - 5, 5, 0, Math.PI * 2);
            ctx.arc(cx + 10, cy - 5, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(cx - 10, cy - 5, 2, 0, Math.PI * 2);
            ctx.arc(cx + 10, cy - 5, 2, 0, Math.PI * 2);
            ctx.fill();
            // Core
            ctx.fillStyle = light;
            ctx.beginPath();
            ctx.arc(cx, cy + 8, 6, 0, Math.PI * 2);
            ctx.fill();
        } else if (key.includes('drone') || key.includes('swarm')) {
            // Triangle drone shape
            ctx.fillStyle = fill;
            ctx.shadowColor = light;
            ctx.shadowBlur = 3;
            ctx.beginPath();
            ctx.moveTo(cx, 2);
            ctx.lineTo(size - 3, size - 3);
            ctx.lineTo(3, size - 3);
            ctx.closePath();
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.strokeStyle = light;
            ctx.lineWidth = 1;
            ctx.stroke();
            // Eye
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(cx, cy + 3, size * 0.12, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.arc(cx, cy + 3, size * 0.06, 0, Math.PI * 2);
            ctx.fill();
        } else if (key.includes('turret') || key.includes('sniper')) {
            // Square with barrel
            ctx.fillStyle = fill;
            ctx.shadowColor = light;
            ctx.shadowBlur = 3;
            this._roundRect(ctx, 4, 8, size - 8, size - 10, 3);
            ctx.fill();
            ctx.shadowBlur = 0;
            // Barrel
            ctx.fillStyle = light;
            ctx.fillRect(cx - 2, 0, 4, 10);
            // Outline
            ctx.strokeStyle = light;
            ctx.lineWidth = 1;
            this._roundRect(ctx, 4, 8, size - 8, size - 10, 3);
            ctx.stroke();
            // Scope light
            ctx.fillStyle = '#ff4444';
            ctx.beginPath();
            ctx.arc(cx, 2, 2, 0, Math.PI * 2);
            ctx.fill();
            // Body light
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(cx - 3, cy, 6, 3);
        } else if (key.includes('healer')) {
            // Circle with cross
            ctx.fillStyle = fill;
            ctx.shadowColor = light;
            ctx.shadowBlur = 3;
            ctx.beginPath();
            ctx.arc(cx, cy, size/2 - 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.strokeStyle = light;
            ctx.lineWidth = 1;
            ctx.stroke();
            // Cross
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(cx - 2, cy - 7, 4, 14);
            ctx.fillRect(cx - 7, cy - 2, 14, 4);
        } else if (key.includes('tank') || key.includes('shield') || key.includes('elite') || key.includes('mech')) {
            // Diamond shape
            ctx.fillStyle = dark;
            ctx.beginPath();
            ctx.moveTo(cx, 3);
            ctx.lineTo(size - 3, cy);
            ctx.lineTo(cx, size - 3);
            ctx.lineTo(3, cy);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = fill;
            ctx.beginPath();
            ctx.moveTo(cx, 6);
            ctx.lineTo(size - 6, cy);
            ctx.lineTo(cx, size - 6);
            ctx.lineTo(6, cy);
            ctx.closePath();
            ctx.fill();
            // Outline
            ctx.strokeStyle = light;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(cx, 3);
            ctx.lineTo(size - 3, cy);
            ctx.lineTo(cx, size - 3);
            ctx.lineTo(3, cy);
            ctx.closePath();
            ctx.stroke();
            // Inner glow
            ctx.fillStyle = light;
            ctx.beginPath();
            ctx.arc(cx, cy, size * 0.12, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Default soldier - rectangle with details
            ctx.fillStyle = dark;
            this._roundRect(ctx, 3, 3, size - 6, size - 6, 4);
            ctx.fill();
            ctx.fillStyle = fill;
            this._roundRect(ctx, 5, 5, size - 10, size - 10, 3);
            ctx.fill();
            ctx.strokeStyle = light;
            ctx.lineWidth = 1;
            this._roundRect(ctx, 3, 3, size - 6, size - 6, 4);
            ctx.stroke();
            // Eyes
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(cx - 5, cy - 3, 4, 4);
            ctx.fillRect(cx + 1, cy - 3, 4, 4);
            ctx.fillStyle = '#000000';
            ctx.fillRect(cx - 4, cy - 2, 2, 2);
            ctx.fillRect(cx + 2, cy - 2, 2, 2);
            // Antenna
            ctx.fillStyle = light;
            ctx.fillRect(cx - 1, 1, 2, 5);
        }

        this._save(key, canvas);
    }

    // ===== Bullet with glow =====
    genBullet(key, radius, color) {
        const s = radius * 4;
        const canvas = this._makeCanvas(key, s, s);
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const cx = s/2, cy = s/2;

        // Glow
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 1.8);
        grad.addColorStop(0, this._rgba(color, 0.8));
        grad.addColorStop(0.5, this._rgba(color, 0.2));
        grad.addColorStop(1, this._rgba(color, 0));
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, s, s);

        // Core
        ctx.fillStyle = this._rgb(color);
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();

        // Bright center
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(cx - radius*0.2, cy - radius*0.2, radius*0.4, 0, Math.PI * 2);
        ctx.fill();

        this._save(key, canvas);
    }

    // ===== Effect particle textures =====
    genEffectTextures() {
        // particle_white - generic soft circle for particles
        this._genParticle('particle_white', 16, (ctx, s) => {
            const cx = s/2, cy = s/2;
            const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, s/2);
            grad.addColorStop(0, 'rgba(255,255,255,1)');
            grad.addColorStop(0.3, 'rgba(255,255,255,0.7)');
            grad.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, s, s);
        });

        // particle_spark - small bright diamond for sparks/crits
        this._genParticle('particle_spark', 12, (ctx, s) => {
            const cx = s/2, cy = s/2;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.moveTo(cx, 0); ctx.lineTo(cx + 3, cy);
            ctx.lineTo(cx, s); ctx.lineTo(cx - 3, cy);
            ctx.closePath();
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(0, cy); ctx.lineTo(cx, cy + 3);
            ctx.lineTo(s, cy); ctx.lineTo(cx, cy - 3);
            ctx.closePath();
            ctx.fill();
        });

        // particle_ring - expanding ring for explosions/impacts
        this._genParticle('particle_ring', 32, (ctx, s) => {
            const cx = s/2, cy = s/2;
            ctx.strokeStyle = 'rgba(255,255,255,0.9)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(cx, cy, s/2 - 4, 0, Math.PI * 2);
            ctx.stroke();
            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(cx, cy, s/2 - 2, 0, Math.PI * 2);
            ctx.stroke();
        });

        // particle_smoke - soft blurred circle for smoke/trails
        this._genParticle('particle_smoke', 24, (ctx, s) => {
            const cx = s/2, cy = s/2;
            const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, s/2);
            grad.addColorStop(0, 'rgba(200,200,200,0.5)');
            grad.addColorStop(0.5, 'rgba(150,150,150,0.25)');
            grad.addColorStop(1, 'rgba(100,100,100,0)');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, s, s);
        });

        // particle_star - 4-point star for skill activation/buff
        this._genParticle('particle_star', 16, (ctx, s) => {
            const cx = s/2, cy = s/2;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            for (let i = 0; i < 8; i++) {
                const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
                const r = (i % 2 === 0) ? s/2 - 1 : s * 0.18;
                ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
            }
            ctx.closePath();
            ctx.fill();
        });

        // muzzle_flash - short bright flash for shooting
        this._genParticle('muzzle_flash', 20, (ctx, s) => {
            const cx = s/2, cy = s/2;
            // Radial glow
            const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, s/2);
            grad.addColorStop(0, 'rgba(255,255,200,1)');
            grad.addColorStop(0.3, 'rgba(255,200,100,0.8)');
            grad.addColorStop(0.7, 'rgba(255,150,50,0.3)');
            grad.addColorStop(1, 'rgba(255,100,0,0)');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, s, s);
            // Core lines
            ctx.strokeStyle = 'rgba(255,255,220,0.9)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(cx, cy - 6); ctx.lineTo(cx, cy + 6);
            ctx.moveTo(cx - 5, cy - 3); ctx.lineTo(cx + 5, cy + 3);
            ctx.moveTo(cx + 5, cy - 3); ctx.lineTo(cx - 5, cy + 3);
            ctx.stroke();
        });

        // explosion_circle - filled circle for explosion shockwave
        this._genParticle('explosion_circle', 64, (ctx, s) => {
            const cx = s/2, cy = s/2;
            const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, s/2);
            grad.addColorStop(0, 'rgba(255,200,50,0.9)');
            grad.addColorStop(0.3, 'rgba(255,120,20,0.6)');
            grad.addColorStop(0.7, 'rgba(255,60,10,0.2)');
            grad.addColorStop(1, 'rgba(255,30,0,0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(cx, cy, s/2, 0, Math.PI * 2);
            ctx.fill();
        });

        // dodge_trail - elongated semi-transparent streak
        this._genParticle('dodge_trail', 24, (ctx, s) => {
            const grad = ctx.createLinearGradient(0, s/2, s, s/2);
            grad.addColorStop(0, 'rgba(100,180,255,0)');
            grad.addColorStop(0.3, 'rgba(100,180,255,0.4)');
            grad.addColorStop(0.7, 'rgba(150,200,255,0.4)');
            grad.addColorStop(1, 'rgba(200,220,255,0)');
            ctx.fillStyle = grad;
            this._roundRect(ctx, 2, s/2 - 4, s - 4, 8, 4);
            ctx.fill();
        });

        // shield_hit - blue impact flash
        this._genParticle('shield_hit', 32, (ctx, s) => {
            const cx = s/2, cy = s/2;
            const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, s/2);
            grad.addColorStop(0, 'rgba(100,200,255,0.9)');
            grad.addColorStop(0.4, 'rgba(50,150,255,0.4)');
            grad.addColorStop(1, 'rgba(30,100,255,0)');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, s, s);
            // Hex pattern fragments
            ctx.strokeStyle = 'rgba(150,220,255,0.6)';
            ctx.lineWidth = 1;
            for (let i = 0; i < 6; i++) {
                const a = (i / 6) * Math.PI * 2;
                const r = s * 0.3;
                ctx.beginPath();
                ctx.arc(cx + Math.cos(a) * r * 0.5, cy + Math.sin(a) * r * 0.5, 4, a, a + 1);
                ctx.stroke();
            }
        });
    }

    _genParticle(key, size, drawFn) {
        const canvas = this._makeCanvas(key, size, size);
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        drawFn(ctx, size);
        this._save(key, canvas);
    }

    // ===== Result screen textures =====
    genResultTextures() {
        const W = GAME_WIDTH, H = GAME_HEIGHT;

        // result_panel - main content panel (700x440, rounded, gradient border)
        this._genRect('result_panel', 700, 440, (ctx, w, h) => {
            // Outer glow border
            ctx.shadowColor = 'rgba(60,120,200,0.3)';
            ctx.shadowBlur = 12;
            ctx.fillStyle = 'rgba(40,60,100,0.6)';
            this._roundRect(ctx, 0, 0, w, h, 12);
            ctx.fill();
            ctx.shadowBlur = 0;
            // Inner dark fill
            ctx.fillStyle = 'rgba(8,10,25,0.92)';
            this._roundRect(ctx, 3, 3, w - 6, h - 6, 10);
            ctx.fill();
            // Top accent line
            const grad = ctx.createLinearGradient(50, 3, w - 50, 3);
            grad.addColorStop(0, 'rgba(60,120,200,0)');
            grad.addColorStop(0.3, 'rgba(60,120,200,0.6)');
            grad.addColorStop(0.7, 'rgba(60,120,200,0.6)');
            grad.addColorStop(1, 'rgba(60,120,200,0)');
            ctx.fillStyle = grad;
            ctx.fillRect(20, 3, w - 40, 2);
        });

        // result_header_clear - green/gold banner
        this._genRect('result_header_clear', 500, 56, (ctx, w, h) => {
            const grad = ctx.createLinearGradient(0, 0, w, 0);
            grad.addColorStop(0, 'rgba(0,80,40,0)');
            grad.addColorStop(0.2, 'rgba(0,120,60,0.5)');
            grad.addColorStop(0.5, 'rgba(0,160,80,0.7)');
            grad.addColorStop(0.8, 'rgba(0,120,60,0.5)');
            grad.addColorStop(1, 'rgba(0,80,40,0)');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, w, h);
            // Horizontal lines
            ctx.strokeStyle = 'rgba(100,255,150,0.4)';
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(40, 6); ctx.lineTo(w - 40, 6); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(40, h - 6); ctx.lineTo(w - 40, h - 6); ctx.stroke();
            // Corner accents
            ctx.fillStyle = 'rgba(100,255,150,0.6)';
            ctx.fillRect(30, 4, 12, 2);
            ctx.fillRect(w - 42, 4, 12, 2);
            ctx.fillRect(30, h - 6, 12, 2);
            ctx.fillRect(w - 42, h - 6, 12, 2);
        });

        // result_header_fail - red banner
        this._genRect('result_header_fail', 500, 56, (ctx, w, h) => {
            const grad = ctx.createLinearGradient(0, 0, w, 0);
            grad.addColorStop(0, 'rgba(80,0,0,0)');
            grad.addColorStop(0.2, 'rgba(140,20,20,0.5)');
            grad.addColorStop(0.5, 'rgba(180,30,30,0.7)');
            grad.addColorStop(0.8, 'rgba(140,20,20,0.5)');
            grad.addColorStop(1, 'rgba(80,0,0,0)');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, w, h);
            ctx.strokeStyle = 'rgba(255,80,80,0.4)';
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(40, 6); ctx.lineTo(w - 40, 6); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(40, h - 6); ctx.lineTo(w - 40, h - 6); ctx.stroke();
        });

        // result_star_filled - gold star (40x40)
        this._genParticle('result_star_filled', 40, (ctx, s) => {
            const cx = s/2, cy = s/2;
            ctx.fillStyle = '#ffcc00';
            ctx.shadowColor = '#ffaa00';
            ctx.shadowBlur = 6;
            ctx.beginPath();
            for (let i = 0; i < 10; i++) {
                const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
                const r = (i % 2 === 0) ? s/2 - 2 : s * 0.2;
                ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
            }
            ctx.closePath();
            ctx.fill();
            ctx.shadowBlur = 0;
            // Inner highlight
            ctx.fillStyle = 'rgba(255,255,200,0.3)';
            ctx.beginPath();
            for (let i = 0; i < 10; i++) {
                const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
                const r = (i % 2 === 0) ? s * 0.3 : s * 0.12;
                ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
            }
            ctx.closePath();
            ctx.fill();
        });

        // result_star_empty - dark outline star (40x40)
        this._genParticle('result_star_empty', 40, (ctx, s) => {
            const cx = s/2, cy = s/2;
            ctx.strokeStyle = 'rgba(100,100,120,0.5)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            for (let i = 0; i < 10; i++) {
                const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
                const r = (i % 2 === 0) ? s/2 - 2 : s * 0.2;
                ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
            }
            ctx.closePath();
            ctx.stroke();
            ctx.fillStyle = 'rgba(30,30,50,0.4)';
            ctx.fill();
        });

        // result_divider - gradient horizontal line (600x2)
        this._genRect('result_divider', 600, 2, (ctx, w, h) => {
            const grad = ctx.createLinearGradient(0, 0, w, 0);
            grad.addColorStop(0, 'rgba(60,100,160,0)');
            grad.addColorStop(0.3, 'rgba(60,100,160,0.5)');
            grad.addColorStop(0.7, 'rgba(60,100,160,0.5)');
            grad.addColorStop(1, 'rgba(60,100,160,0)');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, w, h);
        });

        // result_btn - button background (180x48, rounded)
        ['result_btn_retry', 'result_btn_menu'].forEach((key, idx) => {
            const baseCol = idx === 0 ? [180, 120, 40] : [40, 140, 140];
            this._genRect(key, 180, 48, (ctx, w, h) => {
                const grad = ctx.createLinearGradient(0, 0, 0, h);
                grad.addColorStop(0, `rgba(${baseCol[0]+30},${baseCol[1]+30},${baseCol[2]+30},0.9)`);
                grad.addColorStop(1, `rgba(${baseCol[0]-20},${baseCol[1]-20},${baseCol[2]-20},0.9)`);
                ctx.fillStyle = grad;
                this._roundRect(ctx, 0, 0, w, h, 8);
                ctx.fill();
                // Border
                ctx.strokeStyle = `rgba(${baseCol[0]+60},${baseCol[1]+60},${baseCol[2]+60},0.7)`;
                ctx.lineWidth = 1.5;
                this._roundRect(ctx, 0, 0, w, h, 8);
                ctx.stroke();
                // Top highlight
                ctx.fillStyle = 'rgba(255,255,255,0.08)';
                this._roundRect(ctx, 2, 2, w - 4, h / 2 - 2, 6);
                ctx.fill();
            });
        });

        // Stat icons (20x20 each)
        // Time icon - clock
        this._genParticle('result_icon_time', 20, (ctx, s) => {
            const cx = s/2, cy = s/2;
            ctx.strokeStyle = '#88ccff';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(cx, cy, s/2 - 2, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(cx, cy - 1); ctx.lineTo(cx, cy - s * 0.28);
            ctx.moveTo(cx, cy - 1); ctx.lineTo(cx + s * 0.2, cy + 1);
            ctx.stroke();
            ctx.fillStyle = '#88ccff';
            ctx.beginPath(); ctx.arc(cx, cy, 1.5, 0, Math.PI * 2); ctx.fill();
        });

        // Damage icon - sword
        this._genParticle('result_icon_damage', 20, (ctx, s) => {
            ctx.strokeStyle = '#ff8844';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(s * 0.2, s * 0.8);
            ctx.lineTo(s * 0.7, s * 0.3);
            ctx.stroke();
            ctx.fillStyle = '#ff8844';
            ctx.beginPath();
            ctx.moveTo(s * 0.7, s * 0.15);
            ctx.lineTo(s * 0.85, s * 0.3);
            ctx.lineTo(s * 0.7, s * 0.38);
            ctx.lineTo(s * 0.62, s * 0.3);
            ctx.closePath();
            ctx.fill();
            // Guard
            ctx.fillRect(s * 0.25, s * 0.65, s * 0.2, 3);
        });

        // Death icon - skull
        this._genParticle('result_icon_death', 20, (ctx, s) => {
            const cx = s/2, cy = s * 0.4;
            ctx.fillStyle = '#ff6666';
            ctx.beginPath();
            ctx.arc(cx, cy, s * 0.3, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillRect(cx - s * 0.15, cy + s * 0.15, s * 0.3, s * 0.2);
            // Eyes
            ctx.fillStyle = '#220000';
            ctx.beginPath();
            ctx.arc(cx - 3, cy - 1, 2.5, 0, Math.PI * 2);
            ctx.arc(cx + 3, cy - 1, 2.5, 0, Math.PI * 2);
            ctx.fill();
            // Jaw
            ctx.fillStyle = '#ff6666';
            ctx.fillRect(cx - 3, s * 0.7, 2, 4);
            ctx.fillRect(cx + 1, s * 0.7, 2, 4);
        });

        // XP icon - up arrow
        this._genParticle('result_icon_xp', 20, (ctx, s) => {
            ctx.fillStyle = '#88ff88';
            ctx.beginPath();
            ctx.moveTo(s/2, 2);
            ctx.lineTo(s - 3, s * 0.5);
            ctx.lineTo(s * 0.65, s * 0.5);
            ctx.lineTo(s * 0.65, s - 3);
            ctx.lineTo(s * 0.35, s - 3);
            ctx.lineTo(s * 0.35, s * 0.5);
            ctx.lineTo(3, s * 0.5);
            ctx.closePath();
            ctx.fill();
        });

        // Credit icon - coin
        this._genParticle('result_icon_credit', 20, (ctx, s) => {
            const cx = s/2, cy = s/2;
            ctx.fillStyle = '#ffcc44';
            ctx.beginPath();
            ctx.arc(cx, cy, s/2 - 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#ddaa22';
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.fillStyle = '#ddaa22';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('¢', cx, cy + 1);
        });

        // Drop item row background (300x28, rounded)
        this._genRect('result_drop_bg', 300, 28, (ctx, w, h) => {
            ctx.fillStyle = 'rgba(40,40,60,0.5)';
            this._roundRect(ctx, 0, 0, w, h, 5);
            ctx.fill();
            ctx.strokeStyle = 'rgba(80,80,120,0.3)';
            ctx.lineWidth = 1;
            this._roundRect(ctx, 0, 0, w, h, 5);
            ctx.stroke();
        });
    }

    _genRect(key, w, h, drawFn) {
        if (this.textures.exists(key)) return;
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        drawFn(ctx, w, h);
        this.textures.addCanvas(key, canvas);
    }

    // ===== Simple fallback rectangle =====
    genSimpleRect(key, size, color) {
        if (this.textures.exists(key)) return;
        const g = this.add.graphics();
        g.fillStyle(color, 1);
        g.fillRect(0, 0, size, size);
        g.lineStyle(1, 0xffffff, 0.3);
        g.strokeRect(0, 0, size, size);
        g.generateTexture(key, size, size);
        g.destroy();
    }

    // Keep for legacy compatibility
    generateCircle(key, radius, color) {
        if (this.textures.exists(key)) return;
        const g = this.add.graphics();
        g.fillStyle(color, 1);
        g.fillCircle(radius, radius, radius);
        g.generateTexture(key, radius * 2, radius * 2);
        g.destroy();
    }
}
