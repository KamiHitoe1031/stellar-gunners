class BulletPool {
    constructor(scene, textureKey, size) {
        this.scene = scene;
        this.group = scene.physics.add.group({
            classType: Bullet,
            maxSize: size,
            runChildUpdate: true
        });

        for (let i = 0; i < size; i++) {
            const bullet = new Bullet(scene, -100, -100, textureKey);
            this.group.add(bullet, true);
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
