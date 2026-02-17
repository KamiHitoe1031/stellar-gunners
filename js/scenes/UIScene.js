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

        // Skill buttons
        const skillY = GAME_HEIGHT - 50;
        this.skill1Btn = new SkillButton(this, GAME_WIDTH - 130, skillY, 'Q:SK1', 'Q');
        this.skill2Btn = new SkillButton(this, GAME_WIDTH - 60, skillY, 'E:SK2', 'E');

        this.skill1Btn.onActivate = () => {
            const gameScene = this.scene.get('GameScene');
            if (gameScene) gameScene.tryUseSkill('skill1');
        };
        this.skill2Btn.onActivate = () => {
            const gameScene = this.scene.get('GameScene');
            if (gameScene) gameScene.tryUseSkill('skill2');
        };

        // Controls hint
        this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 15, 'WASD: 移動  Q/E: スキル  1/2/3: キャラ切替', {
            fontSize: '10px', fontFamily: 'Arial', color: '#666666',
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

        // Update boss HP
        if (this.bossHUD.visible && gameScene?.enemyPool?.activeBoss) {
            const boss = gameScene.enemyPool.activeBoss;
            if (boss.active && !boss.isDead) {
                this.bossHUD.updateHP(boss.currentHp, boss.maxHp);
            }
        }
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
    }
}
