class SkillButton {
    constructor(scene, x, y, label, key, size = 56) {
        this.scene = scene;
        this.key = key;
        this.size = size;
        this.isReady = true;
        this.cooldownPercent = 0;

        this.bg = scene.add.rectangle(x, y, size, size, 0x334455, 0.8)
            .setScrollFactor(0).setDepth(200).setInteractive();
        this.border = scene.add.rectangle(x, y, size, size)
            .setScrollFactor(0).setDepth(201).setStrokeStyle(2, 0x88aacc);
        this.cooldownOverlay = scene.add.rectangle(x, y, size, 0, 0x000000, 0.6)
            .setScrollFactor(0).setDepth(202).setOrigin(0.5, 1);
        this.label = scene.add.text(x, y - 8, label, {
            fontSize: '13px', fontFamily: 'Arial', color: '#ffffff',
            stroke: '#000000', strokeThickness: 2
        }).setScrollFactor(0).setDepth(203).setOrigin(0.5);
        this.cdText = scene.add.text(x, y + 12, '', {
            fontSize: '14px', fontFamily: 'Arial', color: '#ffcc00',
            stroke: '#000000', strokeThickness: 2
        }).setScrollFactor(0).setDepth(203).setOrigin(0.5);

        this.bg.on('pointerdown', () => {
            if (this.isReady && this.onActivate) {
                this.onActivate();
            }
        });

        this.onActivate = null;
    }

    setCooldown(percent, remainingSec) {
        this.cooldownPercent = percent;
        this.isReady = percent <= 0;

        const overlayHeight = this.size * percent;
        this.cooldownOverlay.setSize(this.size, overlayHeight);
        this.cooldownOverlay.setPosition(this.bg.x, this.bg.y + this.size / 2);

        if (percent > 0) {
            this.cdText.setText(remainingSec + 's');
            this.border.setStrokeStyle(2, 0x555555);
        } else {
            this.cdText.setText('');
            this.border.setStrokeStyle(2, 0x88aacc);
        }
    }

    setVisible(visible) {
        this.bg.setVisible(visible);
        this.border.setVisible(visible);
        this.cooldownOverlay.setVisible(visible);
        this.label.setVisible(visible);
        this.cdText.setVisible(visible);
    }

    destroy() {
        this.bg.destroy();
        this.border.destroy();
        this.cooldownOverlay.destroy();
        this.label.destroy();
        this.cdText.destroy();
    }
}
