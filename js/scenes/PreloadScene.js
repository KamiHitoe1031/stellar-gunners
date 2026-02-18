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

        // Load character sprite sheets (processed from AI-generated 4x4 grids)
        for (let i = 1; i <= 6; i++) {
            const id = `chr_0${i}`;
            this.load.spritesheet(`${id}_normal`, `assets/images/game/spritesheets/${id}_normal.png`, {
                frameWidth: 64, frameHeight: 64
            });
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

        // Key visual & title logo (optional - fallback if missing)
        this.load.image('key_visual', 'assets/images/key_visual.png');
        this.load.image('title_logo', 'assets/images/title_logo.png');

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

        // Audio - BGM
        const bgmTracks = [
            { key: 'bgm_title', path: 'assets/audio/bgm/title.wav' },
            { key: 'bgm_menu', path: 'assets/audio/bgm/menu.wav' },
            { key: 'bgm_battle', path: 'assets/audio/bgm/battle.wav' },
            { key: 'bgm_boss', path: 'assets/audio/bgm/boss.wav' },
            { key: 'bgm_result', path: 'assets/audio/bgm/result.wav' },
            { key: 'bgm_scenario', path: 'assets/audio/bgm/scenario.wav' }
        ];
        bgmTracks.forEach(t => this.load.audio(t.key, t.path));

        // Audio - SFX
        const sfxFiles = [
            { key: 'sfx_shoot', path: 'assets/audio/sfx/shoot.wav' },
            { key: 'sfx_hit', path: 'assets/audio/sfx/hit.wav' },
            { key: 'sfx_explosion', path: 'assets/audio/sfx/explosion.wav' },
            { key: 'sfx_skill', path: 'assets/audio/sfx/skill.wav' },
            { key: 'sfx_ult', path: 'assets/audio/sfx/ult.wav' },
            { key: 'sfx_dodge', path: 'assets/audio/sfx/dodge.wav' },
            { key: 'sfx_levelup', path: 'assets/audio/sfx/levelup.wav' },
            { key: 'sfx_button', path: 'assets/audio/sfx/button.wav' },
            { key: 'sfx_wave', path: 'assets/audio/sfx/wave.wav' },
            { key: 'sfx_portal', path: 'assets/audio/sfx/portal.wav' }
        ];
        sfxFiles.forEach(t => this.load.audio(t.key, t.path));

        // Don't fail on missing assets - generate placeholders as fallback
        this.load.on('loaderror', (file) => {
            console.warn(`Failed to load: ${file.key} (${file.url}) - will use placeholder`);
        });
    }

    create() {
        this.generatePlaceholderTextures();
        this.registerAnimations();
        SaveManager.initCharacters(this.cache.json.get('characters'));
        AudioManager.init(this);
        this.scene.start('TitleScene');
    }

    registerAnimations() {
        const characters = this.cache.json.get('characters');
        const enemies = this.cache.json.get('enemies');

        // Helper: check if texture is a sprite sheet with enough frames
        const hasFrames = (key, minFrames) => {
            if (!this.textures.exists(key)) return false;
            const tex = this.textures.get(key);
            return tex.frameTotal > minFrames;
        };

        // Character animations
        // AI sprite sheets: 16 frames (0-3 idle, 4-7 walk, 8-11 fire/action, 12 hit, 13-15 death)
        // Fallback procedural: 13 frames (0-2 idle, 3-6 walk, 7-8 fire, 9 hit, 10-12 death)
        characters.forEach(c => {
            const k = c.spriteKey;
            if (hasFrames(k, 15)) {
                // 16-frame AI sprite sheet
                this.anims.create({ key: `${k}_idle`, frames: this.anims.generateFrameNumbers(k, { start: 0, end: 3 }), frameRate: ANIM_FPS.idle, repeat: -1 });
                this.anims.create({ key: `${k}_walk`, frames: this.anims.generateFrameNumbers(k, { start: 4, end: 7 }), frameRate: ANIM_FPS.walk, repeat: -1 });
                this.anims.create({ key: `${k}_fire`, frames: this.anims.generateFrameNumbers(k, { start: 8, end: 10 }), frameRate: ANIM_FPS.fire, repeat: 0 });
                this.anims.create({ key: `${k}_hit`, frames: this.anims.generateFrameNumbers(k, { start: 12, end: 12 }), frameRate: ANIM_FPS.hit, repeat: 0 });
                this.anims.create({ key: `${k}_death`, frames: this.anims.generateFrameNumbers(k, { start: 13, end: 15 }), frameRate: ANIM_FPS.death, repeat: 0 });
            } else if (hasFrames(k, 12)) {
                // 13-frame procedural fallback
                this.anims.create({ key: `${k}_idle`, frames: this.anims.generateFrameNumbers(k, { start: 0, end: 2 }), frameRate: ANIM_FPS.idle, repeat: -1 });
                this.anims.create({ key: `${k}_walk`, frames: this.anims.generateFrameNumbers(k, { start: 3, end: 6 }), frameRate: ANIM_FPS.walk, repeat: -1 });
                this.anims.create({ key: `${k}_fire`, frames: this.anims.generateFrameNumbers(k, { start: 7, end: 8 }), frameRate: ANIM_FPS.fire, repeat: 0 });
                this.anims.create({ key: `${k}_hit`, frames: this.anims.generateFrameNumbers(k, { start: 9, end: 9 }), frameRate: ANIM_FPS.hit, repeat: 0 });
                this.anims.create({ key: `${k}_death`, frames: this.anims.generateFrameNumbers(k, { start: 10, end: 12 }), frameRate: ANIM_FPS.death, repeat: 0 });
            }
        });

        // Enemy animations: 8 frames (0-1 idle, 2-4 walk, 5 hit, 6-7 death)
        enemies.forEach(e => {
            const k = e.spriteKey;
            if (!hasFrames(k, 7)) return; // Need 8 frames (0-7)
            this.anims.create({ key: `${k}_idle`, frames: this.anims.generateFrameNumbers(k, { start: 0, end: 1 }), frameRate: ANIM_FPS.idle, repeat: -1 });
            this.anims.create({ key: `${k}_walk`, frames: this.anims.generateFrameNumbers(k, { start: 2, end: 4 }), frameRate: ANIM_FPS.walk, repeat: -1 });
            this.anims.create({ key: `${k}_hit`, frames: this.anims.generateFrameNumbers(k, { start: 5, end: 5 }), frameRate: ANIM_FPS.hit, repeat: 0 });
            this.anims.create({ key: `${k}_death`, frames: this.anims.generateFrameNumbers(k, { start: 6, end: 7 }), frameRate: ANIM_FPS.death, repeat: 0 });
        });
    }

    generatePlaceholderTextures() {
        const characters = this.cache.json.get('characters');
        const enemies = this.cache.json.get('enemies');

        // === Character battle sprites ===
        // Use AI-generated sprite sheets (16 frames x 64x64) if loaded,
        // otherwise fall back to procedural generation (13 frames x 48x48)
        characters.forEach(c => {
            if (this.textures.exists(c.spriteKey)) {
                const tex = this.textures.get(c.spriteKey);
                if (tex.frameTotal >= 16) {
                    // AI sprite sheet loaded successfully - keep it
                    return;
                }
                // Single image or bad load - replace with procedural
                this.textures.remove(c.spriteKey);
            }
            this.genCharSprite(c);
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

        // === Enemy battle sprites (8 frame sprite sheets) ===
        enemies.forEach(e => {
            if (this.textures.exists(e.spriteKey)) {
                this.textures.remove(e.spriteKey);
            }
            this.genEnemySprite(e);
        });

        // Default fallbacks
        if (!this.textures.exists('enemy_default')) {
            this.genSimpleRect('enemy_default', 28, 0xff4444);
        }
        if (!this.textures.exists('boss_default')) {
            this.genSimpleRect('boss_default', 72, 0xdd00dd);
        }

        // Bullet textures (glow circles) - sized for visibility
        this.genBullet('bullet_player', 8, 0xffff00);
        this.genBullet('bullet_enemy', 7, 0xff4444);
        this.genBullet('bullet_boss', 10, 0xdd44ff);

        // === Effect particle textures ===
        this.genEffectTextures();

        // === Result screen textures ===
        this.genResultTextures();

        // === Obstacle textures ===
        this.genObstacleTextures();

        // === Weapon type icons (for shop/equipment) ===
        this.genWeaponIcons();

        // === Area background textures ===
        this.genBackgroundTextures();

        // === Gallery thumbnails ===
        this.genGalleryThumbnails();

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

    // ===== Character battle sprite sheet (48x48 x 13 frames) =====
    // Frames: 0-2 idle, 3-6 walk, 7-8 fire, 9 hit, 10-12 death
    genCharSprite(charData) {
        const s = 48;
        const totalFrames = 13;
        const key = charData.spriteKey;
        if (this.textures.exists(key)) return;
        const canvas = document.createElement('canvas');
        canvas.width = s * totalFrames;
        canvas.height = s;
        const ctx = canvas.getContext('2d');
        const col = ATTRIBUTE_COLORS[charData.attribute] || 0xffffff;

        for (let f = 0; f < totalFrames; f++) {
            const ox = f * s; // x offset for this frame
            let bodyOY = 0;  // body vertical offset
            let legL = 0, legR = 0; // leg vertical offsets
            let armExtend = 0; // weapon arm extension
            let hitShift = 0; // horizontal shift for hit
            let alphaOverride = 1.0;
            let redTint = false;

            // Frame-specific modifications
            if (f <= 2) {
                // Idle: gentle bob
                bodyOY = [0, -1, 1][f];
            } else if (f <= 6) {
                // Walk: leg alternation
                const legPhase = [[-3, 3], [0, 0], [3, -3], [0, 0]][f - 3];
                legL = legPhase[0]; legR = legPhase[1];
                bodyOY = (f === 3 || f === 5) ? -1 : 0;
            } else if (f <= 8) {
                // Fire: arm extends
                armExtend = f === 7 ? 4 : 1;
            } else if (f === 9) {
                // Hit: red overlay + slight shift
                hitShift = 2;
                redTint = true;
            } else {
                // Death: progressive fade
                alphaOverride = [0.7, 0.4, 0.15][f - 10];
                bodyOY = (f - 10) * 2;
            }

            ctx.save();
            ctx.globalAlpha = alphaOverride;
            ctx.translate(ox + hitShift, 0);

            // Shadow
            ctx.fillStyle = 'rgba(0,0,0,0.25)';
            ctx.beginPath();
            ctx.ellipse(s/2, s - 3, 13, 4, 0, 0, Math.PI * 2);
            ctx.fill();

            // Legs
            ctx.fillStyle = this._darken(col, 60);
            ctx.fillRect(16, 36 + bodyOY + legL, 6, 8);
            ctx.fillRect(26, 36 + bodyOY + legR, 6, 8);

            // Body
            ctx.fillStyle = this._darken(col, 30);
            this._roundRect(ctx, 12, 18 + bodyOY, 24, 22, 4);
            ctx.fill();
            ctx.fillStyle = this._rgb(col);
            this._roundRect(ctx, 13, 19 + bodyOY, 22, 20, 3);
            ctx.fill();

            // Body highlight
            ctx.fillStyle = 'rgba(255,255,255,0.15)';
            this._roundRect(ctx, 14, 20 + bodyOY, 10, 10, 2);
            ctx.fill();

            // Body outline
            ctx.strokeStyle = 'rgba(255,255,255,0.35)';
            ctx.lineWidth = 1.2;
            this._roundRect(ctx, 12, 18 + bodyOY, 24, 22, 4);
            ctx.stroke();

            // Head
            ctx.fillStyle = this._lighten(col, 40);
            ctx.beginPath();
            ctx.arc(s/2, 13 + bodyOY, 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.4)';
            ctx.lineWidth = 1.2;
            ctx.stroke();

            // Hair highlight
            ctx.fillStyle = this._lighten(col, 70);
            ctx.beginPath();
            ctx.arc(s/2 - 2, 8 + bodyOY, 5, Math.PI, 0);
            ctx.fill();

            // Eyes
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.ellipse(s/2 - 4, 14 + bodyOY, 2.5, 3, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(s/2 + 4, 14 + bodyOY, 2.5, 3, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = f >= 10 ? '#555577' : '#222244'; // death: dim eyes
            ctx.beginPath();
            ctx.arc(s/2 - 3.5, 14.5 + bodyOY, 1.5, 0, Math.PI * 2);
            ctx.arc(s/2 + 4.5, 14.5 + bodyOY, 1.5, 0, Math.PI * 2);
            ctx.fill();
            if (f < 10) {
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(s/2 - 4.5, 13.5 + bodyOY, 0.7, 0, Math.PI * 2);
                ctx.arc(s/2 + 3.5, 13.5 + bodyOY, 0.7, 0, Math.PI * 2);
                ctx.fill();
            }

            // Weapon indicator (with arm extension for fire frames)
            const wpnColors = {
                assault_rifle: '#88aacc', pistol: '#ccaa88', shotgun: '#cc8844',
                sniper_rifle: '#44cccc', launcher: '#cc6644'
            };
            const wCol = wpnColors[charData.weaponType] || '#888888';
            ctx.fillStyle = wCol;
            ctx.fillRect(36 + armExtend, 22 + bodyOY, 8, 3);
            ctx.fillRect(37 + armExtend, 26 + bodyOY, 6, 2);
            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.fillRect(36 + armExtend, 22 + bodyOY, 8, 1);

            // Muzzle flash on fire frame 7
            if (f === 7) {
                ctx.fillStyle = 'rgba(255,255,150,0.7)';
                ctx.beginPath();
                ctx.arc(s - 2 + armExtend, 23 + bodyOY, 4, 0, Math.PI * 2);
                ctx.fill();
            }

            // Type indicator dot (bottom-right)
            const typeColors = { dps: '#ff6644', medic: '#44ff88', tank: '#4488ff', support: '#ffcc44', breaker: '#ff44aa' };
            ctx.fillStyle = typeColors[charData.type] || '#ffffff';
            ctx.beginPath();
            ctx.arc(s - 6, s - 6, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 1;
            ctx.stroke();

            // Red tint overlay for hit frame
            if (redTint) {
                ctx.globalCompositeOperation = 'source-atop';
                ctx.fillStyle = 'rgba(255,50,50,0.35)';
                ctx.fillRect(0, 0, s, s);
                ctx.globalCompositeOperation = 'source-over';
            }

            ctx.restore();
        }

        this.textures.addSpriteSheet(key, canvas, { frameWidth: s, frameHeight: s });
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

    // ===== Enemy sprite sheet (8 frames) =====
    // Frames: 0-1 idle, 2-4 walk, 5 hit, 6-7 death
    genEnemySprite(enemyData) {
        const key = enemyData.spriteKey;
        let size;
        if (enemyData.category === 'boss') size = 72;
        else if (enemyData.category === 'elite') size = 40;
        else size = 28;

        if (this.textures.exists(key)) return;
        const totalFrames = 8;
        const canvas = document.createElement('canvas');
        canvas.width = size * totalFrames;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        const attrCol = ATTRIBUTE_COLORS[enemyData.attribute] || 0xff4444;
        let baseCol;
        if (enemyData.category === 'boss') baseCol = 0xdd00dd;
        else if (enemyData.category === 'elite') baseCol = 0xff8800;
        else baseCol = attrCol;

        const fill = this._rgb(baseCol);
        const light = this._lighten(baseCol, 50);
        const dark = this._darken(baseCol, 40);

        for (let f = 0; f < totalFrames; f++) {
            const ox = f * size;
            let bodyOY = 0, scaleWobble = 0, alphaVal = 1.0, redTint = false;

            if (f <= 1) {
                bodyOY = f === 0 ? 0 : -1; // idle bob
            } else if (f <= 4) {
                bodyOY = [0, -1, 0][f - 2];
                scaleWobble = (f === 3) ? 1 : 0; // slight horizontal wobble
            } else if (f === 5) {
                redTint = true;
            } else {
                alphaVal = f === 6 ? 0.5 : 0.15;
                bodyOY = (f - 5) * 2;
            }

            ctx.save();
            ctx.globalAlpha = alphaVal;
            const cx = ox + size/2, cy = size/2;

            if (enemyData.category === 'boss') {
                this._drawBossFrame(ctx, cx, cy, size, fill, light, dark, bodyOY, redTint);
            } else if (key.includes('drone') || key.includes('swarm')) {
                this._drawDroneFrame(ctx, cx, cy, size, fill, light, bodyOY, scaleWobble, redTint);
            } else if (key.includes('turret') || key.includes('sniper')) {
                this._drawTurretFrame(ctx, cx, cy, size, fill, light, bodyOY, redTint);
            } else if (key.includes('healer')) {
                this._drawHealerFrame(ctx, cx, cy, size, fill, light, bodyOY, redTint);
            } else if (key.includes('tank') || key.includes('shield') || key.includes('elite') || key.includes('mech')) {
                this._drawDiamondFrame(ctx, cx, cy, size, fill, light, dark, bodyOY, redTint);
            } else {
                this._drawSoldierFrame(ctx, cx, cy, size, fill, light, dark, bodyOY, scaleWobble, redTint);
            }

            ctx.restore();
        }

        this.textures.addSpriteSheet(key, canvas, { frameWidth: size, frameHeight: size });
    }

    _drawBossFrame(ctx, cx, cy, size, fill, light, dark, oy, redTint) {
        const r = size/2;
        ctx.fillStyle = dark;
        ctx.shadowColor = light; ctx.shadowBlur = 8;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
            const x = cx + Math.cos(a) * (r - 4);
            const y = cy + oy + Math.sin(a) * (r - 4);
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0;
        ctx.fillStyle = fill;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
            const x = cx + Math.cos(a) * (r - 10);
            const y = cy + oy + Math.sin(a) * (r - 10);
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = light; ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
            const x = cx + Math.cos(a) * (r - 4);
            const y = cy + oy + Math.sin(a) * (r - 4);
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath(); ctx.stroke();
        ctx.fillStyle = '#ff0000'; ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(cx - 10, cy + oy - 5, 5, 0, Math.PI * 2);
        ctx.arc(cx + 10, cy + oy - 5, 5, 0, Math.PI * 2);
        ctx.fill(); ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(cx - 10, cy + oy - 5, 2, 0, Math.PI * 2);
        ctx.arc(cx + 10, cy + oy - 5, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = light;
        ctx.beginPath(); ctx.arc(cx, cy + oy + 8, 6, 0, Math.PI * 2); ctx.fill();
        if (redTint) { this._applyRedTint(ctx, cx - r, 0, size, size); }
    }

    _drawDroneFrame(ctx, cx, cy, size, fill, light, oy, wobble, redTint) {
        ctx.fillStyle = fill; ctx.shadowColor = light; ctx.shadowBlur = 3;
        ctx.beginPath();
        ctx.moveTo(cx, 2 + oy); ctx.lineTo(cx + size/2 - 3 + wobble, size - 3 + oy);
        ctx.lineTo(cx - size/2 + 3 - wobble, size - 3 + oy);
        ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0;
        ctx.strokeStyle = light; ctx.lineWidth = 1; ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(cx, cy + 3 + oy, size * 0.12, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#000000';
        ctx.beginPath(); ctx.arc(cx, cy + 3 + oy, size * 0.06, 0, Math.PI * 2); ctx.fill();
        if (redTint) { this._applyRedTint(ctx, cx - size/2, 0, size, size); }
    }

    _drawTurretFrame(ctx, cx, cy, size, fill, light, oy, redTint) {
        ctx.fillStyle = fill; ctx.shadowColor = light; ctx.shadowBlur = 3;
        this._roundRect(ctx, cx - size/2 + 4, 8 + oy, size - 8, size - 10, 3);
        ctx.fill(); ctx.shadowBlur = 0;
        ctx.fillStyle = light; ctx.fillRect(cx - 2, oy, 4, 10);
        ctx.strokeStyle = light; ctx.lineWidth = 1;
        this._roundRect(ctx, cx - size/2 + 4, 8 + oy, size - 8, size - 10, 3); ctx.stroke();
        ctx.fillStyle = '#ff4444';
        ctx.beginPath(); ctx.arc(cx, 2 + oy, 2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffffff'; ctx.fillRect(cx - 3, cy + oy, 6, 3);
        if (redTint) { this._applyRedTint(ctx, cx - size/2, 0, size, size); }
    }

    _drawHealerFrame(ctx, cx, cy, size, fill, light, oy, redTint) {
        ctx.fillStyle = fill; ctx.shadowColor = light; ctx.shadowBlur = 3;
        ctx.beginPath(); ctx.arc(cx, cy + oy, size/2 - 3, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0; ctx.strokeStyle = light; ctx.lineWidth = 1; ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cx - 2, cy + oy - 7, 4, 14);
        ctx.fillRect(cx - 7, cy + oy - 2, 14, 4);
        if (redTint) { this._applyRedTint(ctx, cx - size/2, 0, size, size); }
    }

    _drawDiamondFrame(ctx, cx, cy, size, fill, light, dark, oy, redTint) {
        const r = size/2;
        ctx.fillStyle = dark;
        ctx.beginPath();
        ctx.moveTo(cx, 3 + oy); ctx.lineTo(cx + r - 3, cy + oy);
        ctx.lineTo(cx, size - 3 + oy); ctx.lineTo(cx - r + 3, cy + oy);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = fill;
        ctx.beginPath();
        ctx.moveTo(cx, 6 + oy); ctx.lineTo(cx + r - 6, cy + oy);
        ctx.lineTo(cx, size - 6 + oy); ctx.lineTo(cx - r + 6, cy + oy);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = light; ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx, 3 + oy); ctx.lineTo(cx + r - 3, cy + oy);
        ctx.lineTo(cx, size - 3 + oy); ctx.lineTo(cx - r + 3, cy + oy);
        ctx.closePath(); ctx.stroke();
        ctx.fillStyle = light;
        ctx.beginPath(); ctx.arc(cx, cy + oy, size * 0.12, 0, Math.PI * 2); ctx.fill();
        if (redTint) { this._applyRedTint(ctx, cx - r, 0, size, size); }
    }

    _drawSoldierFrame(ctx, cx, cy, size, fill, light, dark, oy, wobble, redTint) {
        const r = size/2;
        ctx.fillStyle = dark;
        this._roundRect(ctx, cx - r + 3, 3 + oy, size - 6, size - 6, 4); ctx.fill();
        ctx.fillStyle = fill;
        this._roundRect(ctx, cx - r + 5, 5 + oy, size - 10, size - 10, 3); ctx.fill();
        ctx.strokeStyle = light; ctx.lineWidth = 1;
        this._roundRect(ctx, cx - r + 3, 3 + oy, size - 6, size - 6, 4); ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cx - 5, cy + oy - 3, 4, 4);
        ctx.fillRect(cx + 1, cy + oy - 3, 4, 4);
        ctx.fillStyle = '#000000';
        ctx.fillRect(cx - 4, cy + oy - 2, 2, 2);
        ctx.fillRect(cx + 2, cy + oy - 2, 2, 2);
        ctx.fillStyle = light; ctx.fillRect(cx - 1, 1 + oy, 2, 5);
        if (redTint) { this._applyRedTint(ctx, cx - r, 0, size, size); }
    }

    _applyRedTint(ctx, x, y, w, h) {
        ctx.save();
        ctx.globalCompositeOperation = 'source-atop';
        ctx.fillStyle = 'rgba(255,50,50,0.35)';
        ctx.fillRect(x, y, w, h);
        ctx.restore();
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

    // ===== Weapon type icons (48x48) =====
    genWeaponIcons() {
        const weapons = {
            pistol: { color: 0xccaa88, shape: 'pistol' },
            assault_rifle: { color: 0x88aacc, shape: 'rifle' },
            shotgun: { color: 0xcc8844, shape: 'shotgun' },
            sniper_rifle: { color: 0x44cccc, shape: 'sniper' },
            launcher: { color: 0xcc6644, shape: 'launcher' }
        };

        for (const [type, info] of Object.entries(weapons)) {
            const key = `wpn_icon_${type}`;
            if (this.textures.exists(key)) continue;
            const s = 48;
            const canvas = document.createElement('canvas');
            canvas.width = s; canvas.height = s;
            const ctx = canvas.getContext('2d');

            // Background circle
            ctx.fillStyle = this._rgba(info.color, 0.2);
            ctx.beginPath();
            ctx.arc(s/2, s/2, 20, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = this._rgba(info.color, 0.6);
            ctx.lineWidth = 2;
            ctx.stroke();

            // Weapon silhouette
            ctx.fillStyle = this._rgb(info.color);
            ctx.strokeStyle = this._darken(info.color, 40);
            ctx.lineWidth = 1;

            switch (info.shape) {
                case 'pistol':
                    ctx.fillRect(14, 20, 20, 5);  // barrel
                    ctx.fillRect(20, 25, 6, 10);   // grip
                    ctx.fillRect(12, 18, 6, 7);     // trigger guard
                    break;
                case 'rifle':
                    ctx.fillRect(8, 22, 32, 5);   // barrel + body
                    ctx.fillRect(22, 27, 6, 8);    // grip
                    ctx.fillRect(30, 18, 4, 4);    // sight
                    ctx.fillRect(8, 22, 3, 3);     // muzzle
                    break;
                case 'shotgun':
                    ctx.fillRect(8, 22, 30, 6);   // barrel (thicker)
                    ctx.fillRect(24, 28, 6, 8);    // grip
                    ctx.fillRect(8, 20, 6, 3);     // pump
                    break;
                case 'sniper':
                    ctx.fillRect(6, 23, 36, 4);   // long barrel
                    ctx.fillRect(24, 27, 5, 8);    // grip
                    ctx.fillRect(30, 17, 6, 6);    // scope
                    ctx.fillRect(32, 23, 2, 4);    // scope mount
                    break;
                case 'launcher':
                    ctx.fillRect(10, 18, 28, 8);  // tube
                    ctx.fillRect(22, 26, 6, 8);    // grip
                    ctx.beginPath();
                    ctx.arc(10, 22, 4, 0, Math.PI * 2);
                    ctx.fill();                     // muzzle opening
                    break;
            }

            // Weapon type label
            const labels = { pistol: 'PI', assault_rifle: 'AR', shotgun: 'SG', sniper_rifle: 'SR', launcher: 'RL' };
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 9px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(labels[type], s/2, s - 4);

            this.textures.addCanvas(key, canvas);
        }
    }

    // ===== Obstacle textures =====
    genObstacleTextures() {
        // Wall: 64x16 concrete slab
        this._genRect('obstacle_wall', 64, 16, (ctx, w, h) => {
            ctx.fillStyle = '#556677';
            ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = '#445566';
            ctx.fillRect(0, 0, w, 2);
            ctx.fillRect(0, h - 2, w, 2);
            // Cracks
            ctx.strokeStyle = 'rgba(30,30,40,0.5)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(w * 0.3, 0); ctx.lineTo(w * 0.35, h * 0.5); ctx.lineTo(w * 0.28, h);
            ctx.moveTo(w * 0.7, h); ctx.lineTo(w * 0.72, h * 0.4);
            ctx.stroke();
            // Highlight edge
            ctx.fillStyle = 'rgba(180,190,200,0.3)';
            ctx.fillRect(0, 0, w, 1);
        });

        // Barricade: 48x12 metal with warning stripes
        this._genRect('obstacle_barricade', 48, 12, (ctx, w, h) => {
            ctx.fillStyle = '#666666';
            ctx.fillRect(0, 0, w, h);
            // Warning stripes
            ctx.save();
            ctx.beginPath();
            ctx.rect(0, 0, w, h);
            ctx.clip();
            ctx.fillStyle = '#ccaa22';
            for (let i = -h; i < w + h; i += 8) {
                ctx.beginPath();
                ctx.moveTo(i, 0); ctx.lineTo(i + h, h);
                ctx.lineTo(i + h + 4, h); ctx.lineTo(i + 4, 0);
                ctx.fill();
            }
            ctx.restore();
            ctx.strokeStyle = '#444444';
            ctx.lineWidth = 1;
            ctx.strokeRect(0, 0, w, h);
        });

        // Pillar: 24x24 circular column
        this._genRect('obstacle_pillar', 24, 24, (ctx, w, h) => {
            const cx = w / 2, cy = h / 2, r = 10;
            const grad = ctx.createRadialGradient(cx - 2, cy - 2, 1, cx, cy, r);
            grad.addColorStop(0, '#889999');
            grad.addColorStop(0.7, '#556666');
            grad.addColorStop(1, '#334444');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#223333';
            ctx.lineWidth = 1;
            ctx.stroke();
        });

        // Crate: 32x32 supply box
        this._genRect('obstacle_crate', 32, 32, (ctx, w, h) => {
            ctx.fillStyle = '#665544';
            ctx.fillRect(0, 0, w, h);
            // Planks
            ctx.strokeStyle = '#554433';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, h * 0.33); ctx.lineTo(w, h * 0.33);
            ctx.moveTo(0, h * 0.66); ctx.lineTo(w, h * 0.66);
            ctx.moveTo(w * 0.5, 0); ctx.lineTo(w * 0.5, h);
            ctx.stroke();
            // Metal bands
            ctx.strokeStyle = '#888888';
            ctx.lineWidth = 2;
            ctx.strokeRect(2, 2, w - 4, h - 4);
            // Highlight
            ctx.fillStyle = 'rgba(200,180,150,0.2)';
            ctx.fillRect(0, 0, w, 2);
            ctx.fillRect(0, 0, 2, h);
        });
    }

    // ===== Area background textures (1200x900) =====
    genBackgroundTextures() {
        const W = FIELD_WIDTH, H = FIELD_HEIGHT;

        // City outdoor
        if (!this.textures.exists('bg_theme_city')) {
            this._genRect('bg_theme_city', W, H, (ctx, w, h) => {
                // Sky gradient
                const sky = ctx.createLinearGradient(0, 0, 0, h);
                sky.addColorStop(0, '#1a2030');
                sky.addColorStop(1, '#0d1018');
                ctx.fillStyle = sky;
                ctx.fillRect(0, 0, w, h);
                // Road grid
                ctx.strokeStyle = 'rgba(40,50,70,0.4)';
                ctx.lineWidth = 1;
                for (let x = 0; x <= w; x += 64) ctx.strokeRect(x, 0, 0, h);
                for (let y = 0; y <= h; y += 64) ctx.strokeRect(0, y, w, 0);
                // Building silhouettes
                ctx.fillStyle = 'rgba(20,25,35,0.8)';
                for (let i = 0; i < 12; i++) {
                    const bx = i * 100 + Math.random() * 20;
                    const bw = 40 + Math.random() * 60;
                    const bh = 80 + Math.random() * 150;
                    ctx.fillRect(bx, h - bh, bw, bh);
                    // Windows
                    ctx.fillStyle = 'rgba(80,100,130,0.3)';
                    for (let wy = h - bh + 10; wy < h - 10; wy += 20) {
                        for (let wx = bx + 5; wx < bx + bw - 5; wx += 15) {
                            ctx.fillRect(wx, wy, 8, 10);
                        }
                    }
                    ctx.fillStyle = 'rgba(20,25,35,0.8)';
                }
                // Rubble dots
                ctx.fillStyle = 'rgba(50,55,65,0.5)';
                for (let i = 0; i < 30; i++) {
                    ctx.fillRect(Math.random() * w, Math.random() * h, 3 + Math.random() * 5, 2 + Math.random() * 3);
                }
            });
        }

        // City interior
        if (!this.textures.exists('bg_theme_city_interior')) {
            this._genRect('bg_theme_city_interior', W, H, (ctx, w, h) => {
                ctx.fillStyle = '#151820';
                ctx.fillRect(0, 0, w, h);
                // Floor tiles
                ctx.strokeStyle = 'rgba(40,45,60,0.4)';
                ctx.lineWidth = 1;
                for (let x = 0; x <= w; x += 48) ctx.strokeRect(x, 0, 0, h);
                for (let y = 0; y <= h; y += 48) ctx.strokeRect(0, y, w, 0);
                // Wall segments at edges
                ctx.fillStyle = 'rgba(35,40,55,0.7)';
                ctx.fillRect(0, 0, w, 40);
                ctx.fillRect(0, h - 40, w, 40);
                // Doors/openings
                ctx.fillStyle = '#0d1018';
                ctx.fillRect(w * 0.45, 0, 80, 40);
                ctx.fillRect(w * 0.45, h - 40, 80, 40);
                // Pipes on walls
                ctx.strokeStyle = 'rgba(60,70,90,0.5)';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(0, 50); ctx.lineTo(w, 50);
                ctx.moveTo(0, h - 50); ctx.lineTo(w, h - 50);
                ctx.stroke();
                // Fluorescent light strips
                ctx.fillStyle = 'rgba(100,120,160,0.15)';
                for (let y = 100; y < h; y += 200) {
                    ctx.fillRect(0, y, w, 2);
                }
            });
        }

        // City ruins
        if (!this.textures.exists('bg_theme_city_ruins')) {
            this._genRect('bg_theme_city_ruins', W, H, (ctx, w, h) => {
                const grad = ctx.createLinearGradient(0, 0, 0, h);
                grad.addColorStop(0, '#2a1a10');
                grad.addColorStop(1, '#0d0a08');
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, w, h);
                // Cracked ground
                ctx.strokeStyle = 'rgba(60,40,30,0.4)';
                ctx.lineWidth = 1;
                for (let i = 0; i < 20; i++) {
                    ctx.beginPath();
                    ctx.moveTo(Math.random() * w, Math.random() * h);
                    ctx.lineTo(Math.random() * w, Math.random() * h);
                    ctx.stroke();
                }
                // Rubble piles
                ctx.fillStyle = 'rgba(50,40,30,0.6)';
                for (let i = 0; i < 15; i++) {
                    const rx = Math.random() * w, ry = Math.random() * h;
                    ctx.beginPath();
                    ctx.arc(rx, ry, 10 + Math.random() * 20, 0, Math.PI * 2);
                    ctx.fill();
                }
                // Orange haze
                const haze = ctx.createRadialGradient(w / 2, h / 2, 100, w / 2, h / 2, 500);
                haze.addColorStop(0, 'rgba(180,100,30,0.08)');
                haze.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = haze;
                ctx.fillRect(0, 0, w, h);
                // Grid
                ctx.strokeStyle = 'rgba(40,30,20,0.3)';
                for (let x = 0; x <= w; x += 64) ctx.strokeRect(x, 0, 0, h);
                for (let y = 0; y <= h; y += 64) ctx.strokeRect(0, y, w, 0);
            });
        }

        // Lab
        if (!this.textures.exists('bg_theme_lab')) {
            this._genRect('bg_theme_lab', W, H, (ctx, w, h) => {
                ctx.fillStyle = '#181e22';
                ctx.fillRect(0, 0, w, h);
                // Clean tile grid
                ctx.strokeStyle = 'rgba(30,80,60,0.25)';
                ctx.lineWidth = 1;
                for (let x = 0; x <= w; x += 48) ctx.strokeRect(x, 0, 0, h);
                for (let y = 0; y <= h; y += 48) ctx.strokeRect(0, y, w, 0);
                // Green accent lines
                ctx.strokeStyle = 'rgba(0,200,100,0.15)';
                ctx.lineWidth = 2;
                ctx.strokeRect(40, 40, w - 80, h - 80);
                // Equipment panels
                ctx.fillStyle = 'rgba(25,35,40,0.6)';
                for (let i = 0; i < 6; i++) {
                    const px = 80 + i * 180;
                    ctx.fillRect(px, 20, 60, 30);
                    ctx.fillRect(px, h - 50, 60, 30);
                    // LED dots
                    ctx.fillStyle = 'rgba(0,255,100,0.3)';
                    ctx.fillRect(px + 5, 28, 4, 4);
                    ctx.fillRect(px + 15, 28, 4, 4);
                    ctx.fillStyle = 'rgba(25,35,40,0.6)';
                }
            });
        }

        // Lab corridor
        if (!this.textures.exists('bg_theme_lab_corridor')) {
            this._genRect('bg_theme_lab_corridor', W, H, (ctx, w, h) => {
                ctx.fillStyle = '#121a18';
                ctx.fillRect(0, 0, w, h);
                // Corridor walls
                ctx.fillStyle = 'rgba(20,30,28,0.8)';
                ctx.fillRect(0, 0, w, 60);
                ctx.fillRect(0, h - 60, w, 60);
                // Pipe runs
                ctx.strokeStyle = 'rgba(50,80,70,0.4)';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.moveTo(0, 30); ctx.lineTo(w, 30);
                ctx.moveTo(0, h - 30); ctx.lineTo(w, h - 30);
                ctx.stroke();
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(0, 45); ctx.lineTo(w, 45);
                ctx.moveTo(0, h - 45); ctx.lineTo(w, h - 45);
                ctx.stroke();
                // Floor grid
                ctx.strokeStyle = 'rgba(30,50,45,0.3)';
                ctx.lineWidth = 1;
                for (let x = 0; x <= w; x += 64) ctx.strokeRect(x, 0, 0, h);
                for (let y = 0; y <= h; y += 64) ctx.strokeRect(0, y, w, 0);
                // Lighting circles
                ctx.fillStyle = 'rgba(80,150,120,0.06)';
                for (let x = 100; x < w; x += 200) {
                    ctx.beginPath();
                    ctx.arc(x, h / 2, 120, 0, Math.PI * 2);
                    ctx.fill();
                }
            });
        }

        // Underground
        if (!this.textures.exists('bg_theme_underground')) {
            this._genRect('bg_theme_underground', W, H, (ctx, w, h) => {
                ctx.fillStyle = '#0e0a08';
                ctx.fillRect(0, 0, w, h);
                // Rock texture noise
                ctx.fillStyle = 'rgba(40,30,20,0.3)';
                for (let i = 0; i < 200; i++) {
                    ctx.fillRect(Math.random() * w, Math.random() * h,
                                 2 + Math.random() * 6, 2 + Math.random() * 4);
                }
                // Dim light pools
                for (let i = 0; i < 4; i++) {
                    const lx = 150 + i * 250 + Math.random() * 80;
                    const ly = 200 + Math.random() * (h - 400);
                    const light = ctx.createRadialGradient(lx, ly, 10, lx, ly, 150);
                    light.addColorStop(0, 'rgba(160,120,60,0.12)');
                    light.addColorStop(1, 'rgba(0,0,0,0)');
                    ctx.fillStyle = light;
                    ctx.fillRect(0, 0, w, h);
                }
                // Stalactites (top edge)
                ctx.fillStyle = 'rgba(30,25,18,0.6)';
                for (let x = 0; x < w; x += 30 + Math.random() * 40) {
                    const sw = 6 + Math.random() * 8;
                    const sh = 15 + Math.random() * 30;
                    ctx.beginPath();
                    ctx.moveTo(x, 0); ctx.lineTo(x + sw / 2, sh); ctx.lineTo(x + sw, 0);
                    ctx.fill();
                }
                // Grid overlay
                ctx.strokeStyle = 'rgba(40,30,20,0.2)';
                ctx.lineWidth = 1;
                for (let x = 0; x <= w; x += 64) ctx.strokeRect(x, 0, 0, h);
                for (let y = 0; y <= h; y += 64) ctx.strokeRect(0, y, w, 0);
            });
        }

        // Boss arena
        if (!this.textures.exists('bg_theme_boss_arena')) {
            this._genRect('bg_theme_boss_arena', W, H, (ctx, w, h) => {
                ctx.fillStyle = '#0a0612';
                ctx.fillRect(0, 0, w, h);
                // Circular floor pattern
                const cx = w / 2, cy = h / 2;
                for (let r = 400; r > 50; r -= 50) {
                    ctx.strokeStyle = `rgba(120,40,160,${0.1 + (400 - r) / 2000})`;
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.arc(cx, cy, r, 0, Math.PI * 2);
                    ctx.stroke();
                }
                // Cross lines
                ctx.strokeStyle = 'rgba(160,40,60,0.15)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(0, cy); ctx.lineTo(w, cy);
                ctx.moveTo(cx, 0); ctx.lineTo(cx, h);
                ctx.moveTo(0, 0); ctx.lineTo(w, h);
                ctx.moveTo(w, 0); ctx.lineTo(0, h);
                ctx.stroke();
                // Core glow
                const core = ctx.createRadialGradient(cx, cy, 20, cx, cy, 300);
                core.addColorStop(0, 'rgba(200,50,100,0.15)');
                core.addColorStop(0.5, 'rgba(120,20,160,0.05)');
                core.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = core;
                ctx.fillRect(0, 0, w, h);
                // Edge vignette
                const vig = ctx.createRadialGradient(cx, cy, 200, cx, cy, 600);
                vig.addColorStop(0, 'rgba(0,0,0,0)');
                vig.addColorStop(1, 'rgba(0,0,0,0.5)');
                ctx.fillStyle = vig;
                ctx.fillRect(0, 0, w, h);
                // Grid
                ctx.strokeStyle = 'rgba(60,20,80,0.2)';
                ctx.lineWidth = 1;
                for (let x = 0; x <= w; x += 64) ctx.strokeRect(x, 0, 0, h);
                for (let y = 0; y <= h; y += 64) ctx.strokeRect(0, y, w, 0);
            });
        }
    }

    // ===== Gallery thumbnails (220x120) =====
    genGalleryThumbnails() {
        const gallery = this.cache.json.get('scenario_gallery');
        if (!gallery) return;

        const w = 220, h = 120;
        const categoryColors = {
            main_story: { bg: 0x1a2244, accent: 0x4488ff },
            character: { bg: 0x2a1a44, accent: 0xaa66ff },
            event: { bg: 0x1a3322, accent: 0x44cc88 }
        };

        gallery.forEach(entry => {
            const key = entry.thumbnailKey;
            if (!key || this.textures.exists(key)) return;

            const colors = categoryColors[entry.category] || categoryColors.main_story;
            this._genRect(key, w, h, (ctx, cw, ch) => {
                // Background gradient
                const grad = ctx.createLinearGradient(0, 0, cw, ch);
                const bgR = (colors.bg >> 16) & 0xff;
                const bgG = (colors.bg >> 8) & 0xff;
                const bgB = colors.bg & 0xff;
                grad.addColorStop(0, `rgb(${bgR},${bgG},${bgB})`);
                grad.addColorStop(1, `rgb(${Math.max(0, bgR - 10)},${Math.max(0, bgG - 10)},${Math.max(0, bgB - 10)})`);
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, cw, ch);

                // Decorative lines
                const acR = (colors.accent >> 16) & 0xff;
                const acG = (colors.accent >> 8) & 0xff;
                const acB = colors.accent & 0xff;
                ctx.strokeStyle = `rgba(${acR},${acG},${acB},0.3)`;
                ctx.lineWidth = 1;
                for (let i = 0; i < 5; i++) {
                    ctx.beginPath();
                    ctx.moveTo(0, 20 + i * 25);
                    ctx.lineTo(cw, 20 + i * 25);
                    ctx.stroke();
                }

                // Category icon
                ctx.fillStyle = `rgba(${acR},${acG},${acB},0.15)`;
                ctx.beginPath();
                ctx.arc(cw - 30, 30, 25, 0, Math.PI * 2);
                ctx.fill();

                // Category symbol
                ctx.fillStyle = `rgba(${acR},${acG},${acB},0.6)`;
                ctx.font = 'bold 20px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                const symbols = { main_story: '📖', character: '👤', event: '⭐' };
                ctx.fillText(symbols[entry.category] || '?', cw - 30, 30);

                // Sort order badge
                ctx.fillStyle = `rgba(${acR},${acG},${acB},0.5)`;
                ctx.fillRect(0, 0, 30, 24);
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 14px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(String(entry.sortOrder), 15, 12);

                // Bottom accent bar
                ctx.fillStyle = `rgba(${acR},${acG},${acB},0.4)`;
                ctx.fillRect(0, ch - 3, cw, 3);
            });
        });
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
