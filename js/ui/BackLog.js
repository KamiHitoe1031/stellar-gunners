class BackLog {
    constructor(scene) {
        this.scene = scene;
        this.entries = [];
        this.isVisible = false;
        this.container = null;
        this.scrollY = 0;
    }

    addEntry(speaker, text) {
        this.entries.push({ speaker: speaker || '', text });
    }

    show() {
        if (this.isVisible) return;
        this.isVisible = true;

        this.container = this.scene.add.container(0, 0).setDepth(300);

        // Dim background
        const dimBg = this.scene.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.85);
        this.container.add(dimBg);

        // Title
        const title = this.scene.add.text(GAME_WIDTH / 2, 20, 'バックログ', {
            fontSize: '20px', fontFamily: 'Arial', color: '#88aacc'
        }).setOrigin(0.5);
        this.container.add(title);

        // Close hint
        const hint = this.scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 20, 'クリックで閉じる', {
            fontSize: '12px', fontFamily: 'Arial', color: '#666666'
        }).setOrigin(0.5);
        this.container.add(hint);

        // Log entries (show last 20)
        const visibleEntries = this.entries.slice(-20);
        let y = 55;
        visibleEntries.forEach(entry => {
            if (entry.speaker) {
                const speakerText = this.scene.add.text(40, y, entry.speaker, {
                    fontSize: '14px', fontFamily: 'Arial', color: '#FFD700'
                });
                this.container.add(speakerText);
                y += 20;
            }
            const bodyText = this.scene.add.text(50, y, entry.text, {
                fontSize: '13px', fontFamily: 'Arial', color: '#cccccc',
                wordWrap: { width: GAME_WIDTH - 100 }
            });
            this.container.add(bodyText);
            y += bodyText.height + 12;
        });

        // Close on click
        dimBg.setInteractive();
        dimBg.on('pointerdown', () => this.hide());
    }

    hide() {
        if (!this.isVisible) return;
        this.isVisible = false;
        if (this.container) {
            this.container.destroy();
            this.container = null;
        }
    }

    destroy() {
        this.hide();
        this.entries = [];
    }
}
