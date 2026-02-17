class TitleScene extends Phaser.Scene {
    constructor() {
        super('TitleScene');
    }

    create() {
        AudioManager.playBGM('bgm_title');

        const cx = GAME_WIDTH / 2;
        const cy = GAME_HEIGHT / 2;

        // Background
        this.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x0a0a2e);

        // Stars effect
        for (let i = 0; i < 100; i++) {
            const x = Math.random() * GAME_WIDTH;
            const y = Math.random() * GAME_HEIGHT;
            const size = 1 + Math.random() * 2;
            const star = this.add.circle(x, y, size, 0xffffff, 0.3 + Math.random() * 0.7);
            this.tweens.add({
                targets: star,
                alpha: 0.2,
                duration: 1000 + Math.random() * 2000,
                yoyo: true,
                repeat: -1
            });
        }

        // Title
        const title = this.add.text(cx, cy - 100, 'STELLAR\nGUNNERS', {
            fontSize: '56px', fontFamily: 'Arial', color: '#ffffff',
            align: 'center', stroke: '#4488ff', strokeThickness: 4,
            lineSpacing: 8
        }).setOrigin(0.5);

        // Subtitle
        this.add.text(cx, cy - 20, 'ステラガンナーズ', {
            fontSize: '20px', fontFamily: 'Arial', color: '#88bbff'
        }).setOrigin(0.5);

        // Glow animation
        this.tweens.add({
            targets: title,
            alpha: 0.8,
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Tap to start
        const startText = this.add.text(cx, cy + 100, 'CLICK TO START', {
            fontSize: '22px', fontFamily: 'Arial', color: '#ffcc44',
            stroke: '#000000', strokeThickness: 3
        }).setOrigin(0.5);

        this.tweens.add({
            targets: startText,
            alpha: 0.3,
            duration: 800,
            yoyo: true,
            repeat: -1
        });

        // Version
        this.add.text(GAME_WIDTH - 10, GAME_HEIGHT - 10, 'v0.1.0 MVP', {
            fontSize: '12px', fontFamily: 'Arial', color: '#666666'
        }).setOrigin(1, 1);

        // Input
        this.input.once('pointerdown', () => {
            this.scene.start('MenuScene');
        });
        this.input.keyboard.once('keydown', () => {
            this.scene.start('MenuScene');
        });
    }
}
