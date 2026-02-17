class PartyHUD {
    constructor(scene) {
        this.scene = scene;
        this.elements = [];
        this.shieldBar = null;
    }

    create(partyMembers) {
        this.cleanup();
        const s = this.scene;
        const startX = 10;
        const startY = 10;

        partyMembers.forEach((member, i) => {
            const x = startX + i * 130;
            const y = startY;

            const charId = member.charId || member.id.replace('_normal', '');
            const iconKey = `icon_${charId}`;
            let icon;
            if (s.textures.exists(iconKey)) {
                icon = s.add.image(x + 16, y + 16, iconKey)
                    .setDisplaySize(32, 32)
                    .setScrollFactor(0).setDepth(200);
            } else {
                const color = ATTRIBUTE_COLORS[member.attribute] || 0xffffff;
                icon = s.add.rectangle(x + 16, y + 16, 32, 32, color, 0.9)
                    .setScrollFactor(0).setDepth(200);
            }
            const iconBorder = s.add.rectangle(x + 16, y + 16, 32, 32)
                .setScrollFactor(0).setDepth(201)
                .setStrokeStyle(2, 0xffffff);

            const nameShort = member.name.split('・')[0];
            const name = s.add.text(x + 36, y + 2, nameShort, {
                fontSize: '12px', fontFamily: 'Arial', color: '#ffffff',
                stroke: '#000000', strokeThickness: 2
            }).setScrollFactor(0).setDepth(200);

            const hpBg = s.add.rectangle(x + 36, y + 20, 80, 8, 0x333333)
                .setScrollFactor(0).setDepth(200).setOrigin(0, 0.5);
            const hpFill = s.add.rectangle(x + 36, y + 20, 80, 8, 0x00ff00)
                .setScrollFactor(0).setDepth(201).setOrigin(0, 0.5);

            const hpText = s.add.text(x + 36, y + 28, `${member.hp}/${member.hp}`, {
                fontSize: '9px', fontFamily: 'Arial', color: '#cccccc',
                stroke: '#000000', strokeThickness: 1
            }).setScrollFactor(0).setDepth(200);

            this.elements.push({
                charId: member.id,
                icon, iconBorder, name, hpBg, hpFill, hpText,
                maxHp: member.hp
            });
        });

        const shieldY = startY + 48;
        const shieldLabel = s.add.text(startX, shieldY, 'SHIELD', {
            fontSize: '10px', fontFamily: 'Arial', color: '#44aaff',
            stroke: '#000000', strokeThickness: 2
        }).setScrollFactor(0).setDepth(200);

        const shieldBg = s.add.rectangle(startX + 50, shieldY + 5, 200, 10, 0x222244)
            .setScrollFactor(0).setDepth(200).setOrigin(0, 0.5);
        const shieldFill = s.add.rectangle(startX + 50, shieldY + 5, 200, 10, 0x4488ff)
            .setScrollFactor(0).setDepth(201).setOrigin(0, 0.5);
        const shieldText = s.add.text(startX + 255, shieldY, '', {
            fontSize: '10px', fontFamily: 'Arial', color: '#88bbff',
            stroke: '#000000', strokeThickness: 1
        }).setScrollFactor(0).setDepth(200);

        this.shieldBar = { label: shieldLabel, bg: shieldBg, fill: shieldFill, text: shieldText };
    }

    updateHP(charId, current, max) {
        const el = this.elements.find(e => e.charId === charId);
        if (!el) return;
        const pct = Phaser.Math.Clamp(current / max, 0, 1);
        el.hpFill.width = 80 * pct;
        el.hpFill.fillColor = pct > 0.5 ? 0x00ff00 : pct > 0.25 ? 0xffcc00 : 0xff0000;
        el.hpText.setText(`${Math.floor(current)}/${max}`);
    }

    updateShield(current, max) {
        if (!this.shieldBar) return;
        const pct = Phaser.Math.Clamp(current / max, 0, 1);
        this.shieldBar.fill.width = 200 * pct;
        this.shieldBar.text.setText(`${Math.floor(current)}/${max}`);
    }

    highlightActive(charId) {
        this.elements.forEach(el => {
            const isActive = el.charId === charId;
            el.iconBorder.setStrokeStyle(2, isActive ? 0xffcc00 : 0xffffff);
        });
    }

    cleanup() {
        this.elements.forEach(el => {
            el.icon.destroy();
            el.iconBorder.destroy();
            el.name.destroy();
            el.hpBg.destroy();
            el.hpFill.destroy();
            el.hpText.destroy();
        });
        this.elements = [];
        if (this.shieldBar) {
            this.shieldBar.label.destroy();
            this.shieldBar.bg.destroy();
            this.shieldBar.fill.destroy();
            this.shieldBar.text.destroy();
            this.shieldBar = null;
        }
    }
}
