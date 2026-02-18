class Obstacle extends Phaser.Physics.Arcade.Image {
    constructor(scene, x, y, textureKey, obstacleType) {
        super(scene, x, y, textureKey);
        scene.add.existing(this);
        scene.physics.add.existing(this, true); // static body

        this.obstacleType = obstacleType;
        const config = OBSTACLE_TYPES[obstacleType] || OBSTACLE_TYPES.wall;
        this.maxHp = config.hp || Infinity;
        this.currentHp = this.maxHp;
        this.isDestructible = config.destructible || false;

        this.setDisplaySize(config.width, config.height);
        if (this.body) {
            this.body.setSize(config.width, config.height);
            this.body.updateFromGameObject();
        }
        this.setDepth(25);
    }

    takeDamage(amount) {
        if (!this.isDestructible) return false;
        this.currentHp -= amount;

        // Flash on hit
        this.setTint(0xff8888);
        this.scene.time.delayedCall(80, () => {
            if (this.active) this.clearTint();
        });

        if (this.currentHp <= 0) {
            // Destruction effect
            if (this.scene.effects) {
                this.scene.effects.explosion(this.x, this.y, 20);
            }
            this.destroy();
            return true;
        }
        return false;
    }
}
