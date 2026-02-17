class MenuScene extends Phaser.Scene {
    constructor() {
        super('MenuScene');
    }

    create() {
        const cx = GAME_WIDTH / 2;

        this.add.rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x111122);

        // Header
        this.add.text(cx, 30, 'STELLAR GUNNERS', {
            fontSize: '28px', fontFamily: 'Arial', color: '#ffffff',
            stroke: '#4488ff', strokeThickness: 2
        }).setOrigin(0.5);

        // Player info
        const save = SaveManager.load();
        this.add.text(20, 70, `Lv.${save.player.level}  ${save.player.name}`, {
            fontSize: '14px', fontFamily: 'Arial', color: '#cccccc'
        });
        this.add.text(20, 90, `クレジット: ${save.player.credits}  ジェム: ${save.player.gems}`, {
            fontSize: '12px', fontFamily: 'Arial', color: '#aaaaaa'
        });
        this.add.text(20, 108, `電力: ${save.player.stamina}/120`, {
            fontSize: '12px', fontFamily: 'Arial', color: '#88ff88'
        });

        // Menu buttons
        const buttons = [
            { label: '出撃', desc: 'ステージ選択・バトル', action: () => this.scene.start('FormationScene') },
            { label: '変化の壷', desc: 'アイテムを別のアイテムに変化', action: () => this.scene.start('TransformPotScene') },
            { label: '編成', desc: 'パーティ編成 (準備中)', action: () => {} },
            { label: '強化', desc: 'キャラ・武器強化 (準備中)', action: () => {} },
            { label: 'ショップ', desc: '素材・武器購入 (準備中)', action: () => {} },
        ];

        buttons.forEach((btn, i) => {
            const y = 160 + i * 68;
            this.createMenuButton(cx, y, btn.label, btn.desc, btn.action);
        });

        // Chapter progress
        const clearedCount = Object.keys(save.progress.clearedStages).length;
        this.add.text(cx, GAME_HEIGHT - 40, `チャプター1 進行: ${clearedCount}/12 ステージ`, {
            fontSize: '13px', fontFamily: 'Arial', color: '#888888'
        }).setOrigin(0.5);
    }

    createMenuButton(x, y, label, desc, action) {
        const bg = this.add.rectangle(x, y, 350, 60, 0x1a2244, 0.9)
            .setInteractive({ useHandCursor: true })
            .setStrokeStyle(1, 0x3355aa);

        const labelText = this.add.text(x - 140, y - 12, label, {
            fontSize: '22px', fontFamily: 'Arial', color: '#ffffff'
        });

        const descText = this.add.text(x - 140, y + 12, desc, {
            fontSize: '12px', fontFamily: 'Arial', color: '#8899aa'
        });

        const arrow = this.add.text(x + 150, y, '>', {
            fontSize: '24px', fontFamily: 'Arial', color: '#4488ff'
        }).setOrigin(0.5);

        bg.on('pointerover', () => {
            bg.setFillStyle(0x223366, 1);
            bg.setStrokeStyle(2, 0x5577cc);
        });
        bg.on('pointerout', () => {
            bg.setFillStyle(0x1a2244, 0.9);
            bg.setStrokeStyle(1, 0x3355aa);
        });
        bg.on('pointerdown', action);
    }
}
