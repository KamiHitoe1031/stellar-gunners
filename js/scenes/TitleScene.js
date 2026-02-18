class TitleScene extends Phaser.Scene {
    constructor() {
        super('TitleScene');
    }

    create() {
        AudioManager.playBGM('bgm_title');

        const cx = GAME_WIDTH / 2;
        const cy = GAME_HEIGHT / 2;

        // Dark base
        this.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x050515);

        // Key visual background (if loaded) - cover mode to preserve aspect ratio
        if (this.textures.exists('key_visual')) {
            const kv = this.add.image(cx, cy, 'key_visual');
            const kvTex = this.textures.get('key_visual').getSourceImage();
            const scaleX = GAME_WIDTH / kvTex.width;
            const scaleY = GAME_HEIGHT / kvTex.height;
            const coverScale = Math.max(scaleX, scaleY);
            kv.setScale(coverScale);
            kv.setAlpha(0.85);

            // Vignette overlay (darkens edges for depth)
            const vig = this.add.graphics();
            vig.fillStyle(0x000000, 0.4);
            vig.fillRect(0, 0, GAME_WIDTH, 60);
            vig.fillRect(0, GAME_HEIGHT - 80, GAME_WIDTH, 80);
            // Gradient-like strips on sides
            for (let i = 0; i < 40; i++) {
                const alpha = 0.3 * (1 - i / 40);
                vig.fillStyle(0x000000, alpha);
                vig.fillRect(0, 0, i * 2, GAME_HEIGHT);
                vig.fillRect(GAME_WIDTH - i * 2, 0, i * 2, GAME_HEIGHT);
            }
        } else {
            // Fallback: stars effect
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
        }

        // Title logo (if loaded) or text fallback
        let titleObj;
        if (this.textures.exists('title_logo')) {
            const logo = this.add.image(cx, 80, 'title_logo');
            // Scale to fit within title area (top portion, above characters)
            const tex = this.textures.get('title_logo');
            const src = tex.getSourceImage();
            const scale = Math.min(750 / src.width, 180 / src.height);
            logo.setScale(scale);
            logo.setDepth(10);
            titleObj = logo;
        } else {
            // Text fallback with enhanced styling
            titleObj = this.add.text(cx, 70, 'STELLAR\nGUNNERS', {
                fontSize: '56px', fontFamily: 'Arial', color: '#ffffff',
                align: 'center', stroke: '#4488ff', strokeThickness: 5,
                lineSpacing: 8
            }).setOrigin(0.5).setDepth(10);

            this.add.text(cx, 155, 'ステラガンナーズ', {
                fontSize: '20px', fontFamily: 'Arial', color: '#88bbff',
                stroke: '#000000', strokeThickness: 2
            }).setOrigin(0.5).setDepth(10);
        }

        // Subtle glow animation on title
        this.tweens.add({
            targets: titleObj,
            alpha: 0.85,
            duration: 2000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Floating particles for atmosphere
        for (let i = 0; i < 20; i++) {
            const px = Math.random() * GAME_WIDTH;
            const py = GAME_HEIGHT + Math.random() * 100;
            const particle = this.add.circle(px, py, 1 + Math.random() * 2, 0x4488ff, 0.2 + Math.random() * 0.3);
            particle.setDepth(5);
            this.tweens.add({
                targets: particle,
                y: -20,
                x: px + (Math.random() - 0.5) * 100,
                alpha: 0,
                duration: 4000 + Math.random() * 4000,
                delay: Math.random() * 3000,
                repeat: -1
            });
        }

        // Tap to start
        const startText = this.add.text(cx, GAME_HEIGHT - 55, 'CLICK TO START', {
            fontSize: '22px', fontFamily: 'Arial', color: '#ffcc44',
            stroke: '#000000', strokeThickness: 4
        }).setOrigin(0.5).setDepth(20);

        this.tweens.add({
            targets: startText,
            alpha: 0.3,
            duration: 800,
            yoyo: true,
            repeat: -1
        });

        // Version
        this.add.text(GAME_WIDTH - 10, GAME_HEIGHT - 10, 'v0.2.0', {
            fontSize: '12px', fontFamily: 'Arial', color: '#444466'
        }).setOrigin(1, 1).setDepth(20);

        // Input
        this.input.once('pointerdown', () => {
            this.scene.start('MenuScene');
        });
        this.input.keyboard.once('keydown', () => {
            this.scene.start('MenuScene');
        });
    }
}
