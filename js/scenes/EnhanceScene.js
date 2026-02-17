class EnhanceScene extends Phaser.Scene {
    constructor() {
        super('EnhanceScene');
    }

    init() {
        this.selectedCharId = null;
        this.currentTab = 'character';
    }

    create() {
        this.characters = this.cache.json.get('characters');
        this.weaponsData = this.cache.json.get('weapons');
        this.progressionData = this.cache.json.get('progression');
        this.save = SaveManager.load();

        this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0e0e22);
        this.showMain();
    }

    showMain() {
        this.clearUI();
        this.save = SaveManager.load();

        this.createBackButton(() => this.scene.start('MenuScene'));

        this.add.text(GAME_WIDTH / 2, 28, '強化', {
            fontSize: '24px', fontFamily: 'Arial', color: '#ffffff',
            stroke: '#000000', strokeThickness: 2
        }).setOrigin(0.5);

        // Currency
        this.add.text(GAME_WIDTH - 20, 15, `クレジット: ${this.save.player.credits}`, {
            fontSize: '13px', fontFamily: 'Arial', color: '#ffcc44'
        }).setOrigin(1, 0);

        // Tabs
        const tabs = [
            { key: 'character', label: 'キャラ強化' },
            { key: 'weapon', label: '武器強化' }
        ];
        tabs.forEach((tab, i) => {
            const tx = 130 + i * 150;
            const isActive = this.currentTab === tab.key;
            const tabBg = this.add.rectangle(tx, 62, 130, 28, isActive ? 0x2244aa : 0x1a1a33)
                .setInteractive({ useHandCursor: true })
                .setStrokeStyle(1, isActive ? 0x4488ff : 0x333355);
            this.add.text(tx, 62, tab.label, {
                fontSize: '13px', fontFamily: 'Arial', color: isActive ? '#ffffff' : '#888888'
            }).setOrigin(0.5);
            tabBg.on('pointerdown', () => {
                this.currentTab = tab.key;
                this.showMain();
            });
        });

        if (this.currentTab === 'character') {
            this.showCharacterList();
        } else {
            this.showWeaponList();
        }
    }

    // ===== CHARACTER TAB =====
    showCharacterList() {
        this.characters.forEach((char, i) => {
            const x = 50 + (i % 3) * 245;
            const y = 90 + Math.floor(i / 3) * 190;
            this.createCharSelectCard(x, y, char);
        });
    }

    createCharSelectCard(x, y, char) {
        const color = ATTRIBUTE_COLORS[char.attribute] || 0xffffff;
        const charSave = this.save.characters[char.id] || { level: 1, breakthroughCount: 0 };
        const level = charSave.level || 1;
        const bt = charSave.breakthroughCount || 0;
        const stats = SaveManager.getCharStats(char, level);

        const bg = this.add.rectangle(x + 105, y + 72, 215, 145, 0x1a1a33, 0.9)
            .setInteractive({ useHandCursor: true })
            .setStrokeStyle(1, 0x333355);

        const charId = char.charId || char.id.replace('_normal', '');
        const iconKey = `icon_${charId}`;
        if (this.textures.exists(iconKey)) {
            this.add.image(x + 30, y + 38, iconKey).setDisplaySize(44, 44);
        } else {
            this.add.rectangle(x + 30, y + 38, 44, 44, color);
        }

        this.add.text(x + 62, y + 12, char.name, {
            fontSize: '14px', fontFamily: 'Arial', color: '#ffffff'
        });
        this.add.text(x + 62, y + 30, `Lv.${level}`, {
            fontSize: '18px', fontFamily: 'Arial', color: '#88ccff'
        });
        if (bt > 0) {
            this.add.text(x + 130, y + 32, `突破+${bt}`, {
                fontSize: '12px', fontFamily: 'Arial', color: '#ff8844'
            });
        }

        this.add.text(x + 62, y + 52, `${ATTRIBUTE_NAMES[char.attribute]} | ${TYPE_NAMES[char.type]}`, {
            fontSize: '11px', fontFamily: 'Arial', color: '#aaaaaa'
        });

        this.add.text(x + 15, y + 74, `HP:${stats.hp} ATK:${stats.atk} DEF:${stats.def}`, {
            fontSize: '11px', fontFamily: 'Arial', color: '#888888'
        });
        this.add.text(x + 15, y + 90, `Shield:${stats.shield} CRIT:${char.critRate}%`, {
            fontSize: '11px', fontFamily: 'Arial', color: '#888888'
        });

        const nextData = this.progressionData.find(p => p.level === level + 1);
        if (nextData) {
            this.add.text(x + 15, y + 110, `次Lv: ${nextData.xpRequired} Cr`, {
                fontSize: '10px', fontFamily: 'Arial',
                color: this.save.player.credits >= nextData.xpRequired ? '#88ff88' : '#ff6666'
            });
        } else {
            this.add.text(x + 15, y + 110, 'MAX LEVEL', {
                fontSize: '10px', fontFamily: 'Arial', color: '#ffcc00'
            });
        }

        bg.on('pointerover', () => bg.setStrokeStyle(2, 0x6688ff));
        bg.on('pointerout', () => bg.setStrokeStyle(1, 0x333355));
        bg.on('pointerdown', () => this.showCharDetail(char));
    }

    showCharDetail(char) {
        this.clearUI();
        this.save = SaveManager.load();
        const charSave = this.save.characters[char.id] || { level: 1, breakthroughCount: 0 };
        const level = charSave.level || 1;
        const bt = charSave.breakthroughCount || 0;
        const currentStats = SaveManager.getCharStats(char, level);
        const nextStats = SaveManager.getCharStats(char, level + 1);
        const nextData = this.progressionData.find(p => p.level === level + 1);

        this.createBackButton(() => this.showMain());

        // Header
        const color = ATTRIBUTE_COLORS[char.attribute] || 0xffffff;
        const charId = char.charId || char.id.replace('_normal', '');
        const iconKey = `icon_${charId}`;
        if (this.textures.exists(iconKey)) {
            this.add.image(75, 55, iconKey).setDisplaySize(56, 56);
        } else {
            this.add.rectangle(75, 55, 56, 56, color);
        }

        this.add.text(120, 28, char.name, {
            fontSize: '20px', fontFamily: 'Arial', color: '#ffffff'
        });
        const rarityStr = '★'.repeat(char.rarity);
        this.add.text(120, 52, `${rarityStr}  ${ATTRIBUTE_NAMES[char.attribute]} | ${TYPE_NAMES[char.type]}`, {
            fontSize: '12px', fontFamily: 'Arial', color: '#ffcc00'
        });
        this.add.text(120, 70, `Lv.${level}${bt > 0 ? `  突破+${bt}` : ''}`, {
            fontSize: '16px', fontFamily: 'Arial', color: '#88ccff'
        });

        this.add.text(GAME_WIDTH - 20, 28, `クレジット: ${this.save.player.credits}`, {
            fontSize: '13px', fontFamily: 'Arial', color: '#ffcc44'
        }).setOrigin(1, 0);

        // Stats
        this.add.rectangle(GAME_WIDTH / 2, 100, 700, 2, 0x333355);
        const statNames = [
            { key: 'hp', label: 'HP', growth: char.growthHp },
            { key: 'atk', label: 'ATK', growth: char.growthAtk },
            { key: 'def', label: 'DEF', growth: char.growthDef },
            { key: 'shield', label: 'Shield', growth: char.growthShield }
        ];

        statNames.forEach((stat, i) => {
            const y = 115 + i * 28;
            this.add.text(80, y, stat.label, {
                fontSize: '14px', fontFamily: 'Arial', color: '#aaaaaa'
            });
            this.add.text(160, y, `${currentStats[stat.key]}`, {
                fontSize: '14px', fontFamily: 'Arial', color: '#ffffff'
            });
            if (nextData) {
                this.add.text(230, y, `→ ${nextStats[stat.key]}`, {
                    fontSize: '14px', fontFamily: 'Arial', color: '#88ff88'
                });
                this.add.text(320, y, `(+${stat.growth})`, {
                    fontSize: '11px', fontFamily: 'Arial', color: '#448844'
                });
            }
        });

        this.add.text(80, 230, `SPD: ${char.spd}  CRIT: ${char.critRate}%  CRIT DMG: ${char.critDmg}%`, {
            fontSize: '11px', fontFamily: 'Arial', color: '#777777'
        });

        // Skills
        this.add.rectangle(GAME_WIDTH / 2, 255, 700, 2, 0x333355);
        this.add.text(80, 268, `[Q] ${char.skill1Name} - ${char.skill1Desc}`, {
            fontSize: '11px', fontFamily: 'Arial', color: '#88aaff',
            wordWrap: { width: 640 }
        });
        this.add.text(80, 293, `[E] ${char.skill2Name} - ${char.skill2Desc}`, {
            fontSize: '11px', fontFamily: 'Arial', color: '#88aaff',
            wordWrap: { width: 640 }
        });
        this.add.text(80, 318, `[P] ${char.passiveName} - ${char.passiveDesc}`, {
            fontSize: '11px', fontFamily: 'Arial', color: '#aaaa44',
            wordWrap: { width: 640 }
        });

        // Action buttons
        this.add.rectangle(GAME_WIDTH / 2, 365, 700, 2, 0x333355);

        // Level Up button
        if (nextData) {
            const cost = nextData.xpRequired;
            const canAfford = this.save.player.credits >= cost;
            const lvBtn = this.add.rectangle(GAME_WIDTH / 2 - 140, 420, 240, 50, canAfford ? 0x2255aa : 0x333333)
                .setInteractive({ useHandCursor: canAfford })
                .setStrokeStyle(2, canAfford ? 0x4488ff : 0x444444);
            this.add.text(GAME_WIDTH / 2 - 140, 410, 'レベルアップ', {
                fontSize: '18px', fontFamily: 'Arial', color: canAfford ? '#ffffff' : '#888888'
            }).setOrigin(0.5);
            this.add.text(GAME_WIDTH / 2 - 140, 432, `${cost} Credits`, {
                fontSize: '12px', fontFamily: 'Arial', color: canAfford ? '#ffcc44' : '#666666'
            }).setOrigin(0.5);

            if (canAfford) {
                lvBtn.on('pointerover', () => lvBtn.setFillStyle(0x3366cc));
                lvBtn.on('pointerout', () => lvBtn.setFillStyle(0x2255aa));
                lvBtn.on('pointerdown', () => {
                    const result = SaveManager.levelUpCharacter(char.id, this.progressionData);
                    if (result.success) {
                        this.showLevelUpEffect(result.newLevel);
                        this.time.delayedCall(600, () => this.showCharDetail(char));
                    }
                });
            }
        } else {
            this.add.text(GAME_WIDTH / 2 - 140, 420, 'MAX LEVEL', {
                fontSize: '16px', fontFamily: 'Arial', color: '#ffcc00'
            }).setOrigin(0.5);
        }

        // Breakthrough button
        const btCost = (bt + 1) * 500;
        const maxBt = 6;
        const canBt = bt < maxBt && this.save.player.credits >= btCost;

        const btBtn = this.add.rectangle(GAME_WIDTH / 2 + 140, 420, 240, 50, canBt ? 0x553322 : 0x333333)
            .setInteractive({ useHandCursor: canBt })
            .setStrokeStyle(2, canBt ? 0xff8844 : 0x444444);

        if (bt < maxBt) {
            this.add.text(GAME_WIDTH / 2 + 140, 410, `限界突破 (${bt}/${maxBt})`, {
                fontSize: '16px', fontFamily: 'Arial', color: canBt ? '#ffffff' : '#888888'
            }).setOrigin(0.5);
            this.add.text(GAME_WIDTH / 2 + 140, 432, `${btCost} Credits  全ステ+5%`, {
                fontSize: '11px', fontFamily: 'Arial', color: canBt ? '#ff8844' : '#666666'
            }).setOrigin(0.5);

            if (canBt) {
                btBtn.on('pointerover', () => btBtn.setFillStyle(0x664433));
                btBtn.on('pointerout', () => btBtn.setFillStyle(0x553322));
                btBtn.on('pointerdown', () => {
                    const save = SaveManager.load();
                    if (save.player.credits < btCost) return;
                    save.player.credits -= btCost;
                    if (!save.characters[char.id]) {
                        save.characters[char.id] = { level: 1, exp: 0, breakthroughCount: 0, awakening: 0 };
                    }
                    save.characters[char.id].breakthroughCount = (save.characters[char.id].breakthroughCount || 0) + 1;
                    SaveManager.save(save);
                    this.showBreakthroughEffect(save.characters[char.id].breakthroughCount);
                    this.time.delayedCall(800, () => this.showCharDetail(char));
                });
            }
        } else {
            this.add.text(GAME_WIDTH / 2 + 140, 420, '限界突破 MAX', {
                fontSize: '16px', fontFamily: 'Arial', color: '#ff8844'
            }).setOrigin(0.5);
        }
    }

    // ===== WEAPON TAB =====
    showWeaponList() {
        const ownedWeapons = EquipmentSystem.getOwnedWeapons(this.save, this.weaponsData);

        if (ownedWeapons.length === 0) {
            this.add.text(GAME_WIDTH / 2, 200, '武器を所持していません\nショップで購入できます', {
                fontSize: '16px', fontFamily: 'Arial', color: '#666666',
                align: 'center'
            }).setOrigin(0.5);
            return;
        }

        ownedWeapons.forEach((wpn, i) => {
            const y = 95 + i * 55;
            if (y > GAME_HEIGHT - 50) return;

            const rarityColors = { 1: 0x666666, 2: 0x2255aa, 3: 0x8844cc, 4: 0xcc8800 };
            const borderColor = rarityColors[wpn.def.rarity] || 0x333355;

            const bg = this.add.rectangle(GAME_WIDTH / 2, y + 20, 700, 46, 0x1a1a33, 0.9)
                .setInteractive({ useHandCursor: true })
                .setStrokeStyle(1, borderColor);

            this.add.rectangle(55, y + 20, 5, 38, borderColor);

            const stars = '★'.repeat(wpn.def.rarity);
            this.add.text(70, y + 8, `${stars} ${wpn.def.name}`, {
                fontSize: '14px', fontFamily: 'Arial', color: '#ffffff'
            });
            this.add.text(70, y + 26, `Lv.${wpn.level || 1}  ATK+${wpn.def.mainAtk}  ${wpn.def.weaponType}`, {
                fontSize: '11px', fontFamily: 'Arial', color: '#aaaaaa'
            });

            // Level up button
            const wpnLvCost = (wpn.level || 1) * 100;
            const maxLv = wpn.def.maxLevel || 20;
            const canLvUp = (wpn.level || 1) < maxLv && this.save.player.credits >= wpnLvCost;

            const lvBtn = this.add.rectangle(GAME_WIDTH - 100, y + 20, 110, 34, canLvUp ? 0x225533 : 0x222222)
                .setInteractive({ useHandCursor: canLvUp })
                .setStrokeStyle(1, canLvUp ? 0x44aa66 : 0x333333);

            if ((wpn.level || 1) < maxLv) {
                this.add.text(GAME_WIDTH - 100, y + 12, '強化', {
                    fontSize: '12px', fontFamily: 'Arial', color: canLvUp ? '#ffffff' : '#666666'
                }).setOrigin(0.5);
                this.add.text(GAME_WIDTH - 100, y + 27, `${wpnLvCost} Cr`, {
                    fontSize: '10px', fontFamily: 'Arial', color: canLvUp ? '#ffcc44' : '#555555'
                }).setOrigin(0.5);

                if (canLvUp) {
                    lvBtn.on('pointerover', () => lvBtn.setFillStyle(0x336644));
                    lvBtn.on('pointerout', () => lvBtn.setFillStyle(0x225533));
                    lvBtn.on('pointerdown', () => {
                        const save = SaveManager.load();
                        if (save.player.credits < wpnLvCost) return;
                        save.player.credits -= wpnLvCost;
                        save.weapons[wpn.instanceId].level = (save.weapons[wpn.instanceId].level || 1) + 1;
                        SaveManager.save(save);
                        this.showLevelUpEffect(save.weapons[wpn.instanceId].level);
                        this.time.delayedCall(600, () => this.showMain());
                    });
                }
            } else {
                this.add.text(GAME_WIDTH - 100, y + 20, 'MAX', {
                    fontSize: '12px', fontFamily: 'Arial', color: '#ffcc00'
                }).setOrigin(0.5);
            }
        });
    }

    showLevelUpEffect(newLevel) {
        const text = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, `LEVEL UP! → Lv.${newLevel}`, {
            fontSize: '28px', fontFamily: 'Arial', color: '#ffdd44',
            stroke: '#000000', strokeThickness: 4
        }).setOrigin(0.5).setDepth(200);

        this.tweens.add({
            targets: text, y: text.y - 60, alpha: 0,
            duration: 800, ease: 'Power2',
            onComplete: () => text.destroy()
        });
    }

    showBreakthroughEffect(count) {
        const text = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, `限界突破! +${count}`, {
            fontSize: '28px', fontFamily: 'Arial', color: '#ff8844',
            stroke: '#000000', strokeThickness: 4
        }).setOrigin(0.5).setDepth(200);

        this.tweens.add({
            targets: text, y: text.y - 60, alpha: 0,
            duration: 1000, ease: 'Power2',
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
