class UIScene extends Phaser.Scene {
    constructor() {
        super('UIScene');
    }

    init(data) {
        this.partyData = data.party;
        this.stageData = data.stageData;
        this.shieldSystem = data.shieldSystem;
        this.skillSystem = data.skillSystem;
    }

    create() {
        // Party HUD
        this.partyHUD = new PartyHUD(this);
        this.partyHUD.create(this.partyData);
        this.partyHUD.updateShield(this.shieldSystem.currentShield, this.shieldSystem.maxShield);
        this.partyHUD.highlightActive(this.partyData[0]?.id);

        // Boss HUD
        this.bossHUD = new BossHUD(this);

        // Stage info (top right)
        this.add.text(GAME_WIDTH - 10, 10, `${this.stageData.name}`, {
            fontSize: '14px', fontFamily: 'Arial', color: '#ffffff',
            stroke: '#000000', strokeThickness: 2
        }).setOrigin(1, 0).setScrollFactor(0).setDepth(200);

        this.timerText = this.add.text(GAME_WIDTH - 10, 30, '', {
            fontSize: '16px', fontFamily: 'Arial', color: '#ffcc00',
            stroke: '#000000', strokeThickness: 2
        }).setOrigin(1, 0).setScrollFactor(0).setDepth(200);

        this.waveInfoText = this.add.text(GAME_WIDTH - 10, 50, '', {
            fontSize: '12px', fontFamily: 'Arial', color: '#aaaaaa',
            stroke: '#000000', strokeThickness: 1
        }).setOrigin(1, 0).setScrollFactor(0).setDepth(200);

        // Skill buttons with icons and names from active character
        const skillY = GAME_HEIGHT - 50;
        const activeChar = this.partyData[0];
        const sk1Icon = this.getSkillIconKey(activeChar, 'skill1');
        const sk2Icon = this.getSkillIconKey(activeChar, 'skill2');
        this.skill1Btn = new SkillButton(this, GAME_WIDTH - 200, skillY, 'Q', activeChar?.skill1Name || 'Skill1', sk1Icon);
        this.skill2Btn = new SkillButton(this, GAME_WIDTH - 135, skillY, 'E', activeChar?.skill2Name || 'Skill2', sk2Icon);

        // ULT button
        this.ultBtn = new UltButton(this, GAME_WIDTH - 65, skillY);
        this.ultBtn.onActivate = () => {
            const gameScene = this.scene.get('GameScene');
            if (gameScene) gameScene.tryUseUlt();
        };

        // Dodge cooldown indicator
        this.dodgeCdText = this.add.text(GAME_WIDTH - 265, skillY + 12, '', {
            fontSize: '11px', fontFamily: 'Arial', color: '#88ccff',
            stroke: '#000000', strokeThickness: 2
        }).setOrigin(0.5).setScrollFactor(0).setDepth(200);
        this.dodgeLabel = this.add.text(GAME_WIDTH - 265, skillY - 6, 'SPACE', {
            fontSize: '10px', fontFamily: 'Arial', color: '#667788',
            stroke: '#000000', strokeThickness: 1
        }).setOrigin(0.5).setScrollFactor(0).setDepth(200);

        this.skill1Btn.onActivate = () => {
            const gameScene = this.scene.get('GameScene');
            if (gameScene) gameScene.tryUseSkill('skill1');
        };
        this.skill2Btn.onActivate = () => {
            const gameScene = this.scene.get('GameScene');
            if (gameScene) gameScene.tryUseSkill('skill2');
        };

        // Virtual joystick (touch)
        this.joystickData = { active: false, dx: 0, dy: 0 };
        this.createVirtualJoystick();

        // Character switch buttons (touch)
        this.createCharSwitchButtons();

        // Controls hint
        this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 15, 'WASD: 移動  Q/E: スキル  R: ULT  SPACE: 回避  1/2/3: 切替', {
            fontSize: '10px', fontFamily: 'Arial', color: '#555555',
            stroke: '#000000', strokeThickness: 1
        }).setOrigin(0.5).setScrollFactor(0).setDepth(200);

        // Event listeners
        EventsCenter.on(GameEvents.HP_CHANGED, this.onHpChanged, this);
        EventsCenter.on(GameEvents.SHIELD_CHANGED, this.onShieldChanged, this);
        EventsCenter.on(GameEvents.CHAR_SWITCHED, this.onCharSwitched, this);
        EventsCenter.on(GameEvents.WAVE_STARTED, this.onWaveStarted, this);
        EventsCenter.on(GameEvents.BOSS_SPAWNED, this.onBossSpawned, this);
        EventsCenter.on(GameEvents.BREAK_CHANGED, this.onBreakChanged, this);

