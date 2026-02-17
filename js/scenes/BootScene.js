class BootScene extends Phaser.Scene {
    constructor() {
        super('BootScene');
    }

    preload() {
        // Nothing to preload in boot - just show loading text
    }

    create() {
        this.scene.start('PreloadScene');
    }
}
