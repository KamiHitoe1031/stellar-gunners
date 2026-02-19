class Bullet extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, texture) {
        super(scene, x, y, texture);
        scene.add.existing(this);
        scene.physics.add.existing(this);
        this.damage = 0;
        this.attribute = '';
        this.isPlayerBullet = true;
        this.piercing = false;
        this.explosionRadius = 0;
        this.piercedTargets = new Set();
        // Owner stats for damage calculation
        this.ownerCritRate = 5;
        this.ownerCritDmg = 150;
    }

    fire(x, y, angle, speed, damage, attribute, isPlayerBullet, options = {}) {
        this.setPosition(x, y);
        this.setActive(true);
        this.setVisible(true);
        this.body.enable = true;

        this.damage = damage;
        this.attribute = attribute;
        this.isPlayerBullet = isPlayerBullet;
        this.piercing = options.piercing || false;
        this.explosionRadius = options.explosionRadius || 0;
        this.ownerCritRate = options.ownerCritRate || 5;
        this.ownerCritDmg = options.ownerCritDmg || 150;
        this.piercedTargets.clear();

        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;
        this.setVelocity(vx, vy);
        this.setRotation(angle);
    }

    deactivate() {
        this.setActive(false);
        this.setVisible(false);
        if (this.body) {
            this.body.enable = false;
            this.setVelocity(0, 0);
        }
    }

    preUpdate(time, delta) {
        super.preUpdate(time, delta);
        if (!this.active) return;
        const margin = 50;
        if (this.x < -margin || this.x > FIELD_WIDTH + margin ||
            this.y < -margin || this.y > FIELD_HEIGHT + margin) {
            this.deactivate();
        }
    }
}
