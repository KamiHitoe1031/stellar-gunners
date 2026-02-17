class ResultScene extends Phaser.Scene {
    constructor() {
        super('ResultScene');
    }

    init(data) {
        this.stageData = data.stageData;
        this.stars = data.stars || 0;
        this.drops = data.drops || [];
        this.firstClearRewards = data.firstClearRewards || [];
        this.isFirstClear = data.isFirstClear || false;
        this.timeInSeconds = data.timeInSeconds || 0;
        this.totalDamage = data.totalDamage || 0;
        this.partyDeaths = data.partyDeaths || 0;
        this.isGameOver = data.isGameOver || false;
        this.partyIds = data.partyIds || [];
    }

    create() {
        AudioManager.playBGM('bgm_result');
        const cx = GAME_WIDTH / 2;
        this.add.rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0a0a1e);

        // Unlock gallery entries and grant XP on stage clear
        if (!this.isGameOver) {
            this.unlockGallery(this.stageData.id);
            // Grant battle XP to party members
            this.battleRewards = SaveManager.grantBattleRewards(this.partyIds, this.stageData);
        }

        // Result header
        const headerColor = this.isGameOver ? '#ff4444' : '#00ff88';
        const headerText = this.isGameOver ? 'MISSION FAILED' : 'MISSION COMPLETE';
        this.add.text(cx, 40, headerText, {
            fontSize: '32px', fontFamily: 'Arial', color: headerColor,
            stroke: '#000000', strokeThickness: 4
        }).setOrigin(0.5);

        // Stage name
        this.add.text(cx, 80, this.stageData.name, {
            fontSize: '18px', fontFamily: 'Arial', color: '#aaaaaa'
        }).setOrigin(0.5);

        // Stars
        if (!this.isGameOver) {
            const starY = 120;
            for (let i = 0; i < 3; i++) {
                const filled = i < this.stars;
                const star = this.add.text(cx - 40 + i * 40, starY, '★', {
                    fontSize: '36px', fontFamily: 'Arial',
                    color: filled ? '#ffcc00' : '#333333'
                }).setOrigin(0.5);

                if (filled) {
                    star.setScale(0);
                    this.tweens.add({
                        targets: star,
                        scale: 1,
                        duration: 400,
                        delay: i * 300,
                        ease: 'Back.easeOut'
                    });
                }
            }
        }

        // Stats
        const statsY = 170;
        const min = Math.floor(this.timeInSeconds / 60);
        const sec = this.timeInSeconds % 60;

        this.add.text(cx - 150, statsY, '戦闘統計', {
            fontSize: '16px', fontFamily: 'Arial', color: '#88aacc'
        });

        const stats = [
            `クリアタイム: ${min}:${sec.toString().padStart(2, '0')}`,
            `総ダメージ: ${this.totalDamage.toLocaleString()}`,
            `戦闘不能: ${this.partyDeaths}名`
        ];

        if (this.battleRewards) {
            stats.push(`キャラXP: +${this.battleRewards.xpPerChar}`);
            stats.push(`クレジット: +${this.battleRewards.creditsReward}`);
        }

        stats.forEach((s, i) => {
            this.add.text(cx - 150, statsY + 25 + i * 22, s, {
                fontSize: '13px', fontFamily: 'Arial', color: '#cccccc'
            });
        });

        // Drops
        const dropY = statsY + 110;
        this.add.text(cx - 150, dropY, 'ドロップ報酬', {
            fontSize: '16px', fontFamily: 'Arial', color: '#88aacc'
        });

        if (this.drops.length === 0 && this.isGameOver) {
            this.add.text(cx - 150, dropY + 25, '(なし)', {
                fontSize: '13px', fontFamily: 'Arial', color: '#666666'
            });
        } else {
            this.drops.forEach((drop, i) => {
                this.add.text(cx - 150, dropY + 25 + i * 20, DropSystem.getDropDisplayName(drop), {
                    fontSize: '13px', fontFamily: 'Arial', color: '#ffcc44'
                });
            });
        }

        // First clear rewards
        if (this.isFirstClear && this.firstClearRewards.length > 0) {
            const fcY = dropY + 25 + this.drops.length * 20 + 20;
            this.add.text(cx - 150, fcY, '初回クリア報酬!', {
                fontSize: '16px', fontFamily: 'Arial', color: '#ff88cc'
            });
            this.firstClearRewards.forEach((r, i) => {
                this.add.text(cx - 150, fcY + 25 + i * 20, DropSystem.getDropDisplayName(r), {
                    fontSize: '13px', fontFamily: 'Arial', color: '#ffaadd'
                });
            });
        }

        // Buttons
        const btnY = GAME_HEIGHT - 60;

        const retryBtn = this.add.rectangle(cx - 100, btnY, 160, 44, 0x443322)
            .setInteractive({ useHandCursor: true }).setStrokeStyle(1, 0x886644);
        this.add.text(cx - 100, btnY, 'もう一度', {
            fontSize: '16px', fontFamily: 'Arial', color: '#ffcc88'
        }).setOrigin(0.5);
        retryBtn.on('pointerdown', () => {
            const characters = this.cache.json.get('characters');
            const party = characters.slice(0, 3);
            this.scene.start('GameScene', {
                stageId: this.stageData.id,
                stageData: this.stageData,
                party
            });
        });
        retryBtn.on('pointerover', () => retryBtn.setFillStyle(0x554433));
        retryBtn.on('pointerout', () => retryBtn.setFillStyle(0x443322));

        const menuBtn = this.add.rectangle(cx + 100, btnY, 160, 44, 0x224444)
            .setInteractive({ useHandCursor: true }).setStrokeStyle(1, 0x448888);
        this.add.text(cx + 100, btnY, 'メニューへ', {
            fontSize: '16px', fontFamily: 'Arial', color: '#88ffcc'
        }).setOrigin(0.5);
        menuBtn.on('pointerdown', () => this.scene.start('MenuScene'));
        menuBtn.on('pointerover', () => menuBtn.setFillStyle(0x335555));
        menuBtn.on('pointerout', () => menuBtn.setFillStyle(0x224444));
    }

    unlockGallery(stageId) {
        const gallery = this.cache.json.get('scenario_gallery');
        if (!gallery) return;
        const save = SaveManager.load();
        if (!save.gallery) save.gallery = { unlockedIds: [] };

        const unlockKey = stageId + '_clear';
        gallery.forEach(entry => {
            if (entry.unlockCondition === unlockKey) {
                if (!save.gallery.unlockedIds.includes(entry.galleryId)) {
                    save.gallery.unlockedIds.push(entry.galleryId);
                }
            }
        });
        SaveManager.save(save);
    }
}
