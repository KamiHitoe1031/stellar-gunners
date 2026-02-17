class Boss extends Enemy {
    constructor(scene, x, y, texture) {
        super(scene, x, y, texture);
        this.breakSystem = new BreakSystem();
        this.currentPhase = 1;
        this.phasePatterns = [];
        this.patternTimer = 0;
        this.currentPatternIndex = 0;
        this.breakTimer = 0;
    }

    init(enemyData) {
        super.init(enemyData);
        this.breakSystem.init(enemyData.breakGauge || 1000);
        this.currentPhase = 1;
        this.breakTimer = 0;

        this.phasePatterns = [
            { hpThreshold: 1.0, patterns: ['spread_shot', 'aimed_shot', 'laser_sweep'] },
            { hpThreshold: 0.5, patterns: ['barrage', 'laser_cross', 'charge_attack'] }
        ];

        this.patternTimer = 2000;
        this.currentPatternIndex = 0;

        this.setDepth(45);
        EventsCenter.emit(GameEvents.BOSS_SPAWNED, {
            name: enemyData.name,
            hp: this.maxHp,
            breakGauge: enemyData.breakGauge
        });
    }

    takeDamage(damage) {
        if (this.isDead) return false;

        const damageMultiplier = this.breakSystem.isBroken ? BREAK_DAMAGE_BONUS : 1.0;
        const actualDamage = Math.floor(damage * damageMultiplier);

        this.currentHp = Math.max(0, this.currentHp - actualDamage);
        if (this.hpBar) {
            this.hpBar.setPercent(this.currentHp / this.maxHp);
        }

        this.scene.tweens.add({
            targets: this,
            alpha: 0.6,
            duration: 80,
            yoyo: true
        });

        if (!this.breakSystem.isBroken) {
            const breakDmg = DamageSystem.calculateBreakDamage(
                { type: 'dps' }, actualDamage
            );
            this.breakSystem.applyBreakDamage(breakDmg);
        }

        const hpPercent = this.currentHp / this.maxHp;
        if (this.currentPhase === 1 && hpPercent <= 0.5) {
            this.currentPhase = 2;
            this.currentPatternIndex = 0;
            EventsCenter.emit(GameEvents.BOSS_PHASE_CHANGE, { phase: 2 });
        }

        if (this.currentHp <= 0) {
            this.die();
            return true;
        }
        return false;
    }

    updateAI(player, bulletPool, delta) {
        if (this.isDead || !this.active) return;

        if (this.hpBar) {
            this.hpBar.setPosition(this.x - 36, this.y - 44);
        }

        if (this.breakSystem.isBroken) {
            this.breakTimer -= delta;
            this.setVelocity(0, 0);
            this.setTint(0xffff00);
            if (this.breakTimer <= 0) {
                this.breakSystem.endBreak();
                this.clearTint();
            }
            return;
        }

        if (!player || player.isDead) return;

        this.patternTimer -= delta;
        if (this.patternTimer <= 0) {
            this.executePattern(player, bulletPool);
            this.patternTimer = 2000 + Math.random() * 1000;
        }

        this.moveToward(player, this.spd * 0.5);
    }

    onBreak() {
        this.breakTimer = BREAK_DURATION;
    }

    executePattern(player, bulletPool) {
        const phase = this.phasePatterns[this.currentPhase - 1];
        if (!phase) return;
        const patterns = phase.patterns;
        const patternName = patterns[this.currentPatternIndex % patterns.length];
        this.currentPatternIndex++;

        switch (patternName) {
            case 'spread_shot':
                this.doSpreadShot(player, bulletPool);
                break;
            case 'aimed_shot':
                this.doAimedShot(player, bulletPool);
                break;
            case 'laser_sweep':
                this.doLaserSweep(player, bulletPool);
                break;
            case 'barrage':
                this.doBarrage(player, bulletPool);
                break;
            case 'laser_cross':
                this.doLaserCross(bulletPool);
                break;
            case 'charge_attack':
                this.doChargeAttack(player, bulletPool);
                break;
            default:
                this.doSpreadShot(player, bulletPool);
        }
    }

    doSpreadShot(player, bulletPool) {
        const baseAngle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
        const count = 8;
        for (let i = 0; i < count; i++) {
            const angle = baseAngle + (i - count / 2) * 0.2;
            bulletPool.fire(this.x, this.y, angle, this.bulletSpeed, this.atk, this.attribute, false);
        }
    }

    doAimedShot(player, bulletPool) {
        const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
        for (let i = 0; i < 3; i++) {
            this.scene.time.delayedCall(i * 150, () => {
                if (this.active && !this.isDead) {
                    bulletPool.fire(this.x, this.y, angle, this.bulletSpeed * 1.5, this.atk * 1.3, this.attribute, false);
                }
            });
        }
    }

    doLaserSweep(player, bulletPool) {
        const baseAngle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
        for (let i = 0; i < 12; i++) {
            this.scene.time.delayedCall(i * 80, () => {
                if (this.active && !this.isDead) {
                    const angle = baseAngle - 0.6 + (i / 11) * 1.2;
                    bulletPool.fire(this.x, this.y, angle, this.bulletSpeed, this.atk * 0.8, this.attribute, false);
                }
            });
        }
    }

    doBarrage(player, bulletPool) {
        const count = 16;
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            bulletPool.fire(this.x, this.y, angle, this.bulletSpeed * 0.8, this.atk, this.attribute, false);
        }
    }

    doLaserCross(bulletPool) {
        for (let d = 0; d < 4; d++) {
            const baseAngle = d * Math.PI / 2;
            for (let i = 0; i < 5; i++) {
                this.scene.time.delayedCall(i * 100, () => {
                    if (this.active && !this.isDead) {
                        bulletPool.fire(this.x, this.y, baseAngle, this.bulletSpeed * (0.8 + i * 0.1), this.atk * 0.9, this.attribute, false);
                    }
                });
            }
        }
    }

    doChargeAttack(player, bulletPool) {
        const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
        this.setVelocity(Math.cos(angle) * this.spd * 3, Math.sin(angle) * this.spd * 3);
        this.scene.time.delayedCall(500, () => {
            if (this.active && !this.isDead) {
                this.setVelocity(0, 0);
                for (let i = 0; i < 12; i++) {
                    const a = (i / 12) * Math.PI * 2;
                    bulletPool.fire(this.x, this.y, a, this.bulletSpeed, this.atk * 1.2, this.attribute, false);
                }
            }
        });
    }
}
