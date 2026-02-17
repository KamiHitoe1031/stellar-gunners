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

        this.maxHp = charData.hp;
        this.currentHp = charData.hp;
        this.atk = charData.atk;
        this.def = charData.def;
        this.shield = charData.shield;
        this.spd = charData.spd;
        this.critRate = charData.critRate;
        this.critDmg = charData.critDmg;
        this.weaponAtk = 0;

        if (charData.type === 'dps') this.atk = Math.floor(this.atk * 1.15);
        if (charData.type === 'tank') {
            this.def = Math.floor(this.def * 1.20);
            this.shield = Math.floor(this.shield * 1.20);
        }

        this.weaponConfig = WEAPON_CONFIGS[this.weaponType] || WEAPON_CONFIGS.pistol;
        this.currentMagazine = this.weaponConfig.magazineSize;
        this.isReloading = false;
        this.reloadTimer = 0;
        this.fireTimer = 0;
        this.fireInterval = 1000 / this.weaponConfig.fireRate;

        this.isActive = false;
        this.isDead = false;

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

    updateMovement(cursors, wasd, delta) {
        if (!this.isActive || this.isDead) {
            this.setVelocity(0, 0);
            return;
        }

        let vx = 0, vy = 0;
        if (cursors.left.isDown || wasd.A.isDown) vx = -1;
        if (cursors.right.isDown || wasd.D.isDown) vx = 1;
        if (cursors.up.isDown || wasd.W.isDown) vy = -1;
        if (cursors.down.isDown || wasd.S.isDown) vy = 1;

        if (vx !== 0 && vy !== 0) {
            const norm = 1 / Math.SQRT2;
            vx *= norm;
            vy *= norm;
        }

        this.setVelocity(vx * this.spd, vy * this.spd);
        this.nameLabel.setPosition(this.x, this.y - 24);
    }

    updateAutoFire(enemies, bulletPool, delta) {
        if (!this.isActive || this.isDead) return;

        if (this.isReloading) {
            this.reloadTimer -= delta;
            if (this.reloadTimer <= 0) {
                this.isReloading = false;
                this.currentMagazine = this.weaponConfig.magazineSize;
            }
            return;
        }

        this.fireTimer -= delta;
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
                    explosionRadius: this.weaponConfig.explosionRadius || 0
                }
            );
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
                { piercing: true }
            );
            if (bullet) {
                bullet.setTint(0x00ffff);
            }
        }
    }

    executeSupportSkill(skillSlot) {
        // Handled by GameScene based on character type
    }

    destroy(fromScene) {
        if (this.nameLabel) this.nameLabel.destroy();
        super.destroy(fromScene);
    }
}
