class BossHUD {
    constructor(scene) {
        this.scene = scene;
        this.visible = false;
        this.elements = {};
    }

    show(bossName, maxHp, maxBreak) {
        this.cleanup();
        this.visible = true;
        const cx = GAME_WIDTH / 2;
        const y = GAME_HEIGHT - 80;

        this.elements.name = this.scene.add.text(cx, y - 20, bossName, {
            fontSize: '16px', fontFamily: 'Arial', color: '#ff4444',
            stroke: '#000000', strokeThickness: 3
        }).setScrollFactor(0).setDepth(200).setOrigin(0.5);

        this.elements.hpBg = this.scene.add.rectangle(cx, y, 300, 14, 0x333333)
            .setScrollFactor(0).setDepth(200);
        this.elements.hpFill = this.scene.add.rectangle(cx - 150, y, 300, 14, 0xff2222)
            .setScrollFactor(0).setDepth(201).setOrigin(0, 0.5);
        this.elements.hpText = this.scene.add.text(cx, y, '', {
            fontSize: '10px', fontFamily: 'Arial', color: '#ffffff',
            stroke: '#000000', strokeThickness: 2
        }).setScrollFactor(0).setDepth(202).setOrigin(0.5);

        if (maxBreak > 0) {
            this.elements.breakBg = this.scene.add.rectangle(cx, y + 14, 200, 8, 0x333333)
                .setScrollFactor(0).setDepth(200);
            this.elements.breakFill = this.scene.add.rectangle(cx - 100, y + 14, 200, 8, 0xffaa00)
                .setScrollFactor(0).setDepth(201).setOrigin(0, 0.5);
            this.elements.breakLabel = this.scene.add.text(cx - 110, y + 8, 'BRK', {
                fontSize: '8px', fontFamily: 'Arial', color: '#ffaa00',
                stroke: '#000000', strokeThickness: 1
            }).setScrollFactor(0).setDepth(200);
        }

        this.maxHp = maxHp;
        this.maxBreak = maxBreak;
    }

    updateHP(current, max) {
        if (!this.visible) return;
        const pct = Phaser.Math.Clamp(current / max, 0, 1);
        this.elements.hpFill.width = 300 * pct;
        this.elements.hpText.setText(`${Math.floor(current)} / ${max}`);
    }

    updateBreak(current, max, isBroken) {
        if (!this.visible || !this.elements.breakFill) return;
        const pct = Phaser.Math.Clamp(current / max, 0, 1);
        this.elements.breakFill.width = 200 * pct;
        this.elements.breakFill.fillColor = isBroken ? 0xff0000 : 0xffaa00;
    }

    cleanup() {
        Object.values(this.elements).forEach(el => el.destroy());
        this.elements = {};
        this.visible = false;
    }
}
