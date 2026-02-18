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
        this.partsData = this.cache.json.get('weapon_parts') || [];
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
            { key: 'weapon', label: '武器強化' },
            { key: 'parts', label: '武器改造' },
            { key: 'awakening', label: '覚醒' },
            { key: 'synchro', label: 'シンクロ' }
        ];
        tabs.forEach((tab, i) => {
            const tx = 80 + i * 105;
            const isActive = this.currentTab === tab.key;
            const tabBg = this.add.rectangle(tx, 62, 100, 28, isActive ? 0x2244aa : 0x1a1a33)
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
        } else if (this.currentTab === 'weapon') {
            this.showWeaponList();
        } else if (this.currentTab === 'parts') {
            this.showPartsTab();
        } else if (this.currentTab === 'awakening') {
            this.showAwakeningTab();
        } else if (this.currentTab === 'synchro') {
            this.showSynchroTab();
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

    // ===== WEAPON PARTS TAB =====
    showPartsTab() {
        const ownedWeapons = EquipmentSystem.getOwnedWeapons(this.save, this.weaponsData);

        if (ownedWeapons.length === 0) {
            this.add.text(GAME_WIDTH / 2, 200, '武器を所持していません', {
                fontSize: '16px', fontFamily: 'Arial', color: '#666666'
            }).setOrigin(0.5);
            return;
        }

        this.add.text(50, 88, '武器を選択して部品を装着:', {
            fontSize: '13px', fontFamily: 'Arial', color: '#cccccc'
        });

        ownedWeapons.forEach((wpn, i) => {
            const y = 115 + i * 45;
            if (y > GAME_HEIGHT - 80) return;

            const stars = '★'.repeat(wpn.def.rarity);
            const bg = this.add.rectangle(GAME_WIDTH / 2, y + 15, 700, 38, 0x1a1a33, 0.9)
                .setInteractive({ useHandCursor: true })
                .setStrokeStyle(1, 0x333355);

            this.add.text(70, y + 5, `${stars} ${wpn.def.name}`, {
                fontSize: '13px', fontFamily: 'Arial', color: '#ffffff'
            });
            this.add.text(70, y + 21, `Lv.${wpn.level || 1}  ${wpn.def.weaponType}`, {
                fontSize: '10px', fontFamily: 'Arial', color: '#aaaaaa'
            });

            // Show equipped parts count
            const parts = EquipmentSystem.getWeaponParts(wpn.instanceId, this.save);
            const equipped = ['barrel', 'magazine', 'scope', 'stock'].filter(s => parts[s]).length;
            this.add.text(GAME_WIDTH - 70, y + 15, `${equipped}/4`, {
                fontSize: '12px', fontFamily: 'Arial', color: equipped > 0 ? '#88ccff' : '#555555'
            }).setOrigin(0.5);

            bg.on('pointerover', () => bg.setStrokeStyle(2, 0x6688ff));
            bg.on('pointerout', () => bg.setStrokeStyle(1, 0x333355));
            bg.on('pointerdown', () => this.showWeaponPartDetail(wpn));
        });
    }

    showWeaponPartDetail(wpn) {
        this.clearUI();
        this.save = SaveManager.load();
        this.createBackButton(() => this.showMain());

        const stars = '★'.repeat(wpn.def.rarity);
        this.add.text(GAME_WIDTH / 2, 28, `${stars} ${wpn.def.name} - 部品装着`, {
            fontSize: '18px', fontFamily: 'Arial', color: '#ffffff',
            stroke: '#000000', strokeThickness: 2
        }).setOrigin(0.5);

        this.add.text(GAME_WIDTH - 20, 15, `クレジット: ${this.save.player.credits}`, {
            fontSize: '13px', fontFamily: 'Arial', color: '#ffcc44'
        }).setOrigin(1, 0);

        const slots = ['barrel', 'magazine', 'scope', 'stock'];
        const slotNames = { barrel: 'バレル', magazine: 'マガジン', scope: 'スコープ', stock: 'ストック' };
        const slotIcons = { barrel: '║', magazine: '▬', scope: '◎', stock: '╠' };
        const parts = EquipmentSystem.getWeaponParts(wpn.instanceId, this.save);
        const ownedPartIds = EquipmentSystem.getOwnedParts(this.save);

        slots.forEach((slot, i) => {
            const y = 75 + i * 120;
            const equippedPartId = parts[slot];
            const equippedPart = equippedPartId ? this.partsData.find(p => p.id === equippedPartId) : null;

            // Slot header
            this.add.rectangle(GAME_WIDTH / 2, y + 10, 700, 30, 0x1a2233, 0.9)
                .setStrokeStyle(1, 0x334466);
            this.add.text(60, y + 3, `${slotIcons[slot]} ${slotNames[slot]}`, {
                fontSize: '14px', fontFamily: 'Arial', color: '#88aacc'
            });

            if (equippedPart) {
                // Show equipped part
                const qualColor = equippedPart.quality === 'high' ? '#ffcc00' : '#ffffff';
                this.add.text(200, y + 3, `装着: ${equippedPart.name}`, {
                    fontSize: '13px', fontFamily: 'Arial', color: qualColor
                });
                this.add.text(400, y + 3, `${equippedPart.mainEffect} +${equippedPart.mainValue}%`, {
                    fontSize: '11px', fontFamily: 'Arial', color: '#88ff88'
                });
                if (equippedPart.specialTrait) {
                    this.add.text(540, y + 3, equippedPart.specialTrait, {
                        fontSize: '10px', fontFamily: 'Arial', color: '#ffaa44'
                    });
                }

                // Detach button
                const detachBtn = this.add.text(GAME_WIDTH - 60, y + 10, '[外す]', {
                    fontSize: '11px', fontFamily: 'Arial', color: '#ff6666'
                }).setOrigin(0.5).setInteractive({ useHandCursor: true });
                detachBtn.on('pointerdown', () => {
                    EquipmentSystem.detachPart(wpn.instanceId, slot);
                    this.showWeaponPartDetail(wpn);
                });
            } else {
                this.add.text(200, y + 3, '未装着', {
                    fontSize: '13px', fontFamily: 'Arial', color: '#555555'
                });
            }

            // Compatible parts list
            const compatible = this.partsData.filter(p => {
                if (p.slotType !== slot) return false;
                if (p.weaponTypeRestrict && p.weaponTypeRestrict !== '' && p.weaponTypeRestrict !== wpn.def.weaponType) return false;
                return ownedPartIds.includes(p.id);
            });

            compatible.forEach((part, j) => {
                if (j > 2) return; // Max 3 per slot to prevent overflow
                const py = y + 35 + j * 24;
                const isEquipped = equippedPartId === part.id;
                const qualColor = part.quality === 'high' ? 0x443311 : 0x1a1a2e;

                const partBg = this.add.rectangle(GAME_WIDTH / 2, py, 640, 20, qualColor)
                    .setInteractive({ useHandCursor: !isEquipped })
                    .setStrokeStyle(1, isEquipped ? 0x4488ff : 0x222233);

                const qLabel = part.quality === 'high' ? '★ ' : '';
                this.add.text(100, py - 6, `${qLabel}${part.name}`, {
                    fontSize: '11px', fontFamily: 'Arial', color: isEquipped ? '#88ccff' : '#cccccc'
                });
                this.add.text(300, py - 6, `${part.mainEffect}+${part.mainValue}%`, {
                    fontSize: '10px', fontFamily: 'Arial', color: '#88ff88'
                });
                if (part.specialTrait) {
                    this.add.text(440, py - 6, part.specialTrait, {
                        fontSize: '10px', fontFamily: 'Arial', color: '#ffaa44'
                    });
                }

                if (!isEquipped) {
                    partBg.on('pointerover', () => partBg.setStrokeStyle(1, 0x6688ff));
                    partBg.on('pointerout', () => partBg.setStrokeStyle(1, 0x222233));
                    partBg.on('pointerdown', () => {
                        EquipmentSystem.attachPart(wpn.instanceId, slot, part.id);
                        this.showWeaponPartDetail(wpn);
                    });
                }
            });

            if (compatible.length === 0 && !equippedPart) {
                this.add.text(100, y + 38, '対応部品なし (ショップ/ドロップで入手)', {
                    fontSize: '10px', fontFamily: 'Arial', color: '#444444'
                });
            }
        });
    }

    // ===== AWAKENING TAB =====
    showAwakeningTab() {
        this.add.text(50, 88, 'キャラクターを選択して覚醒:', {
            fontSize: '13px', fontFamily: 'Arial', color: '#cccccc'
        });

        this.characters.forEach((char, i) => {
            const x = 50 + (i % 3) * 245;
            const y = 115 + Math.floor(i / 3) * 90;
            this.createAwakeningCard(x, y, char);
        });
    }

    createAwakeningCard(x, y, char) {
        const color = ATTRIBUTE_COLORS[char.attribute] || 0xffffff;
        const charSave = this.save.characters[char.id] || { level: 1, awakening: 0 };
        const awakening = charSave.awakening || 0;
        const maxAwakening = 5;

        const bg = this.add.rectangle(x + 105, y + 30, 215, 60, 0x1a1a33, 0.9)
            .setStrokeStyle(1, awakening > 0 ? 0x664422 : 0x333355);

        const charId = char.charId || char.id.replace('_normal', '');
        const iconKey = `icon_${charId}`;
        if (this.textures.exists(iconKey)) {
            this.add.image(x + 30, y + 30, iconKey).setDisplaySize(36, 36);
        } else {
            this.add.rectangle(x + 30, y + 30, 36, 36, color);
        }

        this.add.text(x + 55, y + 12, char.name, {
            fontSize: '13px', fontFamily: 'Arial', color: '#ffffff'
        });

        // Awakening stars
        const awStr = '◆'.repeat(awakening) + '◇'.repeat(maxAwakening - awakening);
        this.add.text(x + 55, y + 30, awStr, {
            fontSize: '12px', fontFamily: 'Arial', color: awakening > 0 ? '#ffaa44' : '#555555'
        });

        // Stats bonus
        if (awakening > 0) {
            this.add.text(x + 55, y + 46, `全ステ+${awakening * 10}%`, {
                fontSize: '10px', fontFamily: 'Arial', color: '#ff8844'
            });
        }

        if (awakening < maxAwakening) {
            const cost = (awakening + 1) * 1000;
            const canAfford = this.save.player.credits >= cost;

            const awBtn = this.add.rectangle(x + 185, y + 30, 50, 40, canAfford ? 0x553322 : 0x222222)
                .setInteractive({ useHandCursor: canAfford })
                .setStrokeStyle(1, canAfford ? 0xff8844 : 0x333333);

            this.add.text(x + 185, y + 22, '覚醒', {
                fontSize: '11px', fontFamily: 'Arial', color: canAfford ? '#ffffff' : '#666666'
            }).setOrigin(0.5);
            this.add.text(x + 185, y + 37, `${cost}`, {
                fontSize: '9px', fontFamily: 'Arial', color: canAfford ? '#ffcc44' : '#555555'
            }).setOrigin(0.5);

            if (canAfford) {
                awBtn.on('pointerover', () => awBtn.setFillStyle(0x664433));
                awBtn.on('pointerout', () => awBtn.setFillStyle(0x553322));
                awBtn.on('pointerdown', () => {
                    if (EquipmentSystem.awakenCharacter(char.id, cost)) {
                        this.showAwakeningEffect(awakening + 1);
                        this.time.delayedCall(800, () => this.showMain());
                    }
                });
            }
        } else {
            this.add.text(x + 185, y + 30, 'MAX', {
                fontSize: '12px', fontFamily: 'Arial', color: '#ffaa44'
            }).setOrigin(0.5);
        }
    }

    showAwakeningEffect(level) {
        const text = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, `覚醒 Lv.${level}!`, {
            fontSize: '32px', fontFamily: 'Arial', color: '#ffaa44',
            stroke: '#000000', strokeThickness: 4
        }).setOrigin(0.5).setDepth(200);

        this.tweens.add({
            targets: text, y: text.y - 60, alpha: 0, scale: 1.3,
            duration: 1200, ease: 'Power2',
            onComplete: () => text.destroy()
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

    showSynchroTab() {
        this.add.text(50, 88, 'サブキャラシンクロ - メインキャラにサブキャラを配置してステータスボーナス:', {
            fontSize: '12px', fontFamily: 'Arial', color: '#ccaaff'
        });

        const characters = this.characters;
        const save = this.save;

        // Character selection cards
        characters.forEach((char, i) => {
            const x = 20 + (i % 3) * 250;
            const y = 115 + Math.floor(i / 3) * 220;
            const charId = char.charId || char.id.replace('_normal', '');

            // Card bg
            const bg = this.add.rectangle(x + 115, y + 95, 240, 210, 0x1a1a33)
                .setStrokeStyle(1, 0x334466);

            // Character name
            this.add.text(x + 10, y + 5, char.name, {
                fontSize: '14px', fontFamily: 'Arial', color: '#ffffff'
            });

            // Attribute badge
            const attrColor = ATTRIBUTE_COLORS[char.attribute] || 0x888888;
            const attrName = ATTRIBUTE_NAMES[char.attribute] || char.attribute;
            this.add.text(x + 10, y + 24, attrName, {
                fontSize: '10px', fontFamily: 'Arial', color: `#${attrColor.toString(16).padStart(6, '0')}`
            });

            // Sub-character slots (3 slots)
            const equipment = save.equipment?.[char.id] || {};
            const subChars = equipment.subChars || [null, null, null];

            for (let s = 0; s < 3; s++) {
                const sx = x + 10 + s * 76;
                const sy = y + 48;

                // Slot background
                const slotBg = this.add.rectangle(sx + 33, sy + 30, 70, 60, 0x111122)
                    .setInteractive({ useHandCursor: true })
                    .setStrokeStyle(1, 0x333355);

                const subCharId = subChars[s];
                if (subCharId) {
                    const subChar = characters.find(c => (c.charId || c.id.replace('_normal', '')) === subCharId);
                    if (subChar) {
                        // Show sub-char icon
                        const iconKey = `icon_${subCharId}`;
                        if (this.textures.exists(iconKey)) {
                            this.add.image(sx + 33, sy + 20, iconKey).setDisplaySize(32, 32);
                        }
                        this.add.text(sx + 33, sy + 45, subChar.name.substring(0, 4), {
                            fontSize: '9px', fontFamily: 'Arial', color: '#cccccc'
                        }).setOrigin(0.5);
                    }
                } else {
                    this.add.text(sx + 33, sy + 25, '+', {
                        fontSize: '20px', fontFamily: 'Arial', color: '#555555'
                    }).setOrigin(0.5);
                    this.add.text(sx + 33, sy + 48, 'スロット' + (s + 1), {
                        fontSize: '8px', fontFamily: 'Arial', color: '#444444'
                    }).setOrigin(0.5);
                }

                slotBg.on('pointerdown', () => {
                    this.showSubCharSelection(char, s);
                });
                slotBg.on('pointerover', () => slotBg.setStrokeStyle(1, 0x5577cc));
                slotBg.on('pointerout', () => slotBg.setStrokeStyle(1, 0x333355));
            }

            // Synchro bonus display
            const bonuses = this.calcSynchroBonus(char, subChars);
            if (bonuses.total > 0) {
                this.add.text(x + 10, y + 120, 'シンクロボーナス:', {
                    fontSize: '10px', fontFamily: 'Arial', color: '#aa88ff'
                });
                const bonusLines = [];
                if (bonuses.hp > 0) bonusLines.push(`HP+${bonuses.hp}`);
                if (bonuses.atk > 0) bonusLines.push(`ATK+${bonuses.atk}`);
                if (bonuses.def > 0) bonusLines.push(`DEF+${bonuses.def}`);
                if (bonuses.shield > 0) bonusLines.push(`Shield+${bonuses.shield}`);
                this.add.text(x + 10, y + 136, bonusLines.join('  '), {
                    fontSize: '10px', fontFamily: 'Arial', color: '#ccaaff'
                });

                // Attribute match bonus
                if (bonuses.attrMatch > 0) {
                    this.add.text(x + 10, y + 154, `属性一致ボーナス: x${bonuses.attrMatch}`, {
                        fontSize: '9px', fontFamily: 'Arial', color: '#ffcc44'
                    });
                }
            }
        });
    }

    showSubCharSelection(mainChar, slotIndex) {
        this.clearUI();
        this.save = SaveManager.load();
        this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0e0e22);

        this.createBackButton(() => {
            this.currentTab = 'synchro';
            this.showMain();
        });

        const mainCharId = mainChar.charId || mainChar.id.replace('_normal', '');
        this.add.text(GAME_WIDTH / 2, 28, `${mainChar.name} - スロット${slotIndex + 1} サブキャラ選択`, {
            fontSize: '18px', fontFamily: 'Arial', color: '#ffffff',
            stroke: '#000000', strokeThickness: 2
        }).setOrigin(0.5);

        // Current equipment
        const equipment = this.save.equipment?.[mainChar.id] || {};
        const currentSubChars = equipment.subChars || [null, null, null];

        // Show available characters (exclude main char and already assigned)
        const usedIds = currentSubChars.filter((id, i) => id && i !== slotIndex);
        const available = this.characters.filter(c => {
            const cid = c.charId || c.id.replace('_normal', '');
            return cid !== mainCharId && !usedIds.includes(cid);
        });

        // "Remove" option
        const removeBg = this.add.rectangle(GAME_WIDTH / 2, 75, 300, 30, 0x331111)
            .setInteractive({ useHandCursor: true })
            .setStrokeStyle(1, 0x553333);
        this.add.text(GAME_WIDTH / 2, 75, '解除 (サブキャラなし)', {
            fontSize: '13px', fontFamily: 'Arial', color: '#ff6666'
        }).setOrigin(0.5);
        removeBg.on('pointerdown', () => {
            this.assignSubChar(mainChar.id, slotIndex, null);
        });

        available.forEach((char, i) => {
            const x = 30 + (i % 3) * 250;
            const y = 110 + Math.floor(i / 3) * 100;
            const charId = char.charId || char.id.replace('_normal', '');

            const bg = this.add.rectangle(x + 115, y + 35, 240, 80, 0x1a1a33)
                .setInteractive({ useHandCursor: true })
                .setStrokeStyle(1, 0x334466);

            // Icon
            const iconKey = `icon_${charId}`;
            if (this.textures.exists(iconKey)) {
                this.add.image(x + 30, y + 35, iconKey).setDisplaySize(44, 44);
            }

            // Name + attribute
            this.add.text(x + 60, y + 12, char.name, {
                fontSize: '14px', fontFamily: 'Arial', color: '#ffffff'
            });
            const attrName = ATTRIBUTE_NAMES[char.attribute] || char.attribute;
            this.add.text(x + 60, y + 30, `${attrName} / ${TYPE_NAMES[char.type] || char.type}`, {
                fontSize: '10px', fontFamily: 'Arial', color: '#888888'
            });

            // Bonus preview
            const bonus = this.calcSubCharBonus(mainChar, char);
            this.add.text(x + 60, y + 46, `HP+${bonus.hp}  ATK+${bonus.atk}  DEF+${bonus.def}  Shield+${bonus.shield}`, {
                fontSize: '9px', fontFamily: 'Arial', color: '#aaaacc'
            });

            // Attribute match indicator
            if (mainChar.attribute === char.attribute) {
                this.add.text(x + 210, y + 12, '属性一致!', {
                    fontSize: '10px', fontFamily: 'Arial', color: '#ffcc44'
                });
            }

            bg.on('pointerdown', () => {
                this.assignSubChar(mainChar.id, slotIndex, charId);
            });
            bg.on('pointerover', () => bg.setStrokeStyle(2, 0x5577cc));
            bg.on('pointerout', () => bg.setStrokeStyle(1, 0x334466));
        });
    }

    assignSubChar(mainCharId, slotIndex, subCharId) {
        const save = SaveManager.load();
        if (!save.equipment) save.equipment = {};
        if (!save.equipment[mainCharId]) {
            save.equipment[mainCharId] = { weaponId: null, modules: [null, null, null, null], subChars: [null, null, null] };
        }
        if (!save.equipment[mainCharId].subChars) {
            save.equipment[mainCharId].subChars = [null, null, null];
        }
        save.equipment[mainCharId].subChars[slotIndex] = subCharId;
        SaveManager.save(save);
        AudioManager.playSFX('sfx_button');
        this.currentTab = 'synchro';
        this.showMain();
    }

    calcSubCharBonus(mainChar, subChar) {
        // Sub-char contributes 10% of their base stats
        // +50% bonus if same attribute
        const mult = mainChar.attribute === subChar.attribute ? 0.15 : 0.10;
        return {
            hp: Math.floor(subChar.hp * mult),
            atk: Math.floor(subChar.atk * mult),
            def: Math.floor(subChar.def * mult),
            shield: Math.floor(subChar.shield * mult)
        };
    }

    calcSynchroBonus(mainChar, subCharIds) {
        const result = { hp: 0, atk: 0, def: 0, shield: 0, total: 0, attrMatch: 0 };
        subCharIds.forEach(subId => {
            if (!subId) return;
            const subChar = this.characters.find(c => (c.charId || c.id.replace('_normal', '')) === subId);
            if (!subChar) return;
            const bonus = this.calcSubCharBonus(mainChar, subChar);
            result.hp += bonus.hp;
            result.atk += bonus.atk;
            result.def += bonus.def;
            result.shield += bonus.shield;
            result.total++;
            if (mainChar.attribute === subChar.attribute) result.attrMatch++;
        });
        return result;
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
