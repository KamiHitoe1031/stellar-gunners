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
        this.isTransitioning = false;
        this.elapsedTime = 0;
        this.totalDamageDealt = 0;
        this.partyDeaths = 0;
        this.floorObjects = [];
        this.exitPortal = null;
        this.exitPortalGlow = null;
        this.exitPortalText = null;
        this.exitPortalOverlap = null;
        this.portalGuideArrow = null;
        this.areaSplashObjects = [];
    }

    create() {
        this.enemiesData = this.cache.json.get('enemies');

        // Camera and world bounds
        this.physics.world.setBounds(0, 0, FIELD_WIDTH, FIELD_HEIGHT);
        this.cameras.main.setBounds(0, 0, FIELD_WIDTH, FIELD_HEIGHT);

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

        // Effect system
        this.effects = new EffectSystem(this);

        // Obstacle manager (procedural fallback)
        this.obstacleManager = new ObstacleManager(this);

        // Collision map manager (image-based)
        this.collisionMapManager = new CollisionMapManager(this);
        const collisionKey = `collision_${this.stageId}`;
        this.collisionData = this.cache.json.get(collisionKey) || null;

        // Wave manager
        this.waveManager = new WaveManager(this);
        this.waveManager.init(this.stageData, this.enemiesData);

        // Input
        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = this.input.keyboard.addKeys('W,A,S,D');
        this.skillKeys = {
            Q: this.input.keyboard.addKey('Q'),
            E: this.input.keyboard.addKey('E'),
            R: this.input.keyboard.addKey('R'),
            SPACE: this.input.keyboard.addKey('SPACE'),
            ONE: this.input.keyboard.addKey('ONE'),
            TWO: this.input.keyboard.addKey('TWO'),
            THREE: this.input.keyboard.addKey('THREE')
        };

        // Prevent right-click context menu on game canvas
        this.game.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

        // Reset keys when window loses focus (prevents stuck movement)
        this._onBlur = () => {
            if (this.wasd) {
                Object.values(this.wasd).forEach(k => k.reset());
            }
            if (this.cursors) {
                Object.values(this.cursors).forEach(k => { if (k && k.reset) k.reset(); });
            }
        };
        window.addEventListener('blur', this._onBlur);

        // Base collisions (players, enemies, bullets)
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

        // Area name text
        this.areaNameText = this.add.text(FIELD_WIDTH / 2, FIELD_HEIGHT / 2 - 140, '', {
            fontSize: '22px', fontFamily: 'Arial', color: '#88ccff',
            stroke: '#000000', strokeThickness: 3
        }).setOrigin(0.5).setDepth(100).setScrollFactor(0).setAlpha(0);

        // Event listeners
        EventsCenter.on(GameEvents.WAVE_CLEARED, this.onWaveCleared, this);
        EventsCenter.on(GameEvents.AREA_CLEARED, this.onAreaCleared, this);
        EventsCenter.on(GameEvents.STAGE_CLEARED, this.onStageCleared, this);
        EventsCenter.on(GameEvents.BOSS_BREAK, this.onBossBreak, this);
        EventsCenter.on(GameEvents.BOSS_PHASE_CHANGE, this.onBossPhaseChange, this);

        this.events.once('shutdown', this.cleanup, this);

        // Battle BGM
        AudioManager.playBGM('bgm_battle');

        // Load first area
        this.loadArea(0);
    }

    // ===== Area Management =====

    loadArea(areaIndex) {
        const area = this.waveManager.getCurrentArea();
        if (!area) return;

        // Clear floor, obstacles, and collision map
        this.clearFloor();
        this.obstacleManager.clearAll();
        this.collisionMapManager.clearAll();

        // Try area-specific background, fall back to theme
        const areaBgKey = `area_bg_${this.stageId}_${areaIndex}`;
        if (this.textures.exists(areaBgKey)) {
            this.createFloorFromAreaImage(areaBgKey);
        } else {
            this.createFloorForTheme(area.bgTheme);
        }

        // Try collision map, fall back to procedural obstacles
        if (this.collisionData && this.collisionMapManager.loadGrid(this.collisionData, areaIndex)) {
            this.collisionMapManager.createColliders();
            this.setupCollisionMapCollisions();
        } else {
            this.obstacleManager.generateForArea(area.layout);
            this.setupObstacleCollisions();
        }

        // Reset player positions to center
        this.players.forEach((p, i) => {
            if (!p.isDead) {
                p.setPosition(FIELD_WIDTH / 2 + (i - 1) * 50, FIELD_HEIGHT / 2 + 50);
            }
        });

        // Show area name
        if (area.areaName) {
            this.showAreaName(area.areaName, areaIndex);
        }

        // Emit AREA_STARTED for first area too
        if (areaIndex === 0) {
            EventsCenter.emit(GameEvents.AREA_STARTED, {
                areaIndex: 0,
                totalAreas: this.waveManager.getTotalAreas(),
                bgTheme: area.bgTheme,
                layout: area.layout,
                areaName: area.areaName
            });
        }

        // Start first wave in area after delay
        this.time.delayedCall(1000, () => {
            if (!this.isGameOver && !this.isCleared) {
                this.startNextWaveInArea();
            }
        });
    }

    showAreaName(name, areaIndex) {
        // Clean up previous splash
        this.areaSplashObjects.forEach(obj => { if (obj && obj.destroy) obj.destroy(); });
        this.areaSplashObjects = [];

        const totalAreas = this.waveManager.getTotalAreas();
        const camCx = GAME_WIDTH / 2;
        const camCy = GAME_HEIGHT / 2;

        // Semi-transparent black bar
        const bar = this.add.rectangle(camCx, camCy, GAME_WIDTH, 100, 0x000000, 0.6)
            .setScrollFactor(0).setDepth(150).setAlpha(0);
        this.areaSplashObjects.push(bar);

        // Area number (small, above center)
        const areaNum = this.add.text(camCx, camCy - 18, `▸ Area ${areaIndex + 1}/${totalAreas}`, {
            fontSize: '14px', fontFamily: 'Arial', color: '#88ccff',
            stroke: '#000000', strokeThickness: 2
        }).setOrigin(0.5).setScrollFactor(0).setDepth(151).setAlpha(0);
        this.areaSplashObjects.push(areaNum);

        // Area name (large, below center)
        const areaTitle = this.add.text(camCx, camCy + 12, name, {
            fontSize: '28px', fontFamily: 'Arial', color: '#ffffff',
            stroke: '#000000', strokeThickness: 5
        }).setOrigin(0.5).setScrollFactor(0).setDepth(151).setAlpha(0);
        this.areaSplashObjects.push(areaTitle);

        // Fade in
        this.tweens.add({
            targets: [bar, areaNum, areaTitle],
            alpha: 1,
            duration: 300,
            onComplete: () => {
                // Hold for 1.5s then fade out
                this.tweens.add({
                    targets: [bar, areaNum, areaTitle],
                    alpha: 0,
                    duration: 800,
                    delay: 1500,
                    onComplete: () => {
                        this.areaSplashObjects.forEach(obj => { if (obj && obj.destroy) obj.destroy(); });
                        this.areaSplashObjects = [];
                    }
                });
            }
        });

        // Also update the smaller area name text for backup
        this.areaNameText.setText('');
    }

    clearFloor() {
        this.floorObjects.forEach(obj => {
            if (obj && obj.destroy) obj.destroy();
        });
        this.floorObjects = [];
    }

    createFloorForTheme(theme) {
        const bgKey = `bg_theme_${theme}`;

        if (this.textures.exists(bgKey)) {
            const bg = this.add.image(FIELD_WIDTH / 2, FIELD_HEIGHT / 2, bgKey);
            bg.setDisplaySize(FIELD_WIDTH, FIELD_HEIGHT);
            bg.setDepth(0);
            this.floorObjects.push(bg);
        } else {
            // Try chapter-based background
            const chapter = this.stageData.chapter || 1;
            const bgMap = { 1: 'bg_battle_city', 2: 'bg_battle_lab', 3: 'bg_battle_city' };
            const fallbackKey = bgMap[chapter] || 'bg_battle_city';

            if (this.textures.exists(fallbackKey)) {
                const bg = this.add.image(FIELD_WIDTH / 2, FIELD_HEIGHT / 2, fallbackKey);
                bg.setDisplaySize(FIELD_WIDTH, FIELD_HEIGHT);
                bg.setDepth(0);
                this.floorObjects.push(bg);
            } else {
                // Grid fallback
                const g = this.add.graphics();
                g.fillStyle(0x1a1a2e, 1);
                g.fillRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT);
                g.setDepth(0);
                this.floorObjects.push(g);
            }
        }

        // Grid overlay for gameplay clarity
        const grid = this.add.graphics();
        grid.lineStyle(1, 0x222244, 0.15);
        for (let x = 0; x <= FIELD_WIDTH; x += 64) {
            grid.lineBetween(x, 0, x, FIELD_HEIGHT);
        }
        for (let y = 0; y <= FIELD_HEIGHT; y += 64) {
            grid.lineBetween(0, y, FIELD_WIDTH, y);
        }
        grid.lineStyle(2, 0x4444aa, 0.3);
        grid.strokeRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT);
        grid.setDepth(1);
        this.floorObjects.push(grid);
    }

    createFloorFromAreaImage(textureKey) {
        const bg = this.add.image(FIELD_WIDTH / 2, FIELD_HEIGHT / 2, textureKey);
        bg.setDisplaySize(FIELD_WIDTH, FIELD_HEIGHT);
        bg.setDepth(0);
        this.floorObjects.push(bg);

        // Subtle grid overlay (reduced opacity since bg has visual cues)
        const grid = this.add.graphics();
        grid.lineStyle(1, 0x222244, 0.08);
        for (let x = 0; x <= FIELD_WIDTH; x += COLLISION_CELL_WIDTH) {
            grid.lineBetween(x, 0, x, FIELD_HEIGHT);
        }
        for (let y = 0; y <= FIELD_HEIGHT; y += COLLISION_CELL_HEIGHT) {
            grid.lineBetween(0, y, FIELD_WIDTH, y);
        }
        grid.lineStyle(2, 0x4444aa, 0.2);
        grid.strokeRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT);
        grid.setDepth(1);
        this.floorObjects.push(grid);
    }

    setupCollisionMapCollisions() {
        const group = this.collisionMapManager.getStaticGroup();
        if (!group || group.getLength() === 0) return;

        // Players collide with walls
        this.players.forEach(player => {
            if (!player.isDead) {
                this.physics.add.collider(player, group);
            }
        });

        // Enemies collide with walls
        this.physics.add.collider(this.enemyPool.getGroup(), group);

        // Player bullets hit walls
        this.physics.add.overlap(
            this.playerBullets.getGroup(), group,
            (bullet, wall) => {
                if (!bullet.active) return;
                if (bullet.piercing) return;
                bullet.deactivate();
                if (this.effects) this.effects.hitImpact(bullet.x, bullet.y, 0x888888);
            }, null, this
        );

        // Enemy bullets hit walls
        this.physics.add.overlap(
            this.enemyBullets.getGroup(), group,
            (bullet, wall) => {
                if (!bullet.active) return;
                if (bullet.piercing) return;
                bullet.deactivate();
            }, null, this
        );
    }

    showExitPortal() {
        if (this.exitPortal) return;

        const cx = FIELD_WIDTH / 2;
        const cy = FIELD_HEIGHT / 4;

        // Outer glow (pulsing)
        this.exitPortalGlow = this.add.circle(cx, cy, 80, 0x00ffcc, 0.15)
            .setDepth(29);
        this.tweens.add({
            targets: this.exitPortalGlow, scaleX: 1.2, scaleY: 1.2, alpha: 0.25,
            duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
        });

        // Main portal (larger)
        this.exitPortal = this.add.circle(cx, cy, 50, 0x00ffcc, 0.4)
            .setStrokeStyle(4, 0x00ffcc, 0.9).setDepth(30);
        this.exitPortalText = this.add.text(cx, cy - 65, 'NEXT AREA ▶', {
            fontSize: '20px', fontFamily: 'Arial', color: '#00ffcc',
            stroke: '#000000', strokeThickness: 4
        }).setOrigin(0.5).setDepth(31);

        // Pulse animation
        this.tweens.add({
            targets: this.exitPortal, scaleX: 1.3, scaleY: 1.3, alpha: 0.7,
            duration: 800, yoyo: true, repeat: -1
        });

        // Physics body for overlap detection (centered on visual circle)
        this.physics.add.existing(this.exitPortal, true);
        this.exitPortal.body.setSize(120, 120);
        this.exitPortal.body.setOffset(-10, -10);
        this.exitPortalOverlap = this.physics.add.overlap(
            this.activePlayer, this.exitPortal,
            () => this.onPlayerReachPortal(),
            null, this
        );

        // Portal appear SFX
        AudioManager.playSFX('sfx_skill');

        // Direction arrow above player
        this.portalGuideArrow = this.add.text(0, 0, '▲', {
            fontSize: '24px', fontFamily: 'Arial', color: '#00ffcc',
            stroke: '#000000', strokeThickness: 3
        }).setOrigin(0.5).setDepth(90);

        // Auto-transition after 12 seconds
        this._portalTimeout = this.time.delayedCall(12000, () => {
            this.onPlayerReachPortal();
        });
    }

    onPlayerReachPortal() {
        if (this.isTransitioning) return;
        this.isTransitioning = true;
        this.destroyExitPortal();
        this.transitionToNextArea();
    }

    destroyExitPortal() {
        if (this._portalTimeout) {
            this._portalTimeout.remove();
            this._portalTimeout = null;
        }
        if (this.exitPortalOverlap) {
            this.physics.world.removeCollider(this.exitPortalOverlap);
            this.exitPortalOverlap = null;
        }
        if (this.exitPortalGlow) {
            this.exitPortalGlow.destroy();
            this.exitPortalGlow = null;
        }
        if (this.exitPortal) {
            this.exitPortal.destroy();
            this.exitPortal = null;
        }
        if (this.exitPortalText) {
            this.exitPortalText.destroy();
            this.exitPortalText = null;
        }
        if (this.portalGuideArrow) {
            this.portalGuideArrow.destroy();
            this.portalGuideArrow = null;
        }
    }

    transitionToNextArea() {
        AudioManager.playSFX('sfx_portal');
        this.cameras.main.fadeOut(AREA_TRANSITION_FADE);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            // Deactivate all remaining entities
            this.enemyPool.reset();
            this.playerBullets.getGroup().getChildren().forEach(b => {
                if (b.deactivate) b.deactivate();
            });
            this.enemyBullets.getGroup().getChildren().forEach(b => {
                if (b.deactivate) b.deactivate();
            });

            const hasNext = this.waveManager.advanceToNextArea();
            if (hasNext) {
                this.loadArea(this.waveManager.currentAreaIndex);
                this.cameras.main.fadeIn(AREA_TRANSITION_FADE);
                this.cameras.main.once('camerafadeincomplete', () => {
                    this.cameras.main.flash(100, 255, 255, 255, true);
                });
                this.isTransitioning = false;
            }
            // If !hasNext, STAGE_CLEARED was emitted by WaveManager
        });
    }

    // ===== Collisions =====

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

    setupObstacleCollisions() {
        const obsGroup = this.obstacleManager.getStaticGroup();
        if (obsGroup.getLength() === 0) return;

        // Players collide with obstacles
        this.players.forEach(player => {
            if (!player.isDead) {
                this.physics.add.collider(player, obsGroup);
            }
        });

        // Enemies collide with obstacles
        this.physics.add.collider(this.enemyPool.getGroup(), obsGroup);

        // Player bullets hit obstacles
        this.physics.add.overlap(
            this.playerBullets.getGroup(), obsGroup,
            this.onBulletHitObstacle, null, this
        );

        // Enemy bullets hit obstacles
        this.physics.add.overlap(
            this.enemyBullets.getGroup(), obsGroup,
            this.onBulletHitObstacle, null, this
        );
    }

    onBulletHitObstacle(bullet, obstacle) {
        if (!bullet.active) return;
        if (bullet.piercing) return; // Piercing bullets pass through
        bullet.deactivate();
        if (this.effects) {
            this.effects.hitImpact(bullet.x, bullet.y, 0x888888);
        }
        if (obstacle.isDestructible && obstacle.takeDamage) {
            obstacle.takeDamage(bullet.damage);
        }
    }

    // ===== Combat Handlers =====

    onPlayerBulletHitEnemy(bullet, enemy) {
        if (!bullet.active || !enemy.active || enemy.isDead) return;

        const result = DamageSystem.calculateDamage(
            {
                atk: bullet.damage,
                attribute: bullet.attribute,
                critRate: bullet.ownerCritRate || 5,
                critDmg: bullet.ownerCritDmg || 150,
                weaponAtk: 0
            },
            { def: enemy.def, attribute: enemy.attribute }
        );

        const killed = enemy.takeDamage(result.damage);
        this.totalDamageDealt += result.damage;

        // Hit effect
        const attrCol = ATTRIBUTE_COLORS[bullet.attribute] || 0xffffff;
        if (result.isCrit) {
            this.effects.critSpark(enemy.x, enemy.y);
        } else {
            this.effects.hitImpact(enemy.x, enemy.y, attrCol);
        }

        // Explosion for launcher-type bullets
        if (bullet.explosionRadius > 0) {
            this.effects.explosion(bullet.x, bullet.y, bullet.explosionRadius);
        }

        // Charge ULT gauge on hit
        if (this.activePlayer) {
            this.skillSystem.addUltGauge(this.activePlayer.charId, ULT_CHARGE_ON_DEAL);
        }

        // Damage number
        this.showDamageNumber(enemy.x, enemy.y - 20, result.damage, result.isCrit);

        if (killed) {
            // Death effect
            const enemyCol = ATTRIBUTE_COLORS[enemy.attribute] || 0xff4444;
            const enemySize = enemy._displaySize || 28;
            this.effects.enemyDeath(enemy.x, enemy.y, enemyCol, enemySize);
            // Bonus ULT charge on kill
            if (this.activePlayer) {
                this.skillSystem.addUltGauge(this.activePlayer.charId, ULT_CHARGE_ON_KILL);
            }

            // Passive: kill ATK stacking (Lilith - チームスピリット)
            this.players.forEach(p => {
                if (!p.isDead && p.passiveData?.killAtkStack) {
                    const pd = p.passiveData;
                    if (pd.killAtkCurrent < pd.killAtkMax) {
                        pd.killAtkCurrent = Math.min(pd.killAtkMax, pd.killAtkCurrent + pd.killAtkPerKill);
                        this.players.forEach(ally => {
                            if (!ally.isDead) {
                                const bonus = Math.floor(ally.charData.atk * pd.killAtkPerKill);
                                ally.atk += bonus;
                            }
                        });
                    }
                }
            });

            this.waveManager.onEnemyDefeated();
        }

        if (!bullet.piercing) {
            bullet.deactivate();
        } else {
            this.effects.piercingTrail(bullet.x, bullet.y, bullet.rotation, attrCol);
        }
    }

    onEnemyBulletHitPlayer(player, bullet) {
        if (!bullet.active || !player.active || player.isDead) return;
        if (bullet.isPlayerBullet) return;
        if (player.isDodging) return;

        const result = DamageSystem.calculateDamage(
            { atk: bullet.damage, attribute: bullet.attribute, critRate: 0, critDmg: 100, weaponAtk: 0 },
            { def: player.def, attribute: player.attribute }
        );

        let dmg = result.damage;

        // Passive: damage reduction
        if (player.passiveData?.damageReduction) {
            dmg = Math.floor(dmg * (1 - player.passiveData.damageReduction));
        }

        // Charge ULT gauge on receiving damage
        if (this.activePlayer) {
            this.skillSystem.addUltGauge(this.activePlayer.charId, ULT_CHARGE_ON_RECEIVE);
        }

        const beforeShield = dmg;
        dmg = this.shieldSystem.applyDamage(dmg);
        if (beforeShield > dmg && beforeShield - dmg > 0) {
            this.effects.shieldAbsorb(player.x, player.y);
        }
        if (dmg > 0) {
            player.takeDamage(dmg);
            this.effects.hitImpact(player.x, player.y, 0xff4444);

            // Roll for status effect
            const isElite = bullet._enemyCategory === 'elite' || bullet._enemyCategory === 'boss';
            const statusEffect = DamageSystem.rollStatusEffect(bullet.attribute, isElite);
            if (statusEffect && !player.isDead) {
                player.addStatusEffect(
                    statusEffect.name, statusEffect.duration,
                    statusEffect.icon, statusEffect.color,
                    { dot: statusEffect.dot, tickDamage: statusEffect.tickDamage,
                      tickInterval: statusEffect.tickInterval, speedMult: statusEffect.speedMult }
                );
            }

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
        if (player.isDodging) return;

        if (!enemy._contactCooldown) enemy._contactCooldown = 0;
        if (enemy._contactCooldown > 0) return;
        enemy._contactCooldown = 500;

        const dmg = enemy.atk;
        let remaining = this.shieldSystem.applyDamage(dmg);
        if (remaining < dmg) {
            this.effects.shieldAbsorb(player.x, player.y);
        }
        if (remaining > 0) {
            player.takeDamage(remaining);
            this.effects.hitImpact(player.x, player.y, 0xff4444);

            const isElite = enemy.enemyData?.category === 'elite' || enemy.enemyData?.category === 'boss';
            const statusEffect = DamageSystem.rollStatusEffect(enemy.attribute, isElite);
            if (statusEffect && !player.isDead) {
                player.addStatusEffect(
                    statusEffect.name, statusEffect.duration,
                    statusEffect.icon, statusEffect.color,
                    { dot: statusEffect.dot, tickDamage: statusEffect.tickDamage,
                      tickInterval: statusEffect.tickInterval, speedMult: statusEffect.speedMult }
                );
            }

            if (player.isDead) {
                this.partyDeaths++;
                this.switchToNextAlive();
            }
        }
        this.checkGameOver();
    }

    // ===== UI Helpers =====

    showDamageNumber(x, y, damage, isCrit) {
        let color, size, label;
        if (typeof damage === 'string') {
            color = '#88ffaa';
            size = '14px';
            label = damage;
        } else {
            color = isCrit ? '#ffff00' : '#ffffff';
            size = isCrit ? '18px' : '14px';
            label = isCrit ? `CRIT ${damage}` : `${damage}`;
        }
        const text = this.add.text(x, y, label, {
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

    // ===== Character Management =====

    switchToNextAlive() {
        const aliveIndex = this.players.findIndex((p, i) => !p.isDead && i !== this.activePlayerIndex);
        if (aliveIndex >= 0) {
            this.switchCharacter(aliveIndex);
        }
    }

    switchCharacter(index) {
        if (index < 0 || index >= this.players.length) return;
        if (this.players[index].isDead) return;

        // Remember previous active player's position
        const prevX = this.activePlayer.x;
        const prevY = this.activePlayer.y;

        this.players[this.activePlayerIndex].setAsActive(false);
        this.activePlayerIndex = index;
        this.activePlayer = this.players[index];
        this.activePlayer.setAsActive(true);

        // Snap new active player to previous active's position (no camera jump)
        this.activePlayer.setPosition(prevX, prevY);
        this.activePlayer.nameLabel.setPosition(prevX, prevY - 24);
        this.cameras.main.startFollow(this.activePlayer, true, 0.1, 0.1);

        // Position inactive players nearby
        this.players.forEach((p, i) => {
            if (i !== index && !p.isDead) {
                p.setPosition(
                    prevX + (i - index) * 40,
                    prevY + 30
                );
                p.nameLabel.setPosition(p.x, p.y - 24);
            }
        });

        EventsCenter.emit(GameEvents.CHAR_SWITCHED, {
            charId: this.activePlayer.charId,
            index: index
        });
    }

    // ===== Wave / Area Events =====

    startNextWaveInArea() {
        const waveData = this.waveManager.startNextWaveInArea();
        if (!waveData) return;
        AudioManager.playSFX('sfx_wave');

        const progress = this.waveManager.getProgress();
        this.waveText.setText(`Area ${progress.currentArea}/${progress.totalAreas} - Wave ${progress.currentWave}/${progress.totalWaves}`);
        this.waveText.setAlpha(1);
        this.waveText.setColor('#ffcc00');
        this.tweens.add({
            targets: this.waveText,
            alpha: 0,
            duration: 2000,
            delay: 1000
        });

        // Spawn enemies
        let spawnIndex = 0;
        const edges = ['top', 'right', 'bottom', 'left'];
        const hasCollisionMap = this.collisionMapManager.hasGrid();
        waveData.forEach(entry => {
            for (let i = 0; i < entry.count; i++) {
                this.time.delayedCall(spawnIndex * 300, () => {
                    if (this.isGameOver || this.isCleared) return;
                    let x, y;
                    const side = Math.floor(Math.random() * 4);
                    const edgeName = edges[side];

                    if (hasCollisionMap) {
                        // Collision map active: always use connected spawn points
                        const cmSpawn = this.collisionMapManager.getWalkableSpawnPoint(edgeName);
                        x = cmSpawn.x;
                        y = cmSpawn.y;
                    } else {
                        // No collision map: random edge spawn
                        const margin = 100;
                        switch (side) {
                            case 0: x = margin + Math.random() * (FIELD_WIDTH - margin * 2); y = margin; break;
                            case 1: x = FIELD_WIDTH - margin; y = margin + Math.random() * (FIELD_HEIGHT - margin * 2); break;
                            case 2: x = margin + Math.random() * (FIELD_WIDTH - margin * 2); y = FIELD_HEIGHT - margin; break;
                            default: x = margin; y = margin + Math.random() * (FIELD_HEIGHT - margin * 2); break;
                        }
                    }
                    this.enemyPool.spawn(entry.def, x, y);
                });
                spawnIndex++;
            }
        });
    }

    onWaveCleared() {
        // More waves in current area - start next wave after delay
        this.time.delayedCall(2000, () => {
            if (!this.isGameOver && !this.isCleared && !this.isTransitioning) {
                this.startNextWaveInArea();
            }
        });
    }

    onAreaCleared(data) {
        if (this.isCleared || this.isGameOver) return;

        // Is this the final area?
        if (data.areaIndex >= data.totalAreas - 1) {
            // Final area cleared = stage cleared
            EventsCenter.emit(GameEvents.STAGE_CLEARED);
            return;
        }

        // Show exit portal after delay
        this.time.delayedCall(AREA_TRANSITION_DELAY, () => {
            if (!this.isGameOver && !this.isCleared && !this.isTransitioning) {
                this.showExitPortal();
            }
        });
    }

    onStageCleared() {
        if (this.isCleared) return;
        this.isCleared = true;
        this.destroyExitPortal();

        // Stop all player movement immediately
        this.players.forEach(p => {
            if (p.body) p.setVelocity(0, 0);
        });

        this.waveText.setText('STAGE CLEAR!');
        this.waveText.setAlpha(1);
        this.waveText.setColor('#00ff00');

        // Deactivate all enemies and bullets
        this.enemyPool.reset();
        this.playerBullets.getGroup().getChildren().forEach(b => { if (b.deactivate) b.deactivate(); });
        this.enemyBullets.getGroup().getChildren().forEach(b => { if (b.deactivate) b.deactivate(); });

        this.time.delayedCall(2000, () => {
            try {
                const timeInSeconds = Math.floor(this.elapsedTime / 1000);
                const timeLimit = this.stageData.timeLimit || 999;
                let stars = 1;
                if (this.partyDeaths === 0) stars = 2;
                if (this.partyDeaths === 0 && timeInSeconds <= timeLimit) stars = 3;

                const drops = DropSystem.generateStageDrops(this.stageData);
                const save = SaveManager.load();
                const isFirstClear = !save.progress.clearedStages[this.stageId];
                const firstClearRewards = isFirstClear ? DropSystem.generateFirstClearRewards(this.stageData) : [];

                SaveManager.markStageCleared(this.stageId, stars);

                const allWeapons = this.cache.json.get('weapons');
                drops.forEach(d => {
                    if (d.type === 'credit') SaveManager.addCredits(d.amount);
                    if (d.type === 'weapon' && allWeapons) {
                        const candidates = allWeapons.filter(w => w.rarity <= (d.rarity || 1));
                        if (candidates.length > 0) {
                            const wpn = candidates[Math.floor(Math.random() * candidates.length)];
                            TransformPotSystem.addToInventory('weapon', wpn);
                            d.weaponName = wpn.name;
                        }
                    }
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
                    partyDeaths: this.partyDeaths,
                    partyIds: this.partyData.map(p => p.id)
                });
            } catch (err) {
                console.error('Error transitioning to ResultScene:', err);
                // Failsafe: go to menu if ResultScene fails
                this.scene.stop('UIScene');
                this.scene.start('MenuScene');
            }
        });
    }

    onBossBreak(data) {
        if (data.isBroken) {
            this.cameras.main.shake(300, 0.01);
            AudioManager.playSFX('sfx_explosion');

            const boss = this.enemyPool.activeBoss;
            if (boss) {
                this.effects.bossBreak(boss.x, boss.y);
            }

            const breakText = this.add.text(
                FIELD_WIDTH / 2, FIELD_HEIGHT / 2 - 80, 'BREAK!',
                { fontSize: '36px', fontFamily: 'Arial', color: '#ffff00',
                  stroke: '#000000', strokeThickness: 5 }
            ).setOrigin(0.5).setDepth(100).setScrollFactor(0);

            this.tweens.add({
                targets: breakText, alpha: 0, scale: 1.5, y: breakText.y - 40,
                duration: 1500, onComplete: () => breakText.destroy()
            });
        }
    }

    onBossPhaseChange(data) {
        this.cameras.main.flash(500, 255, 50, 50);
        AudioManager.playSFX('sfx_explosion');

        if (data.phase === 2) {
            AudioManager.playBGM('bgm_boss');
        }

        const phaseText = this.add.text(
            FIELD_WIDTH / 2, FIELD_HEIGHT / 2 - 120, `PHASE ${data.phase}`,
            { fontSize: '28px', fontFamily: 'Arial', color: '#ff4444',
              stroke: '#000000', strokeThickness: 4 }
        ).setOrigin(0.5).setDepth(100).setScrollFactor(0);

        this.tweens.add({
            targets: phaseText, alpha: 0, y: phaseText.y - 50,
            duration: 2000, onComplete: () => phaseText.destroy()
        });
    }

    checkGameOver() {
        if (this.players.every(p => p.isDead)) {
            this.isGameOver = true;
            this.destroyExitPortal();
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
                    isGameOver: true,
                    partyIds: this.partyData.map(p => p.id)
                });
            });
        }
    }

    // ===== Main Loop =====

    update(time, delta) {
        if (this.isPaused || this.isGameOver || this.isCleared) {
            // Ensure all players stop moving when game is paused/over/cleared
            this.players.forEach(p => {
                if (p.body && (p.body.velocity.x !== 0 || p.body.velocity.y !== 0)) {
                    p.setVelocity(0, 0);
                }
            });
            return;
        }

        this.elapsedTime += delta;

        // Player movement and auto-fire
        if (this.activePlayer && !this.activePlayer.isDead) {
            const uiScene = this.scene.get('UIScene');
            const joyInput = uiScene?.getJoystickInput?.() || { active: false, dx: 0, dy: 0 };
            this.activePlayer.updateMovement(this.cursors, this.wasd, delta, joyInput);

            const activeEnemies = this.enemyPool.getActiveEnemies();
            this.activePlayer.updateAutoFire(activeEnemies, this.playerBullets, delta);

            // Inactive players: follow active player closely + auto-fire
            this.players.forEach((p, i) => {
                if (i !== this.activePlayerIndex && !p.isDead) {
                    const targetX = this.activePlayer.x + (i - this.activePlayerIndex) * 40;
                    const targetY = this.activePlayer.y + 30;
                    p.x += (targetX - p.x) * 0.15;
                    p.y += (targetY - p.y) * 0.15;
                    p.nameLabel.setPosition(p.x, p.y - 24);
                    p.updateAutoFire(activeEnemies, this.playerBullets, delta);
                    // Update sub-character facing toward nearest enemy
                    const subTarget = p.findNearestEnemy(activeEnemies);
                    if (subTarget) {
                        p.setFlipX(subTarget.x < p.x);
                    }
                }
            });
        }

        // Enemy AI
        this.enemyPool.updateAll(this.activePlayer, this.enemyBullets, delta);

        // Contact cooldown reduction
        this.enemyPool.getActiveEnemies().forEach(e => {
            if (e._contactCooldown > 0) e._contactCooldown -= delta;
        });

        // Passive: crit ramp
        this.players.forEach(p => {
            if (!p.isDead && p.passiveData?.critRamp) {
                const pd = p.passiveData;
                pd.critRampTimer = (pd.critRampTimer || 0) + delta;
                if (pd.critRampTimer >= 2000) {
                    pd.critRampTimer -= 2000;
                    if (pd.critRampCurrent < pd.critRampMax) {
                        pd.critRampCurrent = Math.min(pd.critRampMax, pd.critRampCurrent + pd.critRampRate);
                        p.critRate = p.charData.critRate + pd.critRampCurrent;
                    }
                }
            }
        });

        // Skill system update
        this.skillSystem.update(delta);

        // Skill input
        if (Phaser.Input.Keyboard.JustDown(this.skillKeys.Q)) this.tryUseSkill('skill1');
        if (Phaser.Input.Keyboard.JustDown(this.skillKeys.E)) this.tryUseSkill('skill2');
        if (Phaser.Input.Keyboard.JustDown(this.skillKeys.R)) this.tryUseUlt();

        // Dodge input
        if (Phaser.Input.Keyboard.JustDown(this.skillKeys.SPACE)) {
            if (this.activePlayer && !this.activePlayer.isDead) {
                const uiScene = this.scene.get('UIScene');
                const joyInput = uiScene?.getJoystickInput?.() || { active: false, dx: 0, dy: 0 };
                if (this.activePlayer.tryDodge(this.cursors, this.wasd, joyInput)) {
                    AudioManager.playSFX('sfx_dodge');
                }
            }
        }

        // Character switch
        if (Phaser.Input.Keyboard.JustDown(this.skillKeys.ONE)) this.switchCharacter(0);
        if (Phaser.Input.Keyboard.JustDown(this.skillKeys.TWO)) this.switchCharacter(1);
        if (Phaser.Input.Keyboard.JustDown(this.skillKeys.THREE)) this.switchCharacter(2);

        // Portal guide arrow: point toward exit portal
        if (this.portalGuideArrow && this.exitPortal && this.activePlayer) {
            const dx = this.exitPortal.x - this.activePlayer.x;
            const dy = this.exitPortal.y - this.activePlayer.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx) - Math.PI / 2;
            this.portalGuideArrow.setPosition(this.activePlayer.x, this.activePlayer.y - 40);
            this.portalGuideArrow.setRotation(angle);
            this.portalGuideArrow.setAlpha(dist < 80 ? 0 : 1);
        }

        // Time limit check
        const timeSec = Math.floor(this.elapsedTime / 1000);
        if (timeSec >= this.stageData.timeLimit && !this.isCleared) {
            this.checkGameOver();
        }
    }

    // ===== Skills =====

    tryUseSkill(skillSlot) {
        if (!this.activePlayer || this.activePlayer.isDead) return;
        const charId = this.activePlayer.charId;
        if (this.skillSystem.useSkill(charId, skillSlot)) {
            AudioManager.playSFX('sfx_skill');
            this.effects.skillActivation(this.activePlayer.x, this.activePlayer.y, this.activePlayer.attribute);
            const activeEnemies = this.enemyPool.getActiveEnemies();

            const charData = this.activePlayer.charData;
            if (charData.type === 'medic' && skillSlot === 'skill1') {
                const healBoost = 1 + (this.activePlayer.passiveData?.healBoost || 0);
                this.activePlayer.heal(Math.floor(this.activePlayer.maxHp * 0.2 * healBoost));
                this.showDamageNumber(this.activePlayer.x, this.activePlayer.y - 30, 'HEAL', false);
                this.effects.healEffect(this.activePlayer.x, this.activePlayer.y);
            } else if (charData.type === 'medic' && skillSlot === 'skill2') {
                const healBoost = 1 + (this.activePlayer.passiveData?.healBoost || 0);
                this.time.addEvent({
                    delay: 1000, repeat: 29, callback: () => {
                        this.players.forEach(p => {
                            if (!p.isDead) p.heal(Math.floor(p.maxHp * 0.02 * healBoost));
                        });
                    }
                });
                this.players.forEach(p => {
                    if (!p.isDead) {
                        this.showDamageNumber(p.x, p.y - 30, 'REGEN', false);
                        p.addStatusEffect('regen', 30000, '♥', '#88ff88');
                    }
                });
            } else if (charData.type === 'tank' && skillSlot === 'skill1') {
                this.activePlayer.useSkill(skillSlot, activeEnemies, this.playerBullets);
                const defBonus = Math.floor(this.activePlayer.def * 0.2);
                this.activePlayer.def += defBonus;
                this.showDamageNumber(this.activePlayer.x, this.activePlayer.y - 30, 'DEF UP', false);
                this.effects.buffPulse(this.activePlayer.x, this.activePlayer.y, 0x4488ff);
                this.activePlayer.addStatusEffect('def_up', 5000, '▲', '#4488ff');
                this.time.delayedCall(5000, () => { this.activePlayer.def -= defBonus; });
                return;
            } else if (charData.type === 'tank' && skillSlot === 'skill2') {
                this.shieldSystem.heal(300);
                this.showDamageNumber(this.activePlayer.x, this.activePlayer.y - 30, 'SHIELD', false);
                this.effects.buffPulse(this.activePlayer.x, this.activePlayer.y, 0x44ccff);
                this.activePlayer.addStatusEffect('shield_up', 3000, '◆', '#44ccff');
            } else if (charData.type === 'support' && skillSlot === 'skill2') {
                this.players.forEach(p => {
                    if (!p.isDead) {
                        const bonus = Math.floor(p.atk * 0.25);
                        p.atk += bonus;
                        this.showDamageNumber(p.x, p.y - 30, 'ATK UP', false);
                        this.effects.buffPulse(p.x, p.y, 0xff8844);
                        p.addStatusEffect('atk_up', 8000, '▲', '#ff8844');
                        this.time.delayedCall(8000, () => { p.atk -= bonus; });
                    }
                });
            } else {
                this.activePlayer.useSkill(skillSlot, activeEnemies, this.playerBullets);
            }
        }
    }

    tryUseUlt() {
        if (!this.activePlayer || this.activePlayer.isDead) return;
        const charId = this.activePlayer.charId;
        if (this.skillSystem.useUlt(charId)) {
            const activeEnemies = this.enemyPool.getActiveEnemies();

            AudioManager.playSFX('sfx_ult');
            this.cameras.main.flash(300, 255, 200, 50);
            this.cameras.main.shake(200, 0.005);
            this.effects.ultActivation(this.activePlayer.x, this.activePlayer.y, this.activePlayer.attribute);

            const ultData = this.skillSystem.ultGauge[charId];
            const ultName = ultData?.ultName || 'ULT';
            const ultText = this.add.text(
                this.activePlayer.x, this.activePlayer.y - 60,
                ultName,
                {
                    fontSize: '24px', fontFamily: 'Arial', color: '#ffcc00',
                    stroke: '#000000', strokeThickness: 4
                }
            ).setOrigin(0.5).setDepth(100);

            this.tweens.add({
                targets: ultText,
                y: ultText.y - 50,
                alpha: 0,
                scale: 1.5,
                duration: 1200,
                onComplete: () => ultText.destroy()
            });

            this.activePlayer.useUlt(activeEnemies, this.playerBullets);
        }
    }

    // ===== Cleanup =====

    cleanup() {
        if (this._onBlur) {
            window.removeEventListener('blur', this._onBlur);
        }
        if (this.collisionMapManager) {
            this.collisionMapManager.clearAll();
        }
        EventsCenter.off(GameEvents.WAVE_CLEARED, this.onWaveCleared, this);
        EventsCenter.off(GameEvents.AREA_CLEARED, this.onAreaCleared, this);
        EventsCenter.off(GameEvents.STAGE_CLEARED, this.onStageCleared, this);
        EventsCenter.off(GameEvents.BOSS_BREAK, this.onBossBreak, this);
        EventsCenter.off(GameEvents.BOSS_PHASE_CHANGE, this.onBossPhaseChange, this);
        this.destroyExitPortal();
        this.areaSplashObjects.forEach(obj => { if (obj && obj.destroy) obj.destroy(); });
        this.areaSplashObjects = [];
        // Obstacle cleanup is handled by Phaser's scene shutdown;
        // manually clearing during shutdown can cause body.size errors
        // on already-destroyed physics bodies
    }
}
