class SkillButton {
    constructor(scene, x, y, keyLabel, skillName, iconKey, size = 56) {
        this.scene = scene;
        this.x = x;
        this.y = y;
        this.size = size;
        this.isReady = true;
        this.cooldownPercent = 0;

        // Background
        this.bg = scene.add.rectangle(x, y, size, size, 0x1a2233, 0.85)
            .setScrollFactor(0).setDepth(200).setInteractive();
        this.border = scene.add.rectangle(x, y, size, size)
            .setScrollFactor(0).setDepth(201).setStrokeStyle(2, 0x4466aa);

        // Cooldown overlay (fills from bottom up)
        this.cooldownOverlay = scene.add.rectangle(x, y, size, 0, 0x000000, 0.6)
            .setScrollFactor(0).setDepth(202).setOrigin(0.5, 1);

        // Skill icon (centered, slightly above middle)
        this.icon = null;
        if (iconKey && scene.textures.exists(iconKey)) {
            this.icon = scene.add.image(x, y - 3, iconKey)
                .setDisplaySize(30, 30)
                .setScrollFactor(0).setDepth(203);
        }

        // Key binding label (top-left corner)
        this.keyText = scene.add.text(x - size / 2 + 4, y - size / 2 + 2, keyLabel, {
            fontSize: '11px', fontFamily: 'Arial', color: '#aabbcc',
            stroke: '#000000', strokeThickness: 2
        }).setScrollFactor(0).setDepth(204);

        // Skill name (bottom, abbreviated)
        const shortName = this._abbreviate(skillName);
        this.nameText = scene.add.text(x, y + size / 2 - 10, shortName, {
            fontSize: '9px', fontFamily: 'Arial', color: '#bbccdd',
            stroke: '#000000', strokeThickness: 1
        }).setScrollFactor(0).setDepth(204).setOrigin(0.5);

        // Cooldown time text (center, shown only during cooldown)
        this.cdText = scene.add.text(x, y, '', {
            fontSize: '16px', fontFamily: 'Arial', color: '#ffcc00',
            stroke: '#000000', strokeThickness: 3
        }).setScrollFactor(0).setDepth(205).setOrigin(0.5);

        // Tap handler
        this.bg.on('pointerdown', () => {
            if (this.isReady && this.onActivate) {
                this.onActivate();
            }
        });

        this.onActivate = null;
    }

    _abbreviate(name) {
        if (!name) return '';
        // Keep up to 6 characters for Japanese, or 8 for ASCII
        if (name.length <= 6) return name;
        return name.substring(0, 5) + '…';
    }

    updateSkill(skillName, iconKey) {
        this.nameText.setText(this._abbreviate(skillName));

        if (this.icon) {
            this.icon.destroy();
            this.icon = null;
        }
        if (iconKey && this.scene.textures.exists(iconKey)) {
            this.icon = this.scene.add.image(this.x, this.y - 3, iconKey)
                .setDisplaySize(30, 30)
                .setScrollFactor(0).setDepth(203);
        }
    }

    setCooldown(percent, remainingSec) {
        this.cooldownPercent = percent;
        this.isReady = percent <= 0;

        const overlayHeight = this.size * percent;
        this.cooldownOverlay.setSize(this.size, overlayHeight);
        this.cooldownOverlay.setPosition(this.bg.x, this.bg.y + this.size / 2);

        if (percent > 0) {
            this.cdText.setText(remainingSec + 's');
            this.border.setStrokeStyle(2, 0x333344);
            if (this.icon) this.icon.setAlpha(0.3);
        } else {
            this.cdText.setText('');
            this.border.setStrokeStyle(2, 0x4466aa);
            if (this.icon) this.icon.setAlpha(1);
        }
    }

    setVisible(visible) {
        this.bg.setVisible(visible);
        this.border.setVisible(visible);
        this.cooldownOverlay.setVisible(visible);
        this.keyText.setVisible(visible);
        this.nameText.setVisible(visible);
        this.cdText.setVisible(visible);
        if (this.icon) this.icon.setVisible(visible);
    }

    destroy() {
        this.bg.destroy();
        this.border.destroy();
        this.cooldownOverlay.destroy();
        this.keyText.destroy();
        this.nameText.destroy();
        this.cdText.destroy();
        if (this.icon) this.icon.destroy();
    }
}
