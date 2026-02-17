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

        const bg = this.add.rectangle(x + 100, y + 60, 210, 140, 0x1a1a33, 0.9)
            .setInteractive({ useHandCursor: true })
            .setStrokeStyle(isSelected ? 2 : 1, isSelected ? 0xffcc00 : 0x333355);

        const charId = char.charId || char.id.replace('_normal', '');
        const iconKey = `icon_${charId}`;
        let icon;
        if (this.textures.exists(iconKey)) {
            icon = this.add.image(x + 30, y + 40, iconKey)
                .setDisplaySize(40, 40);
        } else {
            icon = this.add.rectangle(x + 30, y + 40, 40, 40, color);
        }

        const rarityStr = '★'.repeat(char.rarity);
        this.add.text(x + 60, y + 15, rarityStr, {
            fontSize: '12px', fontFamily: 'Arial', color: '#ffcc00'
        });

        this.add.text(x + 60, y + 32, char.name, {
            fontSize: '14px', fontFamily: 'Arial', color: '#ffffff'
        });

        this.add.text(x + 60, y + 50, `${ATTRIBUTE_NAMES[char.attribute]} | ${TYPE_NAMES[char.type]}`, {
            fontSize: '11px', fontFamily: 'Arial', color: '#aaaaaa'
        });

        this.add.text(x + 20, y + 75, `HP:${char.hp} ATK:${char.atk} DEF:${char.def}`, {
            fontSize: '10px', fontFamily: 'Arial', color: '#888888'
        });
        this.add.text(x + 20, y + 90, `SPD:${char.spd} CRIT:${char.critRate}%`, {
            fontSize: '10px', fontFamily: 'Arial', color: '#888888'
        });
        this.add.text(x + 20, y + 105, `武器: ${char.weaponType}`, {
            fontSize: '10px', fontFamily: 'Arial', color: '#888888'
        });

        bg.on('pointerdown', () => {
            const idx = this.selectedParty.indexOf(char.id);
            if (idx >= 0) {
                this.selectedParty.splice(idx, 1);
            } else if (this.selectedParty.length < 3) {
                this.selectedParty.push(char.id);
            }
            this.updateFormationUI();
        });

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

        const partyData = this.selectedParty.map(id =>
            this.characters.find(c => c.id === id)
        ).filter(Boolean);

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
