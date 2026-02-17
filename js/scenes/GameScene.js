class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    init(data) {
        this.stageId = data.stageId;
        this.stageData = data.stageData;
        this.partyData = data.party;
        this.isPaused = false;
        this.isGameOver = false;
        this.isCleared = false;
        this.elapsedTime = 0;
        this.totalDamageDealt = 0;
        this.partyDeaths = 0;
    }

    create() {
        this.enemiesData = this.cache.json.get('enemies');

        // Camera and world bounds
        this.physics.world.setBounds(0, 0, FIELD_WIDTH, FIELD_HEIGHT);
        this.cameras.main.setBounds(0, 0, FIELD_WIDTH, FIELD_HEIGHT);

        // Draw floor grid
        this.createFloor();

        // Create players
        this.players = [];
        this.activePlayerIndex = 0;
        this.partyData.forEach((charData, i) => {
            const x = FIELD_WIDTH / 2 + (i - 1) * 50;
            const y = FIELD_HEIGHT / 2 + 50;
            const player = new Player(this, x, y, charData);
            player.setAsActive(i === 0);
            this.players.push(player);
        });

        this.activePlayer = this.players[0];
        this.cameras.main.startFollow(this.activePlayer, true, 0.1, 0.1);

        // Shield system
        this.shieldSystem = new ShieldSystem();
        this.shieldSystem.init(this.partyData);

        // Skill system
        this.skillSystem = new SkillSystem(this);
        this.partyData.forEach(c => this.skillSystem.initForCharacter(c.id, c));

        // Bullet pools
        this.playerBullets = new BulletPool(this, 'bullet_player', 200);
        this.enemyBullets = new BulletPool(this, 'bullet_enemy', 300);

        // Enemy pool
        this.enemyPool = new EnemyPool(this, 30);

        // Wave manager
        this.waveManager = new WaveManager(this);
        this.waveManager.init(this.stageData, this.enemiesData);

        // Input
        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = this.input.keyboard.addKeys('W,A,S,D');
        this.skillKeys = {
            Q: this.input.keyboard.addKey('Q'),
            E: this.input.keyboard.addKey('E'),
            ONE: this.input.keyboard.addKey('ONE'),
            TWO: this.input.keyboard.addKey('TWO'),
            THREE: this.input.keyboard.addKey('THREE')
        };

        // Collisions
        this.setupCollisions();

        // Launch UI Scene
        this.scene.launch('UIScene', {
            party: this.partyData,
            stageData: this.stageData,
            shieldSystem: this.shieldSystem,
            skillSystem: this.skillSystem
        });

        // Wave text
        this.waveText = this.add.text(FIELD_WIDTH / 2, FIELD_HEIGHT / 2 - 100, '', {
            fontSize: '32px', fontFamily: 'Arial', color: '#ffcc00',
            stroke: '#000000', strokeThickness: 4
        }).setOrigin(0.5).setDepth(100).setScrollFactor(0);

        // Event listeners
        EventsCenter.on(GameEvents.WAVE_CLEARED, this.onWaveCleared, this);
        EventsCenter.on(GameEvents.STAGE_CLEARED, this.onStageCleared, this);
        EventsCenter.on(GameEvents.BOSS_BREAK, this.onBossBreak, this);

        this.events.once('shutdown', this.cleanup, this);

        // Start first wave
        this.time.delayedCall(1000, () => this.startNextWave());
    }

    createFloor() {
        const g = this.add.graphics();
        g.fillStyle(0x1a1a2e, 1);
        g.fillRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT);
        g.lineStyle(1, 0x222244, 0.3);
        for (let x = 0; x <= FIELD_WIDTH; x += 64) {
            g.lineBetween(x, 0, x, FIELD_HEIGHT);
        }
        for (let y = 0; y <= FIELD_HEIGHT; y += 64) {
            g.lineBetween(0, y, FIELD_WIDTH, y);
        }
        // World boundary
        g.lineStyle(2, 0x4444aa, 0.5);
        g.strokeRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT);
        g.setDepth(0);
    }

    setupCollisions() {
        // Player bullets hit enemies
        this.physics.add.overlap(
            this.playerBullets.getGroup(),
            this.enemyPool.getGroup(),
            this.onPlayerBulletHitEnemy,
            null,
            this
        );

        // Enemy bullets hit players
        this.players.forEach(player => {
            this.physics.add.overlap(
                this.enemyBullets.getGroup(),
                player,
                this.onEnemyBulletHitPlayer,
                null,
                this
            );
        });

        // Contact enemies hit player
        this.players.forEach(player => {
            this.physics.add.overlap(
                player,
                this.enemyPool.getGroup(),
                this.onEnemyContactPlayer,
                null,
                this
            );
        });
    }

    onPlayerBulletHitEnemy(bullet, enemy) {
        if (!bullet.active || !enemy.active || enemy.isDead) return;

        const result = DamageSystem.calculateDamage(
            {
                atk: bullet.damage,
                attribute: bullet.attribute,
                critRate: this.activePlayer?.critRate || 5,
                critDmg: this.activePlayer?.critDmg || 150,
                weaponAtk: 0
            },
            { def: enemy.def, attribute: enemy.attribute }
        );

        const killed = enemy.takeDamage(result.damage);
        this.totalDamageDealt += result.damage;

        // Damage number
        this.showDamageNumber(enemy.x, enemy.y - 20, result.damage, result.isCrit);

        if (killed) {
            this.waveManager.onEnemyDefeated();
        }

        if (!bullet.piercing) {
            bullet.deactivate();
        }
    }

    onEnemyBulletHitPlayer(bullet, player) {
        if (!bullet.active || !player.active || player.isDead) return;
        if (bullet.isPlayerBullet) return;

        const result = DamageSystem.calculateDamage(
            { atk: bullet.damage, attribute: bullet.attribute, critRate: 0, critDmg: 100, weaponAtk: 0 },
            { def: player.def, attribute: player.attribute }
        );

        let dmg = result.damage;
        dmg = this.shieldSystem.applyDamage(dmg);
        if (dmg > 0) {
            player.takeDamage(dmg);
            if (player.isDead) {
                this.partyDeaths++;
                this.switchToNextAlive();
            }
        }

        bullet.deactivate();
        this.checkGameOver();
    }

    onEnemyContactPlayer(player, enemy) {
        if (!player.active || player.isDead || !enemy.active || enemy.isDead) return;
        if (enemy.attackPattern !== 'chase_contact') return;

        // Contact damage every ~500ms (throttled by checking enemy data)
        if (!enemy._contactCooldown) enemy._contactCooldown = 0;
        if (enemy._contactCooldown > 0) return;
        enemy._contactCooldown = 500;

        const dmg = enemy.atk;
        let remaining = this.shieldSystem.applyDamage(dmg);
        if (remaining > 0) {
            player.takeDamage(remaining);
            if (player.isDead) {
                this.partyDeaths++;
                this.switchToNextAlive();
            }
        }
        this.checkGameOver();
    }

    showDamageNumber(x, y, damage, isCrit) {
        const color = isCrit ? '#ffff00' : '#ffffff';
        const size = isCrit ? '18px' : '14px';
        const prefix = isCrit ? 'CRIT ' : '';
        const text = this.add.text(x, y, `${prefix}${damage}`, {
            fontSize: size, fontFamily: 'Arial', color: color,
            stroke: '#000000', strokeThickness: 2
        }).setOrigin(0.5).setDepth(80);

        this.tweens.add({
            targets: text,
            y: y - 40,
            alpha: 0,
            duration: 800,
            onComplete: () => text.destroy()
        });
    }

    switchToNextAlive() {
        const aliveIndex = this.players.findIndex((p, i) => !p.isDead && i !== this.activePlayerIndex);
        if (aliveIndex >= 0) {
            this.switchCharacter(aliveIndex);
        }
    }

    switchCharacter(index) {
        if (index < 0 || index >= this.players.length) return;
        if (this.players[index].isDead) return;

        this.players[this.activePlayerIndex].setAsActive(false);
        this.activePlayerIndex = index;
        this.activePlayer = this.players[index];
        this.activePlayer.setAsActive(true);
        this.cameras.main.startFollow(this.activePlayer, true, 0.1, 0.1);

        // Move inactive players to follow
        this.players.forEach((p, i) => {
            if (i !== index && !p.isDead) {
                p.setPosition(
                    this.activePlayer.x + (i - index) * 40,
                    this.activePlayer.y + 30
                );
            }
        });

        EventsCenter.emit(GameEvents.CHAR_SWITCHED, {
            charId: this.activePlayer.charId,
            index: index
        });
    }

    startNextWave() {
        const waveData = this.waveManager.startNextWave();
        if (!waveData) return;

        const progress = this.waveManager.getProgress();
        this.waveText.setText(`Wave ${progress.currentWave}/${progress.totalWaves}`);
        this.waveText.setAlpha(1);
        this.tweens.add({
            targets: this.waveText,
            alpha: 0,
            duration: 2000,
            delay: 1000
        });

        // Spawn enemies
        let spawnIndex = 0;
        waveData.forEach(entry => {
            for (let i = 0; i < entry.count; i++) {
                this.time.delayedCall(spawnIndex * 300, () => {
                    const margin = 100;
                    const side = Math.floor(Math.random() * 4);
                    let x, y;
                    switch (side) {
                        case 0: x = margin + Math.random() * (FIELD_WIDTH - margin * 2); y = margin; break;
                        case 1: x = FIELD_WIDTH - margin; y = margin + Math.random() * (FIELD_HEIGHT - margin * 2); break;
                        case 2: x = margin + Math.random() * (FIELD_WIDTH - margin * 2); y = FIELD_HEIGHT - margin; break;
                        default: x = margin; y = margin + Math.random() * (FIELD_HEIGHT - margin * 2); break;
                    }
                    this.enemyPool.spawn(entry.def, x, y);
                });
                spawnIndex++;
            }
        });
    }

    onWaveCleared() {
        if (this.waveManager.isComplete()) return;
        this.time.delayedCall(2000, () => {
            if (!this.isGameOver && !this.isCleared) {
                this.startNextWave();
            }
        });
    }

    onStageCleared() {
        if (this.isCleared) return;
        this.isCleared = true;

        this.waveText.setText('STAGE CLEAR!');
        this.waveText.setAlpha(1);
        this.waveText.setColor('#00ff00');

        this.time.delayedCall(2000, () => {
            const timeInSeconds = Math.floor(this.elapsedTime / 1000);
            const timeLimit = this.stageData.timeLimit;
            let stars = 1;
            if (this.partyDeaths === 0) stars = 2;
            if (this.partyDeaths === 0 && timeInSeconds <= timeLimit) stars = 3;

            const drops = DropSystem.generateStageDrops(this.stageData);
            const save = SaveManager.load();
            const isFirstClear = !save.progress.clearedStages[this.stageId];
            const firstClearRewards = isFirstClear ? DropSystem.generateFirstClearRewards(this.stageData) : [];

            SaveManager.markStageCleared(this.stageId, stars);

            // Apply rewards
            drops.forEach(d => {
                if (d.type === 'credit') SaveManager.addCredits(d.amount);
            });
            firstClearRewards.forEach(r => {
                if (r.type === 'gems') SaveManager.addGems(r.amount);
            });

            this.scene.stop('UIScene');
            this.scene.start('ResultScene', {
                stageData: this.stageData,
                stars,
                drops,
                firstClearRewards,
                isFirstClear,
                timeInSeconds,
                totalDamage: this.totalDamageDealt,
                partyDeaths: this.partyDeaths
            });
        });
    }

    onBossBreak(data) {
        if (data.isBroken) {
            this.cameras.main.shake(300, 0.01);
        }
    }

    checkGameOver() {
        if (this.players.every(p => p.isDead)) {
            this.isGameOver = true;
            this.waveText.setText('GAME OVER');
            this.waveText.setAlpha(1);
            this.waveText.setColor('#ff0000');

            this.time.delayedCall(3000, () => {
                this.scene.stop('UIScene');
                this.scene.start('ResultScene', {
                    stageData: this.stageData,
                    stars: 0,
                    drops: [],
                    firstClearRewards: [],
                    isFirstClear: false,
                    timeInSeconds: Math.floor(this.elapsedTime / 1000),
                    totalDamage: this.totalDamageDealt,
                    partyDeaths: this.partyDeaths,
                    isGameOver: true
                });
            });
        }
    }

    update(time, delta) {
        if (this.isPaused || this.isGameOver || this.isCleared) return;

        this.elapsedTime += delta;

        // Player movement and auto-fire
        if (this.activePlayer && !this.activePlayer.isDead) {
            this.activePlayer.updateMovement(this.cursors, this.wasd, delta);

            const activeEnemies = this.enemyPool.getActiveEnemies();
            this.activePlayer.updateAutoFire(activeEnemies, this.playerBullets, delta);

            // Follow inactive players
            this.players.forEach((p, i) => {
                if (i !== this.activePlayerIndex && !p.isDead) {
                    const targetX = this.activePlayer.x + (i - this.activePlayerIndex) * 40;
                    const targetY = this.activePlayer.y + 30;
                    p.x += (targetX - p.x) * 0.05;
                    p.y += (targetY - p.y) * 0.05;
                    p.nameLabel.setPosition(p.x, p.y - 24);
                }
            });
        }

        // Enemy AI
        this.enemyPool.updateAll(this.activePlayer, this.enemyBullets, delta);

        // Contact cooldown reduction
        this.enemyPool.getActiveEnemies().forEach(e => {
            if (e._contactCooldown > 0) e._contactCooldown -= delta;
        });

        // Skill system update
        this.skillSystem.update(delta);

        // Skill input
        if (Phaser.Input.Keyboard.JustDown(this.skillKeys.Q)) {
            this.tryUseSkill('skill1');
        }
        if (Phaser.Input.Keyboard.JustDown(this.skillKeys.E)) {
            this.tryUseSkill('skill2');
        }

        // Character switch
        if (Phaser.Input.Keyboard.JustDown(this.skillKeys.ONE)) this.switchCharacter(0);
        if (Phaser.Input.Keyboard.JustDown(this.skillKeys.TWO)) this.switchCharacter(1);
        if (Phaser.Input.Keyboard.JustDown(this.skillKeys.THREE)) this.switchCharacter(2);

        // Time limit check
        const timeSec = Math.floor(this.elapsedTime / 1000);
        if (timeSec >= this.stageData.timeLimit && !this.isCleared) {
            this.checkGameOver();
        }
    }

    tryUseSkill(skillSlot) {
        if (!this.activePlayer || this.activePlayer.isDead) return;
        const charId = this.activePlayer.charId;
        if (this.skillSystem.useSkill(charId, skillSlot)) {
            const activeEnemies = this.enemyPool.getActiveEnemies();

            // Support skills (medic/tank heal/shield)
            const charData = this.activePlayer.charData;
            if (charData.type === 'medic' && skillSlot === 'skill1') {
                // Heal active character 20%
                this.activePlayer.heal(Math.floor(this.activePlayer.maxHp * 0.2));
            } else if (charData.type === 'medic' && skillSlot === 'skill2') {
                // Heal all 10%
                this.players.forEach(p => {
                    if (!p.isDead) p.heal(Math.floor(p.maxHp * 0.1));
                });
            } else if (charData.type === 'tank' && skillSlot === 'skill2') {
                // Shield recovery
                this.shieldSystem.heal(300);
            } else if (charData.type === 'support' && skillSlot === 'skill2') {
                // ATK buff visual indicator
                this.players.forEach(p => {
                    if (!p.isDead) {
                        this.showDamageNumber(p.x, p.y - 30, 'ATK UP', false);
                    }
                });
            } else {
                // Damage skills
                this.activePlayer.useSkill(skillSlot, activeEnemies, this.playerBullets);
            }
        }
    }

    cleanup() {
        EventsCenter.off(GameEvents.WAVE_CLEARED, this.onWaveCleared, this);
        EventsCenter.off(GameEvents.STAGE_CLEARED, this.onStageCleared, this);
        EventsCenter.off(GameEvents.BOSS_BREAK, this.onBossBreak, this);
    }
}
