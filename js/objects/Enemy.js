class Enemy extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, texture) {
        super(scene, x, y, texture);
        this.enemyData = null;
        this.maxHp = 0;
        this.currentHp = 0;
        this.atk = 0;
        this.def = 0;
        this.spd = 0;
        this.attribute = '';
        this.attackPattern = '';
        this.bulletSpeed = 0;
        this.fireRate = 0;
        this.bulletCount = 1;
        this.fireTimer = 0;
        this.isDead = false;
        this.hpBar = null;
    }

    init(enemyData) {
        this.enemyData = enemyData;
        this.maxHp = enemyData.hp;
        this.currentHp = enemyData.hp;
        this.atk = enemyData.atk;
        this.def = enemyData.def;
        this.spd = enemyData.spd;
        this.attribute = enemyData.attribute;
        this.attackPattern = enemyData.attackPattern;
        this.bulletSpeed = enemyData.bulletSpeed || 200;
        this.fireRate = enemyData.fireRate || 1;
        this.bulletCount = enemyData.bulletCount || 1;
        this.isDead = false;
        this.fireTimer = 1000 + Math.random() * 2000;
        this.animState = 'idle';
        this.spriteKey = enemyData.spriteKey;

        this.setActive(true);
        this.setVisible(true);
        if (this.body) {
            this.body.enable = true;
        }
        this.setAlpha(1);
        this.setDepth(40);

        // Set display size based on category
        let displaySize = 24;
        if (enemyData.category === 'elite') displaySize = 40;
        if (enemyData.category === 'boss') displaySize = 72;
        this._displaySize = displaySize;
        this.setDisplaySize(displaySize, displaySize);
        if (this.body) this.body.setSize(displaySize - 4, displaySize - 4);

        const barWidth = Math.max(displaySize, 32);
        if (!this.hpBar) {
            this.hpBar = new HealthBar(this.scene, this.x - barWidth / 2, this.y - displaySize / 2 - 6, barWidth, 4, 0xff0000);
        }
        this.hpBar.setVisible(true);
        this.hpBar.setPercent(1);

        // Start idle animation
        this.playEnemyAnim('idle');
    }

    playEnemyAnim(state) {
        if (!this.spriteKey) return;
        const animKey = `${this.spriteKey}_${state}`;
        if (this.scene && this.scene.anims.exists(animKey) && this.animState !== state) {
            this.animState = state;
            this.play(animKey, true);
        }
    }

    takeDamage(damage) {
        if (this.isDead) return false;
        this.currentHp = Math.max(0, this.currentHp - damage);
        if (this.hpBar) {
            this.hpBar.setPercent(this.currentHp / this.maxHp);
        }

        if (this.currentHp <= 0) {
            this.die();
            return true;
        }

        // Hit animation
        this.playEnemyAnim('hit');
        this.scene.time.delayedCall(120, () => {
            if (!this.isDead && this.animState === 'hit') {
                this.animState = ''; // allow next anim
            }
        });
        return false;
    }

    die() {
        this.isDead = true;
        if (this.body) this.body.enable = false;
        if (this.hpBar) this.hpBar.setVisible(false);

        // Play death animation then deactivate
        this.playEnemyAnim('death');
        this.once('animationcomplete', () => {
            this.setActive(false);
            this.setVisible(false);
        });
        // Fallback timeout in case anim doesn't fire
        this.scene.time.delayedCall(500, () => {
            if (this.isDead) {
                this.setActive(false);
                this.setVisible(false);
            }
        });
    }

    updateAI(player, bulletPool, delta) {
        if (this.isDead || !this.active) return;

        if (this.hpBar) {
            const ds = this._displaySize || 24;
            const barW = Math.max(ds, 32);
            this.hpBar.setPosition(this.x - barW / 2, this.y - ds / 2 - 6);
        }

        if (!player || player.isDead) return;

        switch (this.attackPattern) {
            case 'chase_shoot':
                this.doChaseShoot(player, bulletPool, delta);
                break;
            case 'chase_burst':
                this.doChaseBurst(player, bulletPool, delta);
                break;
            case 'stationary_snipe':
                this.doStationarySnipe(player, bulletPool, delta);
                break;
            case 'chase_contact':
                this.doChaseContact(player, delta);
                break;
            case 'charge_shoot':
                this.doChargeShoot(player, bulletPool, delta);
                break;
            case 'guard_shoot':
                this.doGuardShoot(player, bulletPool, delta);
                break;
            case 'support_heal':
                this.doSupportHeal(delta);
                break;
            default:
                this.doChaseShoot(player, bulletPool, delta);
        }
    }

    doChaseShoot(player, bulletPool, delta) {
        this.moveToward(player, this.spd);
        this.fireTimer -= delta;
        if (this.fireTimer <= 0) {
            this.shootAt(player, bulletPool);
            this.fireTimer = 1000 / this.fireRate;
        }
    }

    doChaseBurst(player, bulletPool, delta) {
        this.moveToward(player, this.spd);
        this.fireTimer -= delta;
        if (this.fireTimer <= 0) {
            for (let i = 0; i < this.bulletCount; i++) {
                this.scene.time.delayedCall(i * 100, () => {
                    if (this.active && !this.isDead) {
                        this.shootAt(player, bulletPool);
                    }
                });
            }
            this.fireTimer = 1000 / this.fireRate;
        }
    }

    doStationarySnipe(player, bulletPool, delta) {
        this.setVelocity(0, 0);
        if (this.animState !== 'hit' && this.animState !== 'death') this.playEnemyAnim('idle');
        this.fireTimer -= delta;
        if (this.fireTimer <= 0) {
            this.shootAt(player, bulletPool);
            this.fireTimer = 1000 / this.fireRate;
        }
    }

    doChaseContact(player, delta) {
        this.moveToward(player, this.spd);
    }

    doChargeShoot(player, bulletPool, delta) {
        this.moveToward(player, this.spd * 0.6);
        this.fireTimer -= delta;
        if (this.fireTimer <= 0) {
            const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
            for (let i = 0; i < this.bulletCount; i++) {
                const spread = (i - (this.bulletCount - 1) / 2) * 0.15;
                bulletPool.fire(
                    this.x, this.y, angle + spread,
                    this.bulletSpeed, this.atk, this.attribute, false
                );
            }
            this.fireTimer = 1000 / this.fireRate;
        }
    }

    doGuardShoot(player, bulletPool, delta) {
        this.moveToward(player, this.spd * 0.5);
        this.fireTimer -= delta;
        if (this.fireTimer <= 0) {
            this.shootAt(player, bulletPool);
            this.fireTimer = 1000 / this.fireRate;
        }
    }

    doSupportHeal(delta) {
        this.setVelocity(0, 0);
        if (this.animState !== 'hit' && this.animState !== 'death') this.playEnemyAnim('idle');
    }

    moveToward(target, speed) {
        const angle = Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y);
        this.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
        if (this.animState !== 'hit' && this.animState !== 'death') {
            this.playEnemyAnim('walk');
        }
        // Flip based on direction
        this.setFlipX(Math.cos(angle) < 0);
    }

    shootAt(player, bulletPool) {
        if (!bulletPool) return;
        const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
        const spread = (Math.random() - 0.5) * 0.1;
        bulletPool.fire(
            this.x, this.y, angle + spread,
            this.bulletSpeed, this.atk, this.attribute, false
        );
    }

    destroy(fromScene) {
        if (this.hpBar) {
            this.hpBar.destroy();
            this.hpBar = null;
        }
        super.destroy(fromScene);
    }
}
