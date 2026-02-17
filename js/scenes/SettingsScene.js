class SettingsScene extends Phaser.Scene {
    constructor() {
        super('SettingsScene');
    }

    create() {
        this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0e0e22);

        // Back button
        const backBtn = this.add.text(20, 15, '< 戻る', {
            fontSize: '16px', fontFamily: 'Arial', color: '#88aacc',
            stroke: '#000000', strokeThickness: 2
        }).setInteractive({ useHandCursor: true });
        backBtn.on('pointerdown', () => this.scene.start('MenuScene'));
        backBtn.on('pointerover', () => backBtn.setColor('#bbddff'));
        backBtn.on('pointerout', () => backBtn.setColor('#88aacc'));

        this.add.text(GAME_WIDTH / 2, 40, '設定', {
            fontSize: '26px', fontFamily: 'Arial', color: '#ffffff',
            stroke: '#000000', strokeThickness: 2
        }).setOrigin(0.5);

        // BGM Volume
        this.createVolumeSlider(160, 'BGM音量', AudioManager.getBGMVolume(), (val) => {
            AudioManager.setBGMVolume(val);
        });

        // SFX Volume
        this.createVolumeSlider(240, 'SE音量', AudioManager.getSFXVolume(), (val) => {
            AudioManager.setSFXVolume(val);
        });

        // Skip mode
        const save = SaveManager.load();
        const skipMode = save.settings?.skipMode || 'all';

        this.add.text(120, 310, 'スキップモード', {
            fontSize: '15px', fontFamily: 'Arial', color: '#cccccc'
        });

        const modes = [
            { key: 'all', label: '全スキップ' },
            { key: 'read_only', label: '既読のみ' }
        ];

        modes.forEach((mode, i) => {
            const x = 120 + i * 180;
            const isActive = skipMode === mode.key;
            const btn = this.add.rectangle(x + 70, 350, 150, 36, isActive ? 0x2244aa : 0x1a1a33)
                .setInteractive({ useHandCursor: true })
                .setStrokeStyle(1, isActive ? 0x4488ff : 0x333355);

            this.add.text(x + 70, 350, mode.label, {
                fontSize: '14px', fontFamily: 'Arial', color: isActive ? '#ffffff' : '#888888'
            }).setOrigin(0.5);

            btn.on('pointerdown', () => {
                const s = SaveManager.load();
                if (!s.settings) s.settings = {};
                s.settings.skipMode = mode.key;
                SaveManager.save(s);
                this.scene.restart();
            });
        });

        // Reset save (danger zone)
        this.add.rectangle(GAME_WIDTH / 2, 440, 600, 2, 0x333355);

        this.add.text(120, 460, 'データ管理', {
            fontSize: '15px', fontFamily: 'Arial', color: '#cc6666'
        });

        const resetBtn = this.add.rectangle(GAME_WIDTH / 2, 510, 200, 40, 0x441111)
            .setInteractive({ useHandCursor: true })
            .setStrokeStyle(1, 0x663333);

        this.add.text(GAME_WIDTH / 2, 510, 'セーブデータ削除', {
            fontSize: '14px', fontFamily: 'Arial', color: '#ff6666'
        }).setOrigin(0.5);

        resetBtn.on('pointerdown', () => {
            // Confirm with second click
            if (this._confirmReset) {
                localStorage.removeItem(SAVE_KEY);
                this.scene.start('TitleScene');
            } else {
                this._confirmReset = true;
                resetBtn.setFillStyle(0x662222);
                this.add.text(GAME_WIDTH / 2, 540, '本当に削除しますか？もう一度クリック', {
                    fontSize: '11px', fontFamily: 'Arial', color: '#ff4444'
                }).setOrigin(0.5);
            }
        });
    }

    createVolumeSlider(y, label, currentValue, onChange) {
        this.add.text(120, y - 15, label, {
            fontSize: '15px', fontFamily: 'Arial', color: '#cccccc'
        });

        const sliderX = 120;
        const sliderW = 400;
        const sliderY = y + 15;

        // Track
        this.add.rectangle(sliderX + sliderW / 2, sliderY, sliderW, 6, 0x333355)
            .setStrokeStyle(1, 0x444466);

        // Fill
        const fill = this.add.rectangle(sliderX, sliderY, sliderW * currentValue, 6, 0x4488ff)
            .setOrigin(0, 0.5);

        // Handle
        const handle = this.add.circle(sliderX + sliderW * currentValue, sliderY, 12, 0x4488ff)
            .setInteractive({ draggable: true, useHandCursor: true })
            .setStrokeStyle(2, 0x88ccff);

        // Value text
        const valueText = this.add.text(sliderX + sliderW + 30, sliderY, Math.round(currentValue * 100) + '%', {
            fontSize: '14px', fontFamily: 'Arial', color: '#ffffff'
        }).setOrigin(0, 0.5);

        // Touch zone for clicking on track
        const trackZone = this.add.rectangle(sliderX + sliderW / 2, sliderY, sliderW, 30, 0x000000, 0)
            .setInteractive({ useHandCursor: true });

        trackZone.on('pointerdown', (pointer) => {
            const val = Phaser.Math.Clamp((pointer.x - sliderX) / sliderW, 0, 1);
            handle.setX(sliderX + sliderW * val);
            fill.setSize(sliderW * val, 6);
            valueText.setText(Math.round(val * 100) + '%');
            onChange(val);
        });

        handle.on('drag', (pointer, dragX) => {
            const val = Phaser.Math.Clamp((dragX - sliderX) / sliderW, 0, 1);
            handle.setX(sliderX + sliderW * val);
            fill.setSize(sliderW * val, 6);
            valueText.setText(Math.round(val * 100) + '%');
            onChange(val);
        });
    }
}
