class GalleryScene extends Phaser.Scene {
    constructor() {
        super('GalleryScene');
    }

    init() {
        this.currentCategory = 'main_story';
    }

    create() {
        this.galleryData = this.cache.json.get('scenario_gallery');
        this.save = SaveManager.load();

        this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0e0e22);
        this.showGallery();
    }

    showGallery() {
        this.clearUI();
        this.save = SaveManager.load();

        this.createBackButton(() => this.scene.start('MenuScene'));

        this.add.text(GAME_WIDTH / 2, 28, '回想ギャラリー', {
            fontSize: '24px', fontFamily: 'Arial', color: '#ffffff',
            stroke: '#000000', strokeThickness: 2
        }).setOrigin(0.5);

        // Category tabs
        const categories = [
            { key: 'main_story', label: 'メインストーリー' },
            { key: 'character', label: 'キャラクター' },
            { key: 'event', label: 'イベント' }
        ];

        categories.forEach((cat, i) => {
            const tx = 120 + i * 160;
            const isActive = this.currentCategory === cat.key;
            const tabBg = this.add.rectangle(tx, 62, 140, 28, isActive ? 0x2244aa : 0x1a1a33)
                .setInteractive({ useHandCursor: true })
                .setStrokeStyle(1, isActive ? 0x4488ff : 0x333355);

            this.add.text(tx, 62, cat.label, {
                fontSize: '13px', fontFamily: 'Arial', color: isActive ? '#ffffff' : '#888888'
            }).setOrigin(0.5);

            tabBg.on('pointerdown', () => {
                this.currentCategory = cat.key;
                this.showGallery();
            });
        });

        // Gallery entries
        const filtered = this.galleryData
            .filter(g => g.category === this.currentCategory)
            .sort((a, b) => a.sortOrder - b.sortOrder);

        const unlockedIds = this.save.gallery?.unlockedIds || [];
        const cols = 3;
        const startX = 50;
        const startY = 95;
        const cardW = 230;
        const cardH = 130;
        const gapX = 10;
        const gapY = 10;

        filtered.forEach((entry, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const x = startX + col * (cardW + gapX);
            const y = startY + row * (cardH + gapY);

            const isUnlocked = unlockedIds.includes(entry.galleryId);
            this.createGalleryCard(x, y, cardW, cardH, entry, isUnlocked);
        });

        // Unlock progress
        const totalCount = filtered.length;
        const unlockedCount = filtered.filter(g => unlockedIds.includes(g.galleryId)).length;
        this.add.text(GAME_WIDTH - 30, GAME_HEIGHT - 25, `${unlockedCount}/${totalCount} 解放済み`, {
            fontSize: '12px', fontFamily: 'Arial', color: '#666666'
        }).setOrigin(1, 0.5);
    }

    createGalleryCard(x, y, w, h, entry, isUnlocked) {
        const bgColor = isUnlocked ? 0x1a2244 : 0x111111;
        const borderColor = isUnlocked ? 0x3355aa : 0x222222;

        const bg = this.add.rectangle(x + w / 2, y + h / 2, w, h, bgColor, 0.9)
            .setStrokeStyle(1, borderColor);

        if (isUnlocked) {
            bg.setInteractive({ useHandCursor: true });

            // Thumbnail background
            if (entry.thumbnailKey && this.textures.exists(entry.thumbnailKey)) {
                const thumb = this.add.image(x + w / 2, y + h / 2, entry.thumbnailKey);
                thumb.setDisplaySize(w, h);
                thumb.setAlpha(0.4);
            }

            // Title
            this.add.text(x + 12, y + 10, entry.title, {
                fontSize: '15px', fontFamily: 'Arial', color: '#ffffff',
                stroke: '#000000', strokeThickness: 2
            });

            // Category + Chapter label
            const catLabels = { main_story: 'メイン', character: 'キャラ', event: 'イベント' };
            const catLabel = catLabels[entry.category] || '';
            const chapterText = entry.chapter > 0 ? `Ch.${entry.chapter}` : catLabel;
            this.add.text(x + 12, y + 30, chapterText, {
                fontSize: '10px', fontFamily: 'Arial', color: '#4488ff',
                stroke: '#000000', strokeThickness: 1
            });

            // Description
            this.add.text(x + 12, y + 50, entry.description, {
                fontSize: '11px', fontFamily: 'Arial', color: '#cccccc',
                wordWrap: { width: w - 24 },
                stroke: '#000000', strokeThickness: 1
            });

            // Play icon
            this.add.text(x + w - 30, y + h - 25, '▶', {
                fontSize: '16px', fontFamily: 'Arial', color: '#4488ff'
            });

            bg.on('pointerover', () => bg.setStrokeStyle(2, 0x6688ff));
            bg.on('pointerout', () => bg.setStrokeStyle(1, borderColor));
            bg.on('pointerdown', () => {
                this.scene.start('ScenarioScene', {
                    scenarioId: entry.scenarioId,
                    isGallery: true
                });
            });
        } else {
            // Locked state
            this.add.text(x + w / 2, y + h / 2 - 10, '🔒', {
                fontSize: '24px', fontFamily: 'Arial'
            }).setOrigin(0.5);

            this.add.text(x + w / 2, y + h / 2 + 18, '未解放', {
                fontSize: '12px', fontFamily: 'Arial', color: '#555555'
            }).setOrigin(0.5);
        }
    }

    createBackButton(action) {
        const btn = this.add.text(20, 15, '< 戻る', {
            fontSize: '16px', fontFamily: 'Arial', color: '#88aacc',
            stroke: '#000000', strokeThickness: 2
        }).setInteractive({ useHandCursor: true });
        btn.on('pointerdown', action);
        btn.on('pointerover', () => btn.setColor('#bbddff'));
        btn.on('pointerout', () => btn.setColor('#88aacc'));
    }

    clearUI() {
        this.children.removeAll(true);
        this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0e0e22);
    }
}
