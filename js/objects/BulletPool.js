class BulletPool {
    constructor(scene, textureKey, size) {
        this.scene = scene;
        this.group = scene.physics.add.group({
            classType: Bullet,
            maxSize: size,
            runChildUpdate: true
        });

        const bodyRadius = textureKey === 'bullet_boss' ? 8 : 6;
        for (let i = 0; i < size; i++) {
            const bullet = new Bullet(scene, -100, -100, textureKey);
            this.group.add(bullet, true);
            // Set compact circular hitbox (texture may include glow area)
            if (bullet.body) {
                const offset = Math.max(0, Math.floor(bullet.width / 2 - bodyRadius));
                bullet.body.setCircle(bodyRadius, offset, offset);
            }
            bullet.deactivate();
        }
    }

    fire(x, y, angle, speed, damage, attribute, isPlayerBullet, options = {}) {
        const bullet = this.group.getFirstDead(false);
        if (!bullet) return null;
        bullet.fire(x, y, angle, speed, damage, attribute, isPlayerBullet, options);
        return bullet;
    }

    getGroup() {
        return this.group;
    }
}
