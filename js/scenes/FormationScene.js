class FormationScene extends Phaser.Scene {
    constructor() {
        super('FormationScene');
    }

    init() {
        this.selectedParty = [];
        this.selectedStage = null;
        this.mode = 'stage_select'; // 'stage_select' or 'formation'
    }

    create() {
        this.characters = this.cache.json.get('characters');
        this.stages = this.cache.json.get('stages');
        this.save = SaveManager.load();

        this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0e0e22);
        this.showStageSelect();
    }

    showStageSelect() {
        this.clearUI();
        this.mode = 'stage_select';

        // Back button
        this.createBackButton(() => this.scene.start('MenuScene'));

        this.add.text(GAME_WIDTH / 2, 30, 'チャプター1: 都市廃墟', {
            fontSize: '22px', fontFamily: 'Arial', color: '#ffffff',
            stroke: '#000000', strokeThickness: 2
        }).setOrigin(0.5);

        // Stage list (scrollable grid)
        const cols = 4;
        const startX = 60;
        const startY = 80;

        this.stages.forEach((stage, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const x = startX + col * 180;
            const y = startY + row * 140;

            const cleared = this.save.progress.clearedStages[stage.id];
            const stars = cleared ? cleared.stars : 0;
            const bgColor = stars > 0 ? 0x1a3322 : 0x1a1a33;
            const borderColor = stars >= 3 ? 0xffcc00 : stars > 0 ? 0x44aa44 : 0x333355;

            const bg = this.add.rectangle(x + 70, y + 50, 160, 120, bgColor, 0.9)
                .setInteractive({ useHandCursor: true })
                .setStrokeStyle(1, borderColor);

            this.add.text(x + 70, y + 15, `1-${stage.stageNum}`, {
                fontSize: '14px', fontFamily: 'Arial', color: '#888888'
            }).setOrigin(0.5);

            this.add.text(x + 70, y + 35, stage.name, {
                fontSize: '15px', fontFamily: 'Arial', color: '#ffffff'
            }).setOrigin(0.5);

            const attrColor = ATTRIBUTE_COLORS[stage.recommendedAttribute] || 0xffffff;
            this.add.rectangle(x + 70, y + 55, 10, 10, attrColor).setDepth(1);
            this.add.text(x + 80, y + 50, `推奨: ${stage.recommendedPower}`, {
                fontSize: '10px', fontFamily: 'Arial', color: '#aaaaaa'
            });

            this.add.text(x + 70, y + 68, `電力: ${stage.staminaCost}`, {
                fontSize: '10px', fontFamily: 'Arial', color: '#88ff88'
            }).setOrigin(0.5);

            // Stars display
            const starStr = '★'.repeat(stars) + '☆'.repeat(3 - stars);
            this.add.text(x + 70, y + 82, starStr, {
                fontSize: '12px', fontFamily: 'Arial', color: '#ffcc00'
            }).setOrigin(0.5);

            bg.on('pointerover', () => bg.setStrokeStyle(2, 0x6688ff));
            bg.on('pointerout', () => bg.setStrokeStyle(1, borderColor));
            bg.on('pointerdown', () => {
                this.selectedStage = stage;
                this.showFormation();
            });

            this.uiElements.push(bg);
        });
    }

    showFormation() {
        this.clearUI();
        this.mode = 'formation';

        this.createBackButton(() => this.showStageSelect());

        // Stage info
        this.add.text(GAME_WIDTH / 2, 30, `${this.selectedStage.name} - 編成`, {
            fontSize: '20px', fontFamily: 'Arial', color: '#ffffff',
            stroke: '#000000', strokeThickness: 2
        }).setOrigin(0.5);

        this.add.text(GAME_WIDTH / 2, 55, this.selectedStage.description, {
            fontSize: '12px', fontFamily: 'Arial', color: '#aaaaaa'
        }).setOrigin(0.5);

        // Character selection
        this.add.text(40, 90, 'パーティメンバーを3人選択:', {
            fontSize: '14px', fontFamily: 'Arial', color: '#cccccc'
        });

        this.selectedParty = [
            this.characters[0]?.id,
            this.characters[1]?.id,
            this.characters[2]?.id
        ].filter(Boolean);

        this.characterCards = [];
        this.characters.forEach((char, i) => {
            const x = 60 + (i % 3) * 240;
            const y = 130 + Math.floor(i / 3) * 180;
            this.createCharCard(x, y, char, i);
        });

        this.updateFormationUI();

        // Sortie button
        const sortieBtn = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - 50, 200, 50, 0x2244aa)
            .setInteractive({ useHandCursor: true })
            .setStrokeStyle(2, 0x4488ff);

        this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 50, '出撃!', {
            fontSize: '22px', fontFamily: 'Arial', color: '#ffffff'
        }).setOrigin(0.5);

        sortieBtn.on('pointerover', () => sortieBtn.setFillStyle(0x3355cc));
        sortieBtn.on('pointerout', () => sortieBtn.setFillStyle(0x2244aa));
        sortieBtn.on('pointerdown', () => this.startBattle());
    }

    createCharCard(x, y, char, index) {
        const color = ATTRIBUTE_COLORS[char.attribute] || 0xffffff;
        const isSelected = this.selectedParty.includes(char.id);
        const charSave = this.save.characters[char.id] || { level: 1 };
        const level = charSave.level || 1;

        const bg = this.add.rectangle(x + 100, y + 60, 210, 140, 0x1a1a33, 0.9)
            .setInteractive({ useHandCursor: true })
            .setStrokeStyle(isSelected ? 2 : 1, isSelected ? 0xffcc00 : 0x333355);

        const charId = char.charId || char.id.replace('_normal', '');
        const iconKey = `icon_${charId}`;
        if (this.textures.exists(iconKey)) {
            this.add.image(x + 30, y + 40, iconKey).setDisplaySize(40, 40);
        } else {
            this.add.rectangle(x + 30, y + 40, 40, 40, color);
        }

        const rarityStr = '★'.repeat(char.rarity);
        this.add.text(x + 60, y + 15, `${rarityStr}  Lv.${level}`, {
            fontSize: '12px', fontFamily: 'Arial', color: '#ffcc00'
        });

        this.add.text(x + 60, y + 32, char.name, {
            fontSize: '14px', fontFamily: 'Arial', color: '#ffffff'
        });

        this.add.text(x + 60, y + 50, `${ATTRIBUTE_NAMES[char.attribute]} | ${TYPE_NAMES[char.type]}`, {
            fontSize: '11px', fontFamily: 'Arial', color: '#aaaaaa'
        });

        const stats = SaveManager.getCharStats(char, level);
        this.add.text(x + 20, y + 75, `HP:${stats.hp} ATK:${stats.atk} DEF:${stats.def}`, {
            fontSize: '10px', fontFamily: 'Arial', color: '#888888'
        });
        this.add.text(x + 20, y + 90, `SPD:${char.spd} CRIT:${char.critRate}%`, {
            fontSize: '10px', fontFamily: 'Arial', color: '#888888'
        });

        const wpnName = EquipmentSystem.getEquippedWeaponName(char.id, this.save, this.cache.json.get('weapons'));
        this.add.text(x + 20, y + 105, `武器: ${wpnName || char.weaponType}`, {
            fontSize: '10px', fontFamily: 'Arial', color: wpnName ? '#88ccff' : '#888888'
        });

        bg.on('pointerdown', (pointer) => {
            const idx = this.selectedParty.indexOf(char.id);
            if (idx >= 0) {
                this.selectedParty.splice(idx, 1);
            } else if (this.selectedParty.length < 3) {
                this.selectedParty.push(char.id);
            }
            this.updateFormationUI();
        });

        // Equip weapon button
        const equipBtn = this.add.text(x + 170, y + 105, '[装備]', {
            fontSize: '10px', fontFamily: 'Arial', color: '#4488ff'
        }).setInteractive({ useHandCursor: true });
        equipBtn.on('pointerdown', (pointer) => {
            pointer.event.stopPropagation();
            this.showEquipPopup(char);
        });
        equipBtn.on('pointerover', () => equipBtn.setColor('#88ccff'));
        equipBtn.on('pointerout', () => equipBtn.setColor('#4488ff'));

        this.characterCards.push({ bg, charId: char.id });
    }

    updateFormationUI() {
        if (!this.characterCards) return;
        this.characterCards.forEach(card => {
            const isSelected = this.selectedParty.includes(card.charId);
            card.bg.setStrokeStyle(isSelected ? 2 : 1, isSelected ? 0xffcc00 : 0x333355);
        });
    }

    startBattle() {
        if (this.selectedParty.length === 0) {
            this.selectedParty = this.characters.slice(0, 3).map(c => c.id);
        }

        // Stamina check
        const staminaCost = this.selectedStage.staminaCost || 0;
        const save = SaveManager.load();
        SaveManager.refillStamina(save);

        if (save.player.stamina < staminaCost) {
            this.showNotification(`電力不足！ 必要: ${staminaCost} / 現在: ${save.player.stamina}`);
            return;
        }

        // Deduct stamina
        save.player.stamina -= staminaCost;
        save.progress.staminaSpent = (save.progress.staminaSpent || 0) + staminaCost;
        SaveManager.save(save);

        const weaponsData = this.cache.json.get('weapons');
        const modulesData = this.cache.json.get('modules');
        // Cache data for EquipmentSystem
        window._cachedPartsData = this.cache.json.get('weapon_parts') || [];
        window._cachedCharacters = this.characters;

        const partyData = this.selectedParty.map(id => {
            const charBase = this.characters.find(c => c.id === id);
            if (!charBase) return null;
            return EquipmentSystem.getCharBattleStats(charBase, save, weaponsData, modulesData);
        }).filter(Boolean);

        const battleData = {
            stageId: this.selectedStage.id,
            stageData: this.selectedStage,
            party: partyData
        };

        // Check for pre-battle scenario
        const scenarioId = this.selectedStage.scenarioId;
        if (scenarioId && scenarioId !== '') {
            this.scene.start('ScenarioScene', {
                scenarioId: scenarioId,
                onComplete: { scene: 'GameScene', data: battleData }
            });
        } else {
            this.scene.start('GameScene', battleData);
        }
    }

    showEquipPopup(char) {
        if (this.equipPopup) {
            this.equipPopup.destroy();
            this.equipPopup = null;
        }

        const weaponsData = this.cache.json.get('weapons');
        const save = SaveManager.load();
        const ownedWeapons = EquipmentSystem.getOwnedWeapons(save, weaponsData);
        const compatibleWeapons = ownedWeapons.filter(w => w.def.weaponType === char.weaponType);

        this.equipPopup = this.add.container(0, 0).setDepth(200);

        // Dim background
        const dim = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.7);
        dim.setInteractive();
        dim.on('pointerdown', () => {
            this.equipPopup.destroy();
            this.equipPopup = null;
        });
        this.equipPopup.add(dim);

        // Panel
        const panelW = 400;
        const panelH = Math.min(300, 80 + compatibleWeapons.length * 45 + 45);
        const panel = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, panelW, panelH, 0x1a1a33, 0.95)
            .setStrokeStyle(2, 0x4488ff);
        this.equipPopup.add(panel);

        const title = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - panelH / 2 + 20, `${char.name} - 武器装備`, {
            fontSize: '16px', fontFamily: 'Arial', color: '#ffffff'
        }).setOrigin(0.5);
        this.equipPopup.add(title);

        // Unequip option
        const currentEquip = save.equipment?.[char.id]?.weaponId;
        if (currentEquip) {
            const unequipY = GAME_HEIGHT / 2 - panelH / 2 + 50;
            const unequipBg = this.add.rectangle(GAME_WIDTH / 2, unequipY, panelW - 40, 35, 0x332222)
                .setInteractive({ useHandCursor: true })
                .setStrokeStyle(1, 0x664444);
            const unequipText = this.add.text(GAME_WIDTH / 2, unequipY, '装備解除', {
                fontSize: '13px', fontFamily: 'Arial', color: '#ff8888'
            }).setOrigin(0.5);
            unequipBg.on('pointerdown', () => {
                EquipmentSystem.unequipWeapon(char.id);
                this.save = SaveManager.load();
                this.equipPopup.destroy();
                this.equipPopup = null;
                this.showFormation();
            });
            this.equipPopup.add(unequipBg);
            this.equipPopup.add(unequipText);
        }

        if (compatibleWeapons.length === 0) {
            const noWpn = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, `対応武器(${char.weaponType})なし\nショップで購入できます`, {
                fontSize: '13px', fontFamily: 'Arial', color: '#666666', align: 'center'
            }).setOrigin(0.5);
            this.equipPopup.add(noWpn);
        }

        const startY = GAME_HEIGHT / 2 - panelH / 2 + (currentEquip ? 90 : 55);
        compatibleWeapons.forEach((wpn, i) => {
            const y = startY + i * 45;
            const isEquipped = currentEquip === wpn.instanceId;
            const bgColor = isEquipped ? 0x223344 : 0x1a1a2e;

            const itemBg = this.add.rectangle(GAME_WIDTH / 2, y, panelW - 40, 38, bgColor)
                .setInteractive({ useHandCursor: true })
                .setStrokeStyle(1, isEquipped ? 0x4488ff : 0x333355);

            const stars = '★'.repeat(wpn.def.rarity);
            const itemText = this.add.text(GAME_WIDTH / 2 - panelW / 2 + 40, y - 8, `${stars} ${wpn.def.name}`, {
                fontSize: '13px', fontFamily: 'Arial', color: '#ffffff'
            });
            const itemSub = this.add.text(GAME_WIDTH / 2 - panelW / 2 + 40, y + 7, `Lv.${wpn.level || 1} ATK+${wpn.def.mainAtk}`, {
                fontSize: '10px', fontFamily: 'Arial', color: '#aaaaaa'
            });

            if (isEquipped) {
                const eqLabel = this.add.text(GAME_WIDTH / 2 + panelW / 2 - 40, y, '装備中', {
                    fontSize: '11px', fontFamily: 'Arial', color: '#4488ff'
                }).setOrigin(1, 0.5);
                this.equipPopup.add(eqLabel);
            }

            itemBg.on('pointerdown', () => {
                EquipmentSystem.equipWeapon(char.id, wpn.instanceId);
                this.save = SaveManager.load();
                this.equipPopup.destroy();
                this.equipPopup = null;
                this.showFormation();
            });

            this.equipPopup.add(itemBg);
            this.equipPopup.add(itemText);
            this.equipPopup.add(itemSub);
        });
    }

    showNotification(msg) {
        const text = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, msg, {
            fontSize: '18px', fontFamily: 'Arial', color: '#ff4444',
            stroke: '#000000', strokeThickness: 3,
            backgroundColor: '#220000', padding: { x: 16, y: 10 }
        }).setOrigin(0.5).setDepth(300);
        this.tweens.add({
            targets: text, alpha: 0, y: text.y - 40,
            duration: 2000, delay: 1000,
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
        this.uiElements = this.uiElements || [];
        this.characterCards = [];
        this.children.removeAll(true);
        this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0e0e22);
    }
}