        this.events.once('shutdown', this.cleanup, this);
    }

    onHpChanged(data) {
        this.partyHUD.updateHP(data.charId, data.current, data.max);
    }

    onShieldChanged(data) {
        this.partyHUD.updateShield(data.current, data.max);
    }

    onCharSwitched(data) {
        this.partyHUD.highlightActive(data.charId);

        // Update skill buttons for the new active character
        const charData = this.partyData.find(p => p.id === data.charId) ||
                          this.partyData[data.index];
        if (charData) {
            this.skill1Btn.updateSkill(
                charData.skill1Name || 'Skill1',
                this.getSkillIconKey(charData, 'skill1')
            );
            this.skill2Btn.updateSkill(
                charData.skill2Name || 'Skill2',
                this.getSkillIconKey(charData, 'skill2')
            );
        }
    }

    onWaveStarted(data) {
        this.waveInfoText.setText(`Wave ${data.waveIndex + 1}/${data.totalWaves}`);
    }

    onBossSpawned(data) {
        this.bossHUD.show(data.name, data.hp, data.breakGauge);
    }

    onBreakChanged(data) {
        if (this.bossHUD.visible) {
            this.bossHUD.updateBreak(data.current, data.max, data.isBroken);
        }
    }

    update(time, delta) {
        // Update timer
        const gameScene = this.scene.get('GameScene');
        if (gameScene && gameScene.elapsedTime !== undefined) {
            const elapsed = Math.floor(gameScene.elapsedTime / 1000);
            const limit = this.stageData.timeLimit;
            const remaining = Math.max(0, limit - elapsed);
            const min = Math.floor(remaining / 60);
            const sec = remaining % 60;
            this.timerText.setText(`${min}:${sec.toString().padStart(2, '0')}`);
            this.timerText.setColor(remaining <= 30 ? '#ff4444' : '#ffcc00');
        }

        // Update skill cooldowns
        if (this.skillSystem && gameScene?.activePlayer) {
            const charId = gameScene.activePlayer.charId;
            this.skill1Btn.setCooldown(
                this.skillSystem.getCooldownPercent(charId, 'skill1'),
                this.skillSystem.getRemainingSeconds(charId, 'skill1')
            );
            this.skill2Btn.setCooldown(
                this.skillSystem.getCooldownPercent(charId, 'skill2'),
                this.skillSystem.getRemainingSeconds(charId, 'skill2')
            );
        }

        // Update ULT gauge
        if (this.skillSystem && gameScene?.activePlayer) {
            const charId = gameScene.activePlayer.charId;
            this.ultBtn.setGauge(this.skillSystem.getUltPercent(charId));
        }

        // Update dodge cooldown
        if (gameScene?.activePlayer) {
            const player = gameScene.activePlayer;
            if (player.dodgeCooldown > 0) {
                this.dodgeCdText.setText(Math.ceil(player.dodgeCooldown / 1000) + 's');
                this.dodgeLabel.setColor('#555555');
            } else {
                this.dodgeCdText.setText('OK');
                this.dodgeLabel.setColor('#88ccff');
            }
        }

        // Update boss HP
        if (this.bossHUD.visible && gameScene?.enemyPool?.activeBoss) {
            const boss = gameScene.enemyPool.activeBoss;
            if (boss.active && !boss.isDead) {
                this.bossHUD.updateHP(boss.currentHp, boss.maxHp);
            }
        }
    }

    createVirtualJoystick() {
        const baseX = 90;
        const baseY = GAME_HEIGHT - 100;
        const radius = 50;

        // Outer ring
        this.joyBase = this.add.circle(baseX, baseY, radius, 0xffffff, 0.1)
            .setStrokeStyle(2, 0xffffff, 0.3)
            .setScrollFactor(0).setDepth(190);

        // Inner knob
        this.joyKnob = this.add.circle(baseX, baseY, 20, 0xffffff, 0.3)
            .setScrollFactor(0).setDepth(191);

        // Touch zone (larger invisible area)
        this.joyZone = this.add.rectangle(baseX, baseY, radius * 3, radius * 3, 0x000000, 0)
            .setInteractive().setScrollFactor(0).setDepth(189);

        this.joyZone.on('pointerdown', (pointer) => {
            this.joystickData.active = true;
            this.updateJoystick(pointer);
        });

        this.input.on('pointermove', (pointer) => {
            if (!this.joystickData.active) return;
            this.updateJoystick(pointer);
        });

        this.input.on('pointerup', (pointer) => {
            this.joystickData.active = false;
            this.joystickData.dx = 0;
            this.joystickData.dy = 0;
            this.joyKnob.setPosition(baseX, baseY);
        });
    }

    updateJoystick(pointer) {
        const baseX = 90;
        const baseY = GAME_HEIGHT - 100;
        const radius = 50;

        let dx = pointer.x - baseX;
        let dy = pointer.y - baseY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > radius) {
            dx = (dx / dist) * radius;
            dy = (dy / dist) * radius;
        }

        this.joyKnob.setPosition(baseX + dx, baseY + dy);
        this.joystickData.dx = dx / radius;
        this.joystickData.dy = dy / radius;
    }

    createCharSwitchButtons() {
        const startX = 200;
        const y = GAME_HEIGHT - 55;

        for (let i = 0; i < Math.min(this.partyData.length, 3); i++) {
            const x = startX + i * 45;
            const char = this.partyData[i];
            const color = ATTRIBUTE_COLORS[char.attribute] || 0xffffff;
            const charId = char.charId || char.id.replace('_normal', '');
            const iconKey = `icon_${charId}`;

            // Background circle
            const btn = this.add.circle(x, y, 18, 0x111122, 0.8)
                .setStrokeStyle(2, color, 0.9)
                .setInteractive({ useHandCursor: true })
                .setScrollFactor(0).setDepth(200);

            // Character icon or fallback
            if (this.textures.exists(iconKey)) {
                this.add.image(x, y, iconKey)
                    .setDisplaySize(28, 28)
                    .setScrollFactor(0).setDepth(201);
            } else {
                this.add.circle(x, y, 12, color, 0.5)
                    .setScrollFactor(0).setDepth(201);
            }

            // Key number
            this.add.text(x + 12, y - 14, `${i + 1}`, {
                fontSize: '10px', fontFamily: 'Arial', color: '#ffcc00',
                stroke: '#000000', strokeThickness: 2
            }).setOrigin(0.5).setScrollFactor(0).setDepth(202);

            btn.on('pointerdown', () => {
                const gameScene = this.scene.get('GameScene');
                if (gameScene) gameScene.switchCharacter(i);
            });
        }
    }

    getJoystickInput() {
        return this.joystickData;
    }

    getSkillIconKey(charData, skillSlot) {
        if (!charData) return 'icon_skill_shoot';
        const name = skillSlot === 'skill1' ? charData.skill1Name : charData.skill2Name;
        const dmgMult = skillSlot === 'skill1' ? charData.skill1DmgMult : charData.skill2DmgMult;

        if (!name) return 'icon_skill_shoot';

        // Match by skill name keywords
        if (name.includes('ヒール') || name.includes('リジェネ') || name.includes('サンクチュアリ')) return 'icon_skill_heal';
        if (name.includes('シールド') || name.includes('アイアン') || name.includes('フォートレス')) return 'icon_skill_shield';
        if (name.includes('ブースト') || name.includes('タクティカル')) return 'icon_skill_buff';
        if (name.includes('マーク') || name.includes('サプレッション')) return 'icon_skill_debuff';
        if (name.includes('グレネード') || name.includes('レーザー') || name.includes('フィールド')) return 'icon_skill_aoe';
        if (name.includes('ファントム') || name.includes('ブレイク')) return 'icon_skill_break';

        // Fallback by damage multiplier
        if (dmgMult > 0) return 'icon_skill_shoot';
        return 'icon_skill_buff';
    }

    cleanup() {
        EventsCenter.off(GameEvents.HP_CHANGED, this.onHpChanged, this);
        EventsCenter.off(GameEvents.SHIELD_CHANGED, this.onShieldChanged, this);
        EventsCenter.off(GameEvents.CHAR_SWITCHED, this.onCharSwitched, this);
        EventsCenter.off(GameEvents.WAVE_STARTED, this.onWaveStarted, this);
        EventsCenter.off(GameEvents.BOSS_SPAWNED, this.onBossSpawned, this);
        EventsCenter.off(GameEvents.BREAK_CHANGED, this.onBreakChanged, this);
        this.partyHUD.cleanup();
        this.bossHUD.cleanup();
        this.skill1Btn.destroy();
        this.skill2Btn.destroy();
        this.ultBtn.destroy();
    }
}
