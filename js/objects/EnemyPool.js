class EnemyPool {
    constructor(scene, size) {
        this.scene = scene;
        this.group = scene.physics.add.group({ runChildUpdate: false });
        this.pool = [];

        for (let i = 0; i < size; i++) {
            const enemy = new Enemy(scene, -200, -200, 'enemy_default');
            scene.add.existing(enemy);
            scene.physics.add.existing(enemy);
            this.group.add(enemy);
            enemy.setActive(false);
            enemy.setVisible(false);
            if (enemy.body) enemy.body.enable = false;
            this.pool.push(enemy);
        }

        this.activeBoss = null;
    }

    spawn(enemyData, x, y) {
        if (enemyData.category === 'boss') {
            return this.spawnBoss(enemyData, x, y);
        }

        for (const enemy of this.pool) {
            if (!enemy.active && !enemy.isDead) {
                enemy.setPosition(x, y);
                enemy.setTexture(enemyData.spriteKey || 'enemy_default');
                enemy.init(enemyData);
                return enemy;
            }
        }

        const enemy = new Enemy(this.scene, x, y, enemyData.spriteKey || 'enemy_default');
        this.scene.add.existing(enemy);
        this.scene.physics.add.existing(enemy);
        enemy.init(enemyData);
        this.group.add(enemy);
        this.pool.push(enemy);
        return enemy;
    }

    spawnBoss(enemyData, x, y) {
        const boss = new Boss(this.scene, x, y, enemyData.spriteKey || 'boss_default');
        this.scene.add.existing(boss);
        this.scene.physics.add.existing(boss);
        boss.init(enemyData);
        this.group.add(boss);
        this.pool.push(boss);
        this.activeBoss = boss;

        // Use a tracked handler so we can clean up if needed
        const breakHandler = (data) => {
            if (data.isBroken && boss.active && !boss.isDead) {
                boss.onBreak();
            }
        };
        EventsCenter.on(GameEvents.BOSS_BREAK, breakHandler);
        boss._breakHandler = breakHandler;

        return boss;
    }

    getActiveEnemies() {
        return this.pool.filter(e => e.active && !e.isDead);
    }

    getGroup() {
        return this.group;
    }

    updateAll(player, bulletPool, delta) {
        this.pool.forEach(enemy => {
            if (enemy.active && !enemy.isDead) {
                enemy.updateAI(player, bulletPool, delta);

                // Check if enemy is stuck against walls
                if (enemy.checkStuck(delta)) {
                    this._teleportStuckEnemy(enemy, player);
                }
            }
        });
    }

    _teleportStuckEnemy(enemy, player) {
        if (!player || player.isDead) return;
        const cmm = this.scene.collisionMapManager;
        if (cmm && cmm.hasGrid()) {
            // Find walkable position near the player
            const offsetAngle = Math.random() * Math.PI * 2;
            const offsetDist = 150 + Math.random() * 100;
            const targetX = player.x + Math.cos(offsetAngle) * offsetDist;
            const targetY = player.y + Math.sin(offsetAngle) * offsetDist;
            const pos = cmm.getNearestWalkablePosition(targetX, targetY);
            enemy.setPosition(pos.x, pos.y);
        } else {
            // No collision map: teleport near player
            const offsetAngle = Math.random() * Math.PI * 2;
            const offsetDist = 150 + Math.random() * 100;
            enemy.setPosition(
                player.x + Math.cos(offsetAngle) * offsetDist,
                player.y + Math.sin(offsetAngle) * offsetDist
            );
        }
        enemy._stuckTimer = 0;
        console.log('Teleported stuck enemy to near player');
    }

    reset() {
        // Clean up boss break listener
        if (this.activeBoss && this.activeBoss._breakHandler) {
            EventsCenter.off(GameEvents.BOSS_BREAK, this.activeBoss._breakHandler);
            this.activeBoss._breakHandler = null;
        }
        this.pool.forEach(enemy => {
            enemy.isDead = false;
            enemy.setActive(false);
            enemy.setVisible(false);
            if (enemy.body) enemy.body.enable = false;
            if (enemy.hpBar) enemy.hpBar.setVisible(false);
        });
        this.activeBoss = null;
    }
}
