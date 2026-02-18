class CharacterGuideScene extends Phaser.Scene {
    constructor() {
        super('CharacterGuideScene');
    }

    init() {
        this.selectedIndex = 0;
        this.detailObjects = [];
        this.cardObjects = [];
    }

    create() {
        this.characters = this.cache.json.get('characters');
        if (!this.characters || this.characters.length === 0) {
            this.scene.start('MenuScene');
            return;
        }

        // Portrait keys for each character
        this.portraitKeys = {
            chr_01: 'portrait_chr_01_confident',
            chr_02: 'portrait_chr_02_calm',
            chr_03: 'portrait_chr_03_confident',
            chr_04: 'portrait_chr_04_cool',
            chr_05: 'portrait_chr_05_cheerful',
            chr_06: 'portrait_chr_06_focused',
        };

        // Compute max stats for relative bars
        this.maxStats = { hp: 0, atk: 0, def: 0, spd: 0, shield: 0 };
        this.characters.forEach(c => {
            if (c.hp > this.maxStats.hp) this.maxStats.hp = c.hp;
            if (c.atk > this.maxStats.atk) this.maxStats.atk = c.atk;
            if (c.def > this.maxStats.def) this.maxStats.def = c.def;
            if (c.spd > this.maxStats.spd) this.maxStats.spd = c.spd;
            if (c.shield > this.maxStats.shield) this.maxStats.shield = c.shield;
        });

        // Background
        this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0d0d20);

        // Header
        this.add.text(GAME_WIDTH / 2, 22, 'キャラクター図鑑', {
            fontSize: '22px', fontFamily: 'Arial', color: '#ffffff',
            stroke: '#000000', strokeThickness: 3
        }).setOrigin(0.5);

        // Back button
        const backBtn = this.add.text(30, 22, '← 戻る', {
            fontSize: '16px', fontFamily: 'Arial', color: '#4488ff',
            stroke: '#000000', strokeThickness: 2
        }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });
        backBtn.on('pointerdown', () => this.scene.start('MenuScene'));

        // Left panel - character list
        this.drawCharacterList();

        // Divider line
        const divG = this.add.graphics();
        divG.lineStyle(1, 0x334466, 0.5);
        divG.lineBetween(190, 50, 190, GAME_HEIGHT - 10);

        // Show first character
        this.showCharacterDetail(0);
    }

    drawCharacterList() {
        const startY = 55;
        const cardH = 82;
        const cardW = 170;
        const gap = 6;

        this.characters.forEach((char, i) => {
            const y = startY + i * (cardH + gap);

            // Card background
            const bg = this.add.rectangle(10 + cardW / 2, y + cardH / 2, cardW, cardH, 0x1a1a33)
                .setInteractive({ useHandCursor: true })
                .setStrokeStyle(1, 0x334466);
            this.cardObjects.push(bg);

            bg.on('pointerdown', () => this.showCharacterDetail(i));
            bg.on('pointerover', () => {
                if (i !== this.selectedIndex) bg.setStrokeStyle(1, 0x5577cc);
            });
            bg.on('pointerout', () => {
                if (i !== this.selectedIndex) bg.setStrokeStyle(1, 0x334466);
            });

            // Character icon
            const iconKey = `icon_${char.charId}`;
            if (this.textures.exists(iconKey)) {
                const icon = this.add.image(35, y + cardH / 2, iconKey);
                icon.setDisplaySize(44, 44);
            } else {
                const attrColor = ATTRIBUTE_COLORS[char.attribute] || 0x888888;
                const g = this.add.graphics();
                g.fillStyle(attrColor, 0.5);
                g.fillCircle(35, y + cardH / 2, 20);
            }

            // Name
            this.add.text(62, y + 12, char.name, {
                fontSize: '12px', fontFamily: 'Arial', color: '#ffffff'
            });

            // Attribute badge
            const attrColor = ATTRIBUTE_COLORS[char.attribute] || 0x888888;
            const attrName = ATTRIBUTE_NAMES[char.attribute] || char.attribute;
            const badgeG = this.add.graphics();
            badgeG.fillStyle(attrColor, 0.3);
            badgeG.fillRoundedRect(62, y + 30, 36, 16, 3);
            this.add.text(80, y + 38, attrName, {
                fontSize: '9px', fontFamily: 'Arial', color: '#ffffff'
            }).setOrigin(0.5);

            // Type badge
            const typeName = TYPE_NAMES[char.type] || char.type;
            badgeG.fillStyle(0x555555, 0.3);
            badgeG.fillRoundedRect(102, y + 30, 36, 16, 3);
            this.add.text(120, y + 38, typeName, {
                fontSize: '9px', fontFamily: 'Arial', color: '#cccccc'
            }).setOrigin(0.5);

            // Rarity stars
            const stars = '★'.repeat(char.rarity);
            this.add.text(62, y + 52, stars, {
                fontSize: '10px', fontFamily: 'Arial', color: '#ffcc44'
            });
        });
    }

    showCharacterDetail(index) {
        // Clean previous
        this.detailObjects.forEach(o => { if (o && o.destroy) o.destroy(); });
        this.detailObjects = [];

        this.selectedIndex = index;
        const char = this.characters[index];

        // Update card highlights
        this.cardObjects.forEach((bg, i) => {
            if (i === index) {
                bg.setFillStyle(0x222244, 1);
                bg.setStrokeStyle(2, 0x4488ff);
            } else {
                bg.setFillStyle(0x1a1a33, 1);
                bg.setStrokeStyle(1, 0x334466);
            }
        });

        const px = 200; // Right panel start
        const pw = GAME_WIDTH - px - 10;

        // Portrait
        const portraitKey = this.portraitKeys[char.charId];
        if (portraitKey && this.textures.exists(portraitKey)) {
            const portrait = this.add.image(px + 100, 290, portraitKey);
            // Scale to fit height ~420px
            const tex = this.textures.get(portraitKey);
            const frame = tex.getSourceImage();
            const scale = 420 / frame.height;
            portrait.setScale(scale);
            portrait.setAlpha(0.9);
            this.detailObjects.push(portrait);
        }

        // Right side info
        const infoX = px + 210;
        const infoY = 55;

        // Name
        const nameText = this._dt(infoX, infoY, char.name, {
            fontSize: '20px', color: '#ffffff'
        });

        // Rarity + Attribute + Type
        const attrName = ATTRIBUTE_NAMES[char.attribute] || char.attribute;
        const typeName = TYPE_NAMES[char.type] || char.type;
        const stars = '★'.repeat(char.rarity);
        this._dt(infoX, infoY + 28, `${stars}  ${attrName} / ${typeName}`, {
            fontSize: '13px', color: '#ffcc44'
        });

        // Weapon
        const weaponNames = {
            pistol: 'ピストル', assault_rifle: 'アサルトライフル',
            shotgun: 'ショットガン', sniper_rifle: 'スナイパーライフル',
            launcher: 'ランチャー'
        };
        this._dt(infoX, infoY + 50, `武器: ${weaponNames[char.weaponType] || char.weaponType}`, {
            fontSize: '12px', color: '#aaaaaa'
        });

        // Stat bars
        const statsStartY = infoY + 80;
        const stats = [
            { label: 'HP', value: char.hp, max: this.maxStats.hp, color: 0x44ff44 },
            { label: 'ATK', value: char.atk, max: this.maxStats.atk, color: 0xff6644 },
            { label: 'DEF', value: char.def, max: this.maxStats.def, color: 0x4488ff },
            { label: 'SPD', value: char.spd, max: this.maxStats.spd, color: 0xffcc44 },
            { label: 'Shield', value: char.shield, max: this.maxStats.shield, color: 0x44ccff },
        ];

        const barMaxW = 160;
        stats.forEach((s, i) => {
            const sy = statsStartY + i * 24;
            this._dt(infoX, sy, s.label, { fontSize: '11px', color: '#888888' });

            const g = this.add.graphics();
            this.detailObjects.push(g);
            g.fillStyle(0x222244, 1);
            g.fillRoundedRect(infoX + 50, sy + 2, barMaxW, 12, 3);
            const ratio = s.value / s.max;
            g.fillStyle(s.color, 0.7);
            g.fillRoundedRect(infoX + 50, sy + 2, barMaxW * ratio, 12, 3);

            this._dt(infoX + 50 + barMaxW + 8, sy, `${s.value}`, {
                fontSize: '11px', color: '#ffffff'
            });
        });

        // CRIT
        this._dt(infoX, statsStartY + stats.length * 24, `CRIT: ${char.critRate}% / ${char.critDmg}%`, {
            fontSize: '11px', color: '#ff88cc'
        });

        // Separator
        const sepY = statsStartY + stats.length * 24 + 25;
        const sepG = this.add.graphics();
        this.detailObjects.push(sepG);
        sepG.lineStyle(1, 0x334466, 0.5);
        sepG.lineBetween(infoX, sepY, infoX + pw - 20, sepY);

        // Skills section
        const skillY = sepY + 10;
        const skillData = [
            {
                key: 'Q', name: char.skill1Name, desc: char.skill1Desc,
                cd: char.skill1CD, color: '#4488ff'
            },
            {
                key: 'E', name: char.skill2Name, desc: char.skill2Desc,
                cd: char.skill2CD, color: '#44cc88'
            },
            {
                key: 'R', name: char.ultName, desc: char.ultDesc,
                cd: null, color: '#ffcc00', isUlt: true
            },
        ];

        skillData.forEach((sk, i) => {
            const sy = skillY + i * 52;

            // Key badge
            const kg = this.add.graphics();
            this.detailObjects.push(kg);
            kg.fillStyle(0x2a2a44, 1);
            kg.fillRoundedRect(infoX, sy, 24, 20, 4);
            this._dt(infoX + 12, sy + 10, sk.key, {
                fontSize: '11px', color: sk.color, origin: [0.5, 0.5]
            });

            // Skill name
            const cdText = sk.isUlt ? '(ULT)' : `[CD:${sk.cd}s]`;
            this._dt(infoX + 30, sy, `${sk.name} ${cdText}`, {
                fontSize: '12px', color: '#ffffff'
            });

            // Description
            this._dt(infoX + 30, sy + 18, sk.desc, {
                fontSize: '10px', color: '#999999', wordWrap: pw - 50
            });
        });

        // Passive
        const passiveY = skillY + skillData.length * 52 + 5;
        const pg = this.add.graphics();
        this.detailObjects.push(pg);
        pg.fillStyle(0x1a2233, 0.8);
        pg.fillRoundedRect(infoX, passiveY, pw - 20, 40, 5);
        this._dt(infoX + 8, passiveY + 5, `パッシブ: ${char.passiveName}`, {
            fontSize: '11px', color: '#88ccff'
        });
        this._dt(infoX + 8, passiveY + 22, char.passiveDesc, {
            fontSize: '10px', color: '#999999'
        });
    }

    _dt(x, y, text, style = {}) {
        const t = this.add.text(x, y, text, {
            fontSize: style.fontSize || '13px',
            fontFamily: 'Arial',
            color: style.color || '#cccccc',
            stroke: '#000000',
            strokeThickness: style.strokeThickness || 1,
            wordWrap: style.wordWrap ? { width: style.wordWrap } : undefined,
            lineSpacing: 2,
        });
        if (style.origin) t.setOrigin(...style.origin);
        this.detailObjects.push(t);
        return t;
    }
}
