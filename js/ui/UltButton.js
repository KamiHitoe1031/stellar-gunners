class UltButton {
    constructor(scene, x, y) {
        this.scene = scene;
        this.x = x;
        this.y = y;
        this.size = 62;
        this.gaugePercent = 0;
        this.isReady = false;

        // Background (dark when not ready)
        this.bg = scene.add.circle(x, y, this.size / 2, 0x222233, 0.8)
            .setScrollFactor(0).setDepth(200).setInteractive();

        // Gauge fill (arc drawn with graphics)
        this.gaugeGfx = scene.add.graphics()
            .setScrollFactor(0).setDepth(201);

        // Border ring
        this.border = scene.add.circle(x, y, this.size / 2)
            .setScrollFactor(0).setDepth(202)
            .setStrokeStyle(2, 0x555555).setFillStyle(0x000000, 0);

        // Label
        this.label = scene.add.text(x, y - 6, 'R:ULT', {
            fontSize: '12px', fontFamily: 'Arial', color: '#aaaaaa',
            stroke: '#000000', strokeThickness: 2
        }).setScrollFactor(0).setDepth(203).setOrigin(0.5);

        // Percent text
        this.percentText = scene.add.text(x, y + 10, '0%', {
            fontSize: '11px', fontFamily: 'Arial', color: '#888888',
            stroke: '#000000', strokeThickness: 2
        }).setScrollFactor(0).setDepth(203).setOrigin(0.5);

        // Ready flash effect
        this.readyFlash = scene.add.circle(x, y, this.size / 2 + 4, 0xffcc00, 0)
            .setScrollFactor(0).setDepth(199);

        this.bg.on('pointerdown', () => {
            if (this.isReady && this.onActivate) {
                this.onActivate();
            }
        });

        this.onActivate = null;
    }

    setGauge(percent) {
        this.gaugePercent = Math.max(0, Math.min(1, percent));
        this.isReady = this.gaugePercent >= 1;

        // Redraw gauge arc
        this.gaugeGfx.clear();
        if (this.gaugePercent > 0) {
            const r = this.size / 2 - 3;
            const startAngle = -Math.PI / 2;
            const endAngle = startAngle + (Math.PI * 2 * this.gaugePercent);
            const color = this.isReady ? 0xffcc00 : 0x4488cc;

            // Fill arc as pie slice
            this.gaugeGfx.fillStyle(color, 0.4);
            this.gaugeGfx.beginPath();
            this.gaugeGfx.moveTo(this.x, this.y);
            this.gaugeGfx.arc(this.x, this.y, r, startAngle, endAngle, false);
            this.gaugeGfx.closePath();
            this.gaugeGfx.fillPath();

            // Arc stroke
            this.gaugeGfx.lineStyle(3, color, 0.9);
            this.gaugeGfx.beginPath();
            this.gaugeGfx.arc(this.x, this.y, r, startAngle, endAngle, false);
            this.gaugeGfx.strokePath();
        }

        // Update visuals
        if (this.isReady) {
            this.border.setStrokeStyle(2, 0xffcc00);
            this.label.setColor('#ffcc00');
            this.percentText.setText('READY');
            this.percentText.setColor('#ffcc00');
            this.bg.setFillStyle(0x332200, 0.9);

            // Pulsing glow when ready
            if (!this._readyTween) {
                this._readyTween = this.scene.tweens.add({
                    targets: this.readyFlash,
                    alpha: { from: 0.3, to: 0 },
                    duration: 800,
                    repeat: -1,
                    yoyo: true
                });
            }
        } else {
            this.border.setStrokeStyle(2, 0x555555);
            this.label.setColor('#aaaaaa');
            this.percentText.setText(Math.floor(this.gaugePercent * 100) + '%');
            this.percentText.setColor('#888888');
            this.bg.setFillStyle(0x222233, 0.8);

            if (this._readyTween) {
                this._readyTween.stop();
                this._readyTween = null;
                this.readyFlash.setAlpha(0);
            }
        }
    }

    destroy() {
        if (this._readyTween) this._readyTween.stop();
        this.bg.destroy();
        this.gaugeGfx.destroy();
        this.border.destroy();
        this.label.destroy();
        this.percentText.destroy();
        this.readyFlash.destroy();
    }
}
