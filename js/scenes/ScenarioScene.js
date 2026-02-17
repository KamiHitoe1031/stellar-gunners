class ScenarioScene extends Phaser.Scene {
    constructor() {
        super('ScenarioScene');
    }

    init(data) {
        this.scenarioId = data.scenarioId;
        this.onComplete = data.onComplete || {};
        this.isGalleryMode = data.isGallery || false;
        this.currentIndex = 0;
        this.isAutoMode = false;
        this.textComplete = false;
        this.isTransitioning = false;
    }

    create() {
        const allScenarios = this.cache.json.get('scenarios');
        this.scenarioData = allScenarios
            .filter(s => s.scenarioId === this.scenarioId)
            .sort((a, b) => a.seqNo - b.seqNo);

        if (this.scenarioData.length === 0) {
            this.completeScenario();
            return;
        }

        // Background
        this.bgImage = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x111122);

        // Portrait
        this.portrait = null;

        // Fade overlay (for effects)
        this.fadeOverlay = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000)
            .setDepth(50).setAlpha(0);

        // Text window
        this.textWindow = new TextWindow(this);

        // Backlog
        this.backLog = new BackLog(this);

        // Control buttons
        this.createControls();

        // Input - click to advance
        this.input.on('pointerdown', (pointer) => {
            if (this.backLog.isVisible) return;
            // Ignore clicks on control buttons (top area)
            if (pointer.y < 45) return;
            this.advanceLine();
        });

        // Keyboard
        this.input.keyboard.on('keydown-SPACE', () => this.advanceLine());
        this.input.keyboard.on('keydown-ENTER', () => this.advanceLine());

        // Show first line
        this.showLine(0);
    }

    createControls() {
        const btnStyle = { fontSize: '13px', fontFamily: 'Arial', color: '#8899aa' };
        const btnY = 15;

        // Auto button
        this.autoBtn = this.add.text(GAME_WIDTH - 200, btnY, 'AUTO', btnStyle)
            .setInteractive({ useHandCursor: true }).setDepth(200);
        this.autoBtn.on('pointerdown', () => this.toggleAuto());

        // Skip button
        this.skipBtn = this.add.text(GAME_WIDTH - 140, btnY, 'SKIP', btnStyle)
            .setInteractive({ useHandCursor: true }).setDepth(200);
        this.skipBtn.on('pointerdown', () => this.skipAll());

        // Log button
        this.logBtn = this.add.text(GAME_WIDTH - 80, btnY, 'LOG', btnStyle)
            .setInteractive({ useHandCursor: true }).setDepth(200);
        this.logBtn.on('pointerdown', () => this.backLog.show());

        // Hover effects
        [this.autoBtn, this.skipBtn, this.logBtn].forEach(btn => {
            btn.on('pointerover', () => btn.setColor('#bbddff'));
            btn.on('pointerout', () => btn.setColor(btn === this.autoBtn && this.isAutoMode ? '#44ff88' : '#8899aa'));
        });
    }

    showLine(index) {
        if (index >= this.scenarioData.length) {
            this.completeScenario();
            return;
        }

        const line = this.scenarioData[index];
        this.currentIndex = index;
        this.textComplete = false;
        this.isTransitioning = false;

        // Background change
        if (line.bgKey && line.bgKey !== '') {
            this.updateBackground(line.bgKey);
        }

        // Effect
        if (line.effect && line.effect !== '') {
            this.executeEffect(line.effect);
        }

        // Portrait
        this.updatePortrait(line.speakerSpriteKey, line.expression);

        // Text
        this.textWindow.showText(line.speaker, line.text, () => {
            this.textComplete = true;

            // Mark as read
            SaveManager.markAsRead(this.scenarioId, line.seqNo);

            // Auto advance
            if (this.isAutoMode) {
                this.time.delayedCall(2000, () => {
                    if (this.isAutoMode && this.textComplete) {
                        this.currentIndex++;
                        if (this.currentIndex >= this.scenarioData.length) {
                            this.completeScenario();
                        } else {
                            this.showLine(this.currentIndex);
                        }
                    }
                });
            }
        });

        // Add to backlog
        this.backLog.addEntry(line.speaker, line.text);
    }

    advanceLine() {
        if (this.isTransitioning) return;
        if (this.backLog.isVisible) return;

        if (!this.textComplete) {
            this.textWindow.showAllText();
            this.textComplete = true;
            return;
        }

        this.currentIndex++;
        if (this.currentIndex >= this.scenarioData.length) {
            this.completeScenario();
        } else {
            this.showLine(this.currentIndex);
        }
    }

    updateBackground(bgKey) {
        // Try to use actual background image
        const bgTextures = {
            'bg_city_ruin': 'bg_battle_city',
            'bg_city_ruin_deep': 'bg_battle_city',
            'bg_city_lab': 'bg_battle_lab'
        };

        const textureKey = bgTextures[bgKey];
        if (textureKey && this.textures.exists(textureKey)) {
            if (this.bgImage) this.bgImage.destroy();
            this.bgImage = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, textureKey)
                .setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
                .setDepth(0);
        } else {
            // Fallback color
            const bgColors = {
                'bg_city_ruin': 0x1a1a2e,
                'bg_city_ruin_deep': 0x0e0e1e,
                'bg_city_lab': 0x1e2e1e
            };
            if (this.bgImage) this.bgImage.destroy();
            this.bgImage = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT,
                bgColors[bgKey] || 0x111122).setDepth(0);
        }
    }

    updatePortrait(spriteKey, expression) {
        if (this.portrait) {
            this.portrait.destroy();
            this.portrait = null;
        }

        if (!spriteKey || spriteKey === '') return;

        // Build portrait key: e.g. "chr_01_normal" + "_confident" -> "portrait_chr_01_confident"
        const charId = spriteKey.replace('_normal', '');
        const portraitKey = expression ? `portrait_${charId}_${expression}` : `portrait_${charId}_normal`;

        if (this.textures.exists(portraitKey)) {
            this.portrait = this.add.image(GAME_WIDTH - 200, GAME_HEIGHT - 250, portraitKey)
                .setDisplaySize(300, 400)
                .setDepth(10)
                .setAlpha(0);

            this.tweens.add({
                targets: this.portrait,
                alpha: 1,
                duration: 200
            });
        } else {
            // Fallback: colored rectangle with name
            const charData = this.cache.json.get('characters').find(c => c.spriteKey === spriteKey);
            const color = charData ? (ATTRIBUTE_COLORS[charData.attribute] || 0x888888) : 0x888888;

            this.portrait = this.add.rectangle(GAME_WIDTH - 200, GAME_HEIGHT - 250, 120, 180, color, 0.3)
                .setDepth(10).setStrokeStyle(1, color);
        }
    }

    executeEffect(effect) {
        switch (effect) {
            case 'fade_in':
                this.isTransitioning = true;
                this.fadeOverlay.setAlpha(1);
                this.tweens.add({
                    targets: this.fadeOverlay,
                    alpha: 0,
                    duration: 800,
                    onComplete: () => { this.isTransitioning = false; }
                });
                break;

            case 'fade_out':
                this.isTransitioning = true;
                this.fadeOverlay.setAlpha(0);
                this.tweens.add({
                    targets: this.fadeOverlay,
                    alpha: 1,
                    duration: 800,
                    onComplete: () => { this.isTransitioning = false; }
                });
                break;

            case 'screen_shake':
                this.cameras.main.shake(300, 0.01);
                break;
        }
    }

    toggleAuto() {
        this.isAutoMode = !this.isAutoMode;
        this.autoBtn.setColor(this.isAutoMode ? '#44ff88' : '#8899aa');
        this.autoBtn.setText(this.isAutoMode ? 'AUTO ●' : 'AUTO');

        if (this.isAutoMode && this.textComplete) {
            this.time.delayedCall(2000, () => {
                if (this.isAutoMode && this.textComplete) {
                    this.currentIndex++;
                    if (this.currentIndex >= this.scenarioData.length) {
                        this.completeScenario();
                    } else {
                        this.showLine(this.currentIndex);
                    }
                }
            });
        }
    }

    skipAll() {
        // Mark all lines as read
        this.scenarioData.forEach(line => {
            SaveManager.markAsRead(this.scenarioId, line.seqNo);
        });
        this.completeScenario();
    }

    completeScenario() {
        if (this.isGalleryMode) {
            this.scene.start('GalleryScene');
        } else if (this.onComplete && this.onComplete.scene) {
            this.scene.start(this.onComplete.scene, this.onComplete.data);
        } else {
            this.scene.start('MenuScene');
        }
    }
}
