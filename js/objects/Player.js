class Player extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, charData) {
        super(scene, x, y, charData.spriteKey);
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.charData = charData;
        this.charId = charData.id;
        this.attribute = charData.attribute;
        this.charType = charData.type;
        this.weaponType = charData.weaponType;

        // Stats are pre-calculated by EquipmentSystem (level + equipment + type bonus)
        this.maxHp = charData.hp;
        this.currentHp = charData.hp;
        this.atk = charData.atk;
        this.def = charData.def;
        this.shield = charData.shield;
        this.spd = charData.spd;
        this.critRate = charData.critRate;
        this.critDmg = charData.critDmg;
        this.weaponAtk = charData.weaponAtk || 0;

        this.weaponConfig = WEAPON_CONFIGS[this.weaponType] || WEAPON_CONFIGS.pistol;
        this.currentMagazine = this.weaponConfig.magazineSize;
        this.isReloading = false;
        this.reloadTimer = 0;
        this.fireTimer = 0;
        this.fireInterval = 1000 / this.weaponConfig.fireRate;

        this.isActive = false;
        this.isDead = false;

        // Dodge state
        this.dodgeCooldown = 0;
        this.isDodging = false;
        this.dodgeTimer = 0;
        this.dodgeDirX = 0;
        this.dodgeDirY = 0;

        // Status effects
        this.statusEffects = [];
        this.statusIcons = [];

        // Passive skill data
        this.passiveName = charData.passiveName || '';
        this.passiveData = this.initPassive(charData);

        // Apply weapon part bonuses to weapon config
        if (charData.partBonuses) {
            this.weaponConfig = { ...this.weaponConfig };
            const pb = charData.partBonuses;
            if (pb.range) this.weaponConfig.range += Math.floor(this.weaponConfig.range * pb.range / 100);
            if (pb.fireRate) this.weaponConfig.fireRate *= (1 + pb.fireRate / 100);
            if (pb.magazineSize) this.weaponConfig.magazineSize += Math.floor(this.weaponConfig.magazineSize * pb.magazineSize / 100);
            if (pb.reloadSpeed) this.weaponConfig.reloadTime = Math.floor(this.weaponConfig.reloadTime * (1 - pb.reloadSpeed / 100));
            if (pb.stability) this.weaponConfig.spreadAngle = Math.max(0, this.weaponConfig.spreadAngle * (1 - pb.stability / 100));
            this.currentMagazine = this.weaponConfig.magazineSize;
            this.fireInterval = 1000 / this.weaponConfig.fireRate;
        }

        // Apply passive: reload reduction (Reyna)
        if (this.passiveData.reloadReduction) {
            this.weaponConfig = { ...this.weaponConfig };
            this.weaponConfig.reloadTime = Math.floor(this.weaponConfig.reloadTime * (1 - this.passiveData.reloadReduction));
        }

        this.setCollideWorldBounds(true);
        this.setDisplaySize(48, 48);
        this.body.setSize(28, 28);
        this.setDepth(50);

        this.nameLabel = scene.add.text(x, y - 24, charData.name.split('・')[0], {
            fontSize: '11px', fontFamily: 'Arial', color: '#ffffff',
            stroke: '#000000', strokeThickness: 2
        }).setOrigin(0.5).setDepth(51);
    }

    setAsActive(active) {
        this.isActive = active;
        this.setAlpha(active ? 1.0 : 0.5);
        this.nameLabel.setAlpha(active ? 1.0 : 0.3);
    }

    takeDamage(amount) {
        if (this.isDead) return;
        this.currentHp = Math.max(0, this.currentHp - amount);
        EventsCenter.emit(GameEvents.HP_CHANGED, {
            charId: this.charId,
            current: this.currentHp,
            max: this.maxHp
        });
        if (this.currentHp <= 0) {
            this.isDead = true;
            this.setAlpha(0.2);
            this.setActive(false);
        }
    }

    heal(amount) {
        if (this.isDead) return;
        this.currentHp = Math.min(this.maxHp, this.currentHp + amount);
        EventsCenter.emit(GameEvents.HP_CHANGED, {
            charId: this.charId,
            current: this.currentHp,
            max: this.maxHp
        });
    }

    getHpPercent() {
        return this.maxHp > 0 ? this.currentHp / this.maxHp : 0;
    }

    updateMovement(cursors, wasd, delta, joyInput) {
        if (!this.isActive || this.isDead) {
            this.setVelocity(0, 0);
            return;
        }

        // Update dodge cooldown
        if (this.dodgeCooldown > 0) this.dodgeCooldown -= delta;

        // During dodge, move in dodge direction
        if (this.isDodging) {
            this.dodgeTimer -= delta;
            if (this.dodgeTimer <= 0) {
                this.isDodging = false;
                this.setAlpha(1.0);
            } else {
                const speed = this.spd * DODGE_SPEED_MULT;
                this.setVelocity(this.dodgeDirX * speed, this.dodgeDirY * speed);
                // Flicker effect during dodge
                this.setAlpha(Math.sin(this.dodgeTimer * 0.03) > 0 ? 0.3 : 0.8);
                this.nameLabel.setPosition(this.x, this.y - 24);
                // Dodge trail (throttled)
                this._dodgeTrailTimer = (this._dodgeTrailTimer || 0) + delta;
                if (this._dodgeTrailTimer >= 60 && this.scene.effects) {
                    this._dodgeTrailTimer = 0;
                    this.scene.effects.dodgeTrail(this.x, this.y, this.dodgeDirX, this.dodgeDirY, this.attribute);
                }
                return;
            }
        }

        // Update status effect icons
        this.updateStatusIcons();

        let vx = 0, vy = 0;

        // Keyboard input
        if (cursors.left.isDown || wasd.A.isDown) vx = -1;
        if (cursors.right.isDown || wasd.D.isDown) vx = 1;
        if (cursors.up.isDown || wasd.W.isDown) vy = -1;
        if (cursors.down.isDown || wasd.S.isDown) vy = 1;

        // Virtual joystick input (touch)
        if (joyInput && joyInput.active && (Math.abs(joyInput.dx) > 0.1 || Math.abs(joyInput.dy) > 0.1)) {
            vx = joyInput.dx;
            vy = joyInput.dy;
        }

        if (vx !== 0 && vy !== 0) {
            const len = Math.sqrt(vx * vx + vy * vy);
            if (len > 1) {
                vx /= len;
                vy /= len;
            }
        }

        // Apply speed modifiers from status effects
        let speedMult = 1.0;
        for (const effect of this.statusEffects) {
            if (effect.speedMult !== undefined) {
                speedMult = Math.min(speedMult, effect.speedMult);
            }
        }

        this.setVelocity(vx * this.spd * speedMult, vy * this.spd * speedMult);
        this.nameLabel.setPosition(this.x, this.y - 24);
    }

    tryDodge(cursors, wasd, joyInput) {
        if (this.isDodging || this.dodgeCooldown > 0 || this.isDead) return false;

        // Determine dodge direction from current input
        let dx = 0, dy = 0;
        if (cursors.left.isDown || wasd.A.isDown) dx = -1;
        if (cursors.right.isDown || wasd.D.isDown) dx = 1;
        if (cursors.up.isDown || wasd.W.isDown) dy = -1;
        if (cursors.down.isDown || wasd.S.isDown) dy = 1;

        if (joyInput && joyInput.active && (Math.abs(joyInput.dx) > 0.1 || Math.abs(joyInput.dy) > 0.1)) {
            dx = joyInput.dx;
            dy = joyInput.dy;
        }

        // If no input, dodge backward (away from nearest movement)
        if (dx === 0 && dy === 0) {
            dx = this.body.velocity.x !== 0 ? -Math.sign(this.body.velocity.x) : 0;
            dy = this.body.velocity.y !== 0 ? -Math.sign(this.body.velocity.y) : -1;
        }

        // Normalize
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len > 0) {
            dx /= len;
            dy /= len;
        }

        this.isDodging = true;
        this.dodgeTimer = DODGE_DURATION;
        this.dodgeCooldown = DODGE_COOLDOWN;
        this.dodgeDirX = dx;
        this.dodgeDirY = dy;

        return true;
    }

    updateAutoFire(enemies, bulletPool, delta) {
        if (this.isDead) return;

        if (this.isReloading) {
            this.reloadTimer -= delta;
            if (this.reloadTimer <= 0) {
                this.isReloading = false;
                this.currentMagazine = this.weaponConfig.magazineSize;
            }
            return;
        }

        // Inactive party members fire at 70% rate
        const rateMult = this.isActive ? 1.0 : 0.7;
        this.fireTimer -= delta * rateMult;
        if (this.fireTimer > 0) return;

        if (this.currentMagazine <= 0) {
            this.isReloading = true;
            this.reloadTimer = this.weaponConfig.reloadTime;
            return;
        }

        const target = this.findNearestEnemy(enemies);
        if (!target) return;

        const dist = Phaser.Math.Distance.Between(this.x, this.y, target.x, target.y);
        if (dist > this.weaponConfig.range) return;

        this.fireAtTarget(target, bulletPool);
        this.fireTimer = this.fireInterval;
        this.currentMagazine--;
    }

    initPassive(charData) {
        const passive = {};
        switch (charData.passiveName) {
            case 'クイックリロード':
                passive.reloadReduction = 0.20; // -20% reload time
                break;
            case 'メディカルオーラ':
                passive.healBoost = 0.15; // +15% heal effectiveness
                break;
            case 'ヘビーアーマー':
                passive.damageReduction = 0.10; // -10% incoming damage
                break;
            case 'ウィークポイント':
                passive.critBreakBonus = 0.20; // +20% break on crit
                break;
            case 'チームスピリット':
                passive.killAtkStack = true;
                passive.killAtkCurrent = 0;
                passive.killAtkMax = 0.15; // max +15%
                passive.killAtkPerKill = 0.01; // +1% per kill
                break;
            case 'コールドプレシジョン':
                passive.critRamp = true;
                passive.critRampCurrent = 0;
                passive.critRampMax = 20; // max +20%
                passive.critRampRate = 2; // +2% per 2s
                passive.critRampTimer = 0;
                break;
        }
        return passive;
    }

    findNearestEnemy(enemies) {
        let nearest = null;
        let minDist = Infinity;
        enemies.forEach(enemy => {
            if (!enemy.active || enemy.isDead) return;
            const d = Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y);
            if (d < minDist) {
                minDist = d;
                nearest = enemy;
            }
        });
        return nearest;
    }

    fireAtTarget(target, bulletPool) {
        const baseAngle = Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y);
        const pelletsPerShot = this.weaponConfig.pelletsPerShot || 1;
        const spreadRad = Phaser.Math.DegToRad(this.weaponConfig.spreadAngle);

        for (let i = 0; i < pelletsPerShot; i++) {
            const spread = (Math.random() - 0.5) * spreadRad;
            const angle = baseAngle + spread;
            bulletPool.fire(
                this.x, this.y, angle,
                this.weaponConfig.bulletSpeed,
                this.atk,
                this.attribute,
                true,
                {
                    piercing: this.weaponConfig.piercing || false,
                    explosionRadius: this.weaponConfig.explosionRadius || 0,
                    ownerCritRate: this.critRate,
                    ownerCritDmg: this.critDmg
                }
            );
        }

        // Muzzle flash effect
        if (this.scene.effects) {
            this.scene.effects.muzzleFlash(this.x, this.y, baseAngle);
        }
    }

    useSkill(skillSlot, enemies, bulletPool) {
        const data = this.charData;
        let mult, hits;
        if (skillSlot === 'skill1') {
            mult = data.skill1DmgMult || 0;
            hits = 1;
        } else {
            mult = data.skill2DmgMult || 0;
            hits = data.skill2Hits || 1;
        }

        if (mult <= 0) {
            this.executeSupportSkill(skillSlot);
            return;
        }

        const target = this.findNearestEnemy(enemies);
        if (!target) return;

        const baseAngle = Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y);
        for (let i = 0; i < Math.max(hits, 1); i++) {
            const spread = (Math.random() - 0.5) * 0.3;
            const angle = baseAngle + spread;
            const bullet = bulletPool.fire(
                this.x, this.y, angle,
                this.weaponConfig.bulletSpeed * 1.5,
                Math.floor(this.atk * mult),
                this.attribute,
                true,
                { piercing: true, ownerCritRate: this.critRate, ownerCritDmg: this.critDmg }
            );
            if (bullet) {
                bullet.setTint(0x00ffff);
            }
        }
    }

    executeSupportSkill(skillSlot) {
        // Handled by GameScene based on character type
    }

    useUlt(enemies, bulletPool) {
        const data = this.charData;
        const mult = data.ultDmgMult || 3.0;

        if (mult <= 0) return;

        // ULT fires a burst of piercing projectiles in a spread
        const target = this.findNearestEnemy(enemies);
        const baseAngle = target
            ? Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y)
            : 0;

        const projectiles = 12;
        const spread = Phaser.Math.DegToRad(60);

        for (let i = 0; i < projectiles; i++) {
            const angle = baseAngle + (i / (projectiles - 1) - 0.5) * spread;
            const bullet = bulletPool.fire(
                this.x, this.y, angle,
                this.weaponConfig.bulletSpeed * 2.0,
                Math.floor(this.atk * mult / projectiles * 2),
                this.attribute,
                true,
                { piercing: true, ownerCritRate: this.critRate, ownerCritDmg: this.critDmg }
            );
            if (bullet) {
                bullet.setTint(0xffcc00);
                bullet.setScale(1.5);
            }
        }
    }

    // Status effect management
    addStatusEffect(name, duration, icon, color, extra) {
        // Remove existing same-name effect
        this.removeStatusEffect(name);
        const effect = { name, remaining: duration, duration, icon, color };
        if (extra) Object.assign(effect, extra);
        if (effect.dot) effect._tickTimer = 0;
        this.statusEffects.push(effect);
    }

    removeStatusEffect(name) {
        const idx = this.statusEffects.findIndex(e => e.name === name);
        if (idx >= 0) this.statusEffects.splice(idx, 1);
    }

    hasStatusEffect(name) {
        return this.statusEffects.some(e => e.name === name);
    }

    updateStatusIcons() {
        // Clean up old icons
        this.statusIcons.forEach(ic => ic.destroy());
        this.statusIcons = [];

        const dt = this.scene.game.loop.delta;

        // Update durations, process DoT, remove expired
        this.statusEffects = this.statusEffects.filter(e => {
            e.remaining -= dt;
            // DoT processing
            if (e.dot && e.remaining > 0) {
                e._tickTimer = (e._tickTimer || 0) + dt;
                if (e._tickTimer >= (e.tickInterval || 1000)) {
                    e._tickTimer -= e.tickInterval || 1000;
                    const dotDmg = Math.floor(this.maxHp * (e.tickDamage || 0.02));
                    this.takeDamage(dotDmg);
                }
            }
            return e.remaining > 0;
        });

        // Draw icons above player
        this.statusEffects.forEach((effect, i) => {
            const ix = this.x - ((this.statusEffects.length - 1) * 12) / 2 + i * 12;
            const iy = this.y - 36;
            const icon = this.scene.add.text(ix, iy, effect.icon, {
                fontSize: '10px', fontFamily: 'Arial', color: effect.color,
                stroke: '#000000', strokeThickness: 1
            }).setOrigin(0.5).setDepth(52);
            this.statusIcons.push(icon);
        });
    }

    destroy(fromScene) {
        if (this.nameLabel) this.nameLabel.destroy();
        this.statusIcons.forEach(ic => ic.destroy());
        this.statusIcons = [];
        super.destroy(fromScene);
    }
}
