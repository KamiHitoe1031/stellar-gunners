class EnhanceScene extends Phaser.Scene {
    constructor() {
        super('EnhanceScene');
    }

    init() {
        this.selectedCharId = null;
    }

    create() {
        this.characters = this.cache.json.get('characters');
        this.progressionData = this.cache.json.get('progression');
        this.save = SaveManager.load();

        this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0e0e22);
        this.showCharacterList();
    }

    showCharacterList() {
        this.clearUI();
        this.save = SaveManager.load();

        this.createBackButton(() => this.scene.start('MenuScene'));

        this.add.text(GAME_WIDTH / 2, 30, 'キャラクター強化', {
            fontSize: '24px', fontFamily: 'Arial', color: '#ffffff',
            stroke: '#000000', strokeThickness: 2
        }).setOrigin(0.5);

        this.add.text(GAME_WIDTH / 2, 58, `所持クレジット: ${this.save.player.credits}`, {
            fontSize: '14px', fontFamily: 'Arial', color: '#ffcc44'
        }).setOrigin(0.5);

        this.characters.forEach((char, i) => {
            const x = 50 + (i % 3) * 245;
            const y = 90 + Math.floor(i / 3) * 200;
            this.createCharSelectCard(x, y, char);
        });
    }

    createCharSelectCard(x, y, char) {
        const color = ATTRIBUTE_COLORS[char.attribute] || 0xffffff;
        const charSave = this.save.characters[char.id] || { level: 1 };
        const level = charSave.level || 1;
        const stats = SaveManager.getCharStats(char, level);

        const bg = this.add.rectangle(x + 105, y + 75, 215, 155, 0x1a1a33, 0.9)
            .setInteractive({ useHandCursor: true })
            .setStrokeStyle(1, 0x333355);

        // Icon
        const charId = char.charId || char.id.replace('_normal', '');
        const iconKey = `icon_${charId}`;
        if (this.textures.exists(iconKey)) {
            this.add.image(x + 30, y + 40, iconKey).setDisplaySize(44, 44);
        } else {
            this.add.rectangle(x + 30, y + 40, 44, 44, color);
        }

        // Name + level
        this.add.text(x + 62, y + 15, `${char.name}`, {
            fontSize: '14px', fontFamily: 'Arial', color: '#ffffff'
        });
        this.add.text(x + 62, y + 34, `Lv.${level}`, {
            fontSize: '18px', fontFamily: 'Arial', color: '#88ccff'
        });

        // Attribute + type
        this.add.text(x + 62, y + 56, `${ATTRIBUTE_NAMES[char.attribute]} | ${TYPE_NAMES[char.type]}`, {
            fontSize: '11px', fontFamily: 'Arial', color: '#aaaaaa'
        });

        // Stats
        this.add.text(x + 15, y + 80, `HP: ${stats.hp}  ATK: ${stats.atk}`, {
            fontSize: '11px', fontFamily: 'Arial', color: '#888888'
        });
        this.add.text(x + 15, y + 96, `DEF: ${stats.def}  Shield: ${stats.shield}`, {
            fontSize: '11px', fontFamily: 'Arial', color: '#888888'
        });

        // Next level cost
        const nextData = this.progressionData.find(p => p.level === level + 1);
        if (nextData) {
            const canAfford = this.save.player.credits >= nextData.xpRequired;
            this.add.text(x + 15, y + 118, `次Lv: ${nextData.xpRequired} Credits`, {
                fontSize: '10px', fontFamily: 'Arial', color: canAfford ? '#88ff88' : '#ff6666'
            });
        } else {
            this.add.text(x + 15, y + 118, 'MAX LEVEL', {
                fontSize: '10px', fontFamily: 'Arial', color: '#ffcc00'
            });
        }

        bg.on('pointerover', () => bg.setStrokeStyle(2, 0x6688ff));
        bg.on('pointerout', () => bg.setStrokeStyle(1, 0x333355));
        bg.on('pointerdown', () => {
            this.selectedCharId = char.id;
            this.showEnhanceDetail(char);
        });
    }

    showEnhanceDetail(char) {
        this.clearUI();
        this.save = SaveManager.load();
        const charSave = this.save.characters[char.id] || { level: 1 };
        const level = charSave.level || 1;
        const currentStats = SaveManager.getCharStats(char, level);
        const nextStats = SaveManager.getCharStats(char, level + 1);
        const nextData = this.progressionData.find(p => p.level === level + 1);

        this.createBackButton(() => this.showCharacterList());

        // Character header
        const color = ATTRIBUTE_COLORS[char.attribute] || 0xffffff;
        const charId = char.charId || char.id.replace('_normal', '');
        const iconKey = `icon_${charId}`;
        if (this.textures.exists(iconKey)) {
            this.add.image(80, 60, iconKey).setDisplaySize(64, 64);
        } else {
            this.add.rectangle(80, 60, 64, 64, color);
        }

        this.add.text(130, 30, char.name, {
            fontSize: '22px', fontFamily: 'Arial', color: '#ffffff'
        });
        const rarityStr = '★'.repeat(char.rarity);
        this.add.text(130, 56, `${rarityStr}  ${ATTRIBUTE_NAMES[char.attribute]} | ${TYPE_NAMES[char.type]}`, {
            fontSize: '13px', fontFamily: 'Arial', color: '#ffcc00'
        });
        this.add.text(130, 76, `Lv. ${level}`, {
            fontSize: '20px', fontFamily: 'Arial', color: '#88ccff'
        });

        // Credits display
        this.add.text(GAME_WIDTH - 20, 30, `クレジット: ${this.save.player.credits}`, {
            fontSize: '14px', fontFamily: 'Arial', color: '#ffcc44'
        }).setOrigin(1, 0);

        // Stats panel
        this.add.rectangle(GAME_WIDTH / 2, 190, 700, 2, 0x333355);
        this.add.text(GAME_WIDTH / 2, 210, 'ステータス', {
            fontSize: '16px', fontFamily: 'Arial', color: '#cccccc'
        }).setOrigin(0.5);

        const statNames = [
            { key: 'hp', label: 'HP', growth: char.growthHp },
            { key: 'atk', label: 'ATK', growth: char.growthAtk },
            { key: 'def', label: 'DEF', growth: char.growthDef },
            { key: 'shield', label: 'Shield', growth: char.growthShield }
        ];

        statNames.forEach((stat, i) => {
            const y = 240 + i * 36;
            const leftX = 120;

            this.add.text(leftX, y, stat.label, {
                fontSize: '15px', fontFamily: 'Arial', color: '#aaaaaa'
            });

            this.add.text(leftX + 100, y, `${currentStats[stat.key]}`, {
                fontSize: '15px', fontFamily: 'Arial', color: '#ffffff'
            });

            if (nextData) {
                this.add.text(leftX + 180, y, '→', {
                    fontSize: '15px', fontFamily: 'Arial', color: '#666666'
                });
                this.add.text(leftX + 210, y, `${nextStats[stat.key]}`, {
                    fontSize: '15px', fontFamily: 'Arial', color: '#88ff88'
                });
                this.add.text(leftX + 280, y, `(+${stat.growth})`, {
                    fontSize: '12px', fontFamily: 'Arial', color: '#448844'
                });
            }
        });

        // Other stats (non-growth)
        const y2 = 240 + statNames.length * 36 + 10;
        this.add.text(120, y2, `SPD: ${char.spd}  CRIT: ${char.critRate}%  CRIT DMG: ${char.critDmg}%`, {
            fontSize: '12px', fontFamily: 'Arial', color: '#777777'
        });

        // Skills info
        const skillY = y2 + 40;
        this.add.rectangle(GAME_WIDTH / 2, skillY - 5, 700, 2, 0x333355);
        this.add.text(GAME_WIDTH / 2, skillY + 10, 'スキル', {
            fontSize: '16px', fontFamily: 'Arial', color: '#cccccc'
        }).setOrigin(0.5);

        this.add.text(80, skillY + 35, `[Q] ${char.skill1Name}`, {
            fontSize: '13px', fontFamily: 'Arial', color: '#88aaff'
        });
        this.add.text(100, skillY + 53, `${char.skill1Desc}  (CD: ${char.skill1CD}s)`, {
            fontSize: '11px', fontFamily: 'Arial', color: '#888888'
        });

        this.add.text(80, skillY + 78, `[E] ${char.skill2Name}`, {
            fontSize: '13px', fontFamily: 'Arial', color: '#88aaff'
        });
        this.add.text(100, skillY + 96, `${char.skill2Desc}  (CD: ${char.skill2CD}s)`, {
            fontSize: '11px', fontFamily: 'Arial', color: '#888888'
        });

        this.add.text(80, skillY + 121, `[P] ${char.passiveName}`, {
            fontSize: '13px', fontFamily: 'Arial', color: '#aaaa44'
        });
        this.add.text(100, skillY + 139, char.passiveDesc, {
            fontSize: '11px', fontFamily: 'Arial', color: '#888888'
        });

        // Level up button
        if (nextData) {
            const cost = nextData.xpRequired;
            const canAfford = this.save.player.credits >= cost;
            const btnColor = canAfford ? 0x2255aa : 0x444444;

            const lvUpBtn = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - 55, 280, 50, btnColor)
                .setInteractive({ useHandCursor: canAfford })
                .setStrokeStyle(2, canAfford ? 0x4488ff : 0x555555);

            this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 65, 'レベルアップ', {
                fontSize: '20px', fontFamily: 'Arial', color: canAfford ? '#ffffff' : '#888888'
            }).setOrigin(0.5);

            this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 42, `${cost} Credits`, {
                fontSize: '13px', fontFamily: 'Arial', color: canAfford ? '#ffcc44' : '#666666'
            }).setOrigin(0.5);

            if (canAfford) {
                lvUpBtn.on('pointerover', () => lvUpBtn.setFillStyle(0x3366cc));
                lvUpBtn.on('pointerout', () => lvUpBtn.setFillStyle(0x2255aa));
                lvUpBtn.on('pointerdown', () => {
                    const result = SaveManager.levelUpCharacter(char.id, this.progressionData);
                    if (result.success) {
                        this.showLevelUpEffect(result.newLevel);
                        this.time.delayedCall(600, () => this.showEnhanceDetail(char));
                    }
                });
            }
        } else {
            this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 55, '最大レベル到達!', {
                fontSize: '18px', fontFamily: 'Arial', color: '#ffcc00'
            }).setOrigin(0.5);
        }
    }

    showLevelUpEffect(newLevel) {
        const text = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, `LEVEL UP! → Lv.${newLevel}`, {
            fontSize: '28px', fontFamily: 'Arial', color: '#ffdd44',
            stroke: '#000000', strokeThickness: 4
        }).setOrigin(0.5).setDepth(200);

        this.tweens.add({
            targets: text,
            y: text.y - 60,
            alpha: 0,
            duration: 800,
            ease: 'Power2',
            onComplete: () => text.destroy()
        });
    }

    createBackButton(action) {
        const btn = this.add.text(20, 15, '< 戻る', {
            fontSize: '16px', fontFamily: 'Arial', color: '#88aacc',
            stroke: '#000000', strokeThickness: 2
        }).setInteractive({ useHandCursor: true });
        btn.on('pointerdown', action);
        btn.on('pointerover', () => btn.setColor('#bbddff'));
        btn.on('pointerout', () => btn.setColor('#88aacc'));
    }

    clearUI() {
        this.children.removeAll(true);
        this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0e0e22);
    }
}
