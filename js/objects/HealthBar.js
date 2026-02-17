class HealthBar {
    constructor(scene, x, y, width, height, color = 0x00ff00) {
        this.scene = scene;
        this.width = width;
        this.height = height;
        this.color = color;

        this.bg = scene.add.rectangle(x, y, width, height, 0x333333).setOrigin(0, 0.5);
        this.bar = scene.add.rectangle(x, y, width, height, color).setOrigin(0, 0.5);
        this.bg.setDepth(90);
        this.bar.setDepth(91);
    }

    setPercent(percent) {
        const p = Phaser.Math.Clamp(percent, 0, 1);
        this.bar.width = this.width * p;
        if (p > 0.5) {
            this.bar.fillColor = 0x00ff00;
        } else if (p > 0.25) {
            this.bar.fillColor = 0xffcc00;
        } else {
            this.bar.fillColor = 0xff0000;
        }
    }

    setPosition(x, y) {
        this.bg.setPosition(x, y);
        this.bar.setPosition(x, y);
    }

    setVisible(visible) {
        this.bg.setVisible(visible);
        this.bar.setVisible(visible);
    }

    destroy() {
        this.bg.destroy();
        this.bar.destroy();
    }
}
