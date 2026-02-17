class TextWindow {
    constructor(scene) {
        this.scene = scene;
        this.typeTimer = null;
        this.currentText = '';
        this.isTyping = false;

        // Background
        this.bg = scene.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - 90, GAME_WIDTH - 40, 160, 0x000000, 0.8)
            .setStrokeStyle(1, 0x334466)
            .setDepth(100);

        // Speaker name
        this.nameText = scene.add.text(50, GAME_HEIGHT - 165, '', {
            fontSize: '18px', fontFamily: 'Arial', color: '#FFD700',
            stroke: '#000000', strokeThickness: 2
        }).setDepth(101);

        // Body text
        this.bodyText = scene.add.text(50, GAME_HEIGHT - 138, '', {
            fontSize: '15px', fontFamily: 'Arial', color: '#FFFFFF',
            wordWrap: { width: GAME_WIDTH - 100 }, lineSpacing: 6
        }).setDepth(101);

        // Advance indicator
        this.advanceIcon = scene.add.text(GAME_WIDTH - 50, GAME_HEIGHT - 20, '▼', {
            fontSize: '14px', fontFamily: 'Arial', color: '#88aacc'
        }).setOrigin(0.5).setDepth(101).setAlpha(0);

        scene.tweens.add({
            targets: this.advanceIcon,
            y: this.advanceIcon.y - 5,
            duration: 600,
            yoyo: true,
            repeat: -1
        });
    }

    showText(speaker, text, onComplete) {
        this.nameText.setText(speaker || '');
        this.bodyText.setText('');
        this.currentText = text;
        this.isTyping = true;
        this.advanceIcon.setAlpha(0);
        this.onComplete = onComplete;

        if (this.typeTimer) this.typeTimer.remove();

        let i = 0;
        this.typeTimer = this.scene.time.addEvent({
            delay: 30,
            callback: () => {
                i++;
                this.bodyText.setText(text.substring(0, i));
                if (i >= text.length) {
                    this.typeTimer.remove();
                    this.typeTimer = null;
                    this.isTyping = false;
                    this.advanceIcon.setAlpha(1);
                    if (onComplete) onComplete();
                }
            },
            loop: true
        });
    }

    showAllText() {
        if (this.typeTimer) {
            this.typeTimer.remove();
            this.typeTimer = null;
        }
        this.bodyText.setText(this.currentText);
        this.isTyping = false;
        this.advanceIcon.setAlpha(1);
        if (this.onComplete) {
            this.onComplete();
            this.onComplete = null;
        }
    }

    setVisible(visible) {
        this.bg.setVisible(visible);
        this.nameText.setVisible(visible);
        this.bodyText.setVisible(visible);
        this.advanceIcon.setVisible(visible);
    }

    destroy() {
        if (this.typeTimer) this.typeTimer.remove();
        this.bg.destroy();
        this.nameText.destroy();
        this.bodyText.destroy();
        this.advanceIcon.destroy();
    }
}
