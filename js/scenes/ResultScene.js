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
        const cy = GAME_HEIGHT / 2;

        // Dark background
        this.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x060812);

        // Unlock gallery and grant rewards on victory
        if (!this.isGameOver) {
            this.unlockGallery(this.stageData.id);
            this.battleRewards = SaveManager.grantBattleRewards(this.partyIds, this.stageData);
        }

        // Main panel
        this.add.image(cx, cy + 20, 'result_panel').setDepth(1);

        // === Header banner ===
        const headerKey = this.isGameOver ? 'result_header_fail' : 'result_header_clear';
        this.add.image(cx, 50, headerKey).setDepth(2);

        const headerColor = this.isGameOver ? '#ff4444' : '#00ff88';
        const headerText = this.isGameOver ? 'MISSION FAILED' : 'MISSION COMPLETE';
        const header = this.add.text(cx, 50, headerText, {
            fontSize: '28px', fontFamily: 'Arial', color: headerColor,
            stroke: '#000000', strokeThickness: 4
        }).setOrigin(0.5).setDepth(3);

        // Fade-in header
        header.setAlpha(0);
        this.tweens.add({ targets: header, alpha: 1, duration: 600, delay: 200 });

        // === Stage name ===
        this.add.text(cx, 90, this.stageData.name, {
            fontSize: '15px', fontFamily: 'Arial', color: '#8899aa',
            stroke: '#000000', strokeThickness: 2
        }).setOrigin(0.5).setDepth(3);

        // === Stars ===
        if (!this.isGameOver) {
            for (let i = 0; i < 3; i++) {
                const filled = i < this.stars;
                const starKey = filled ? 'result_star_filled' : 'result_star_empty';
                const star = this.add.image(cx - 50 + i * 50, 125, starKey).setDepth(3);
                if (filled) {
                    star.setScale(0);
                    this.tweens.add({
                        targets: star, scale: 1,
                        duration: 400, delay: 400 + i * 250,
                        ease: 'Back.easeOut'
                    });
                }
            }
        }

        // === Divider ===
        this.add.image(cx, 158, 'result_divider').setDepth(2);

        // === Two-column layout: Stats (left) | Drops (right) ===
        const colLeftX = cx - 170;
        const colRightX = cx + 130;
        const contentY = 175;

        // --- Left column: Battle Stats ---
        this.add.text(colLeftX, contentY, '戦闘統計', {
            fontSize: '14px', fontFamily: 'Arial', color: '#6688aa',
            stroke: '#000000', strokeThickness: 1
        }).setDepth(3);

        const min = Math.floor(this.timeInSeconds / 60);
        const sec = this.timeInSeconds % 60;

        const stats = [
            { icon: 'result_icon_time', text: `${min}:${sec.toString().padStart(2, '0')}`, label: 'クリアタイム' },
            { icon: 'result_icon_damage', text: this.totalDamage.toLocaleString(), label: '総ダメージ' },
            { icon: 'result_icon_death', text: `${this.partyDeaths}名`, label: '戦闘不能' }
        ];

        if (this.battleRewards) {
            stats.push({ icon: 'result_icon_xp', text: `+${this.battleRewards.xpPerChar}`, label: 'キャラXP' });
            stats.push({ icon: 'result_icon_credit', text: `+${this.battleRewards.creditsReward}`, label: 'クレジット' });
        }

        stats.forEach((s, i) => {
            const y = contentY + 25 + i * 28;
            this.add.image(colLeftX + 6, y + 3, s.icon).setDepth(3);
            this.add.text(colLeftX + 22, y - 4, s.label, {
                fontSize: '10px', fontFamily: 'Arial', color: '#667788'
            }).setDepth(3);
            this.add.text(colLeftX + 22, y + 8, s.text, {
                fontSize: '14px', fontFamily: 'Arial', color: '#ddddee',
                stroke: '#000000', strokeThickness: 1
            }).setDepth(3);
        });

        // --- Right column: Drop Rewards ---
        this.add.text(colRightX, contentY, 'ドロップ報酬', {
            fontSize: '14px', fontFamily: 'Arial', color: '#6688aa',
            stroke: '#000000', strokeThickness: 1
        }).setDepth(3);

        if (this.drops.length === 0) {
            this.add.text(colRightX + 10, contentY + 30, this.isGameOver ? '(なし)' : '(報酬なし)', {
                fontSize: '12px', fontFamily: 'Arial', color: '#445566'
            }).setDepth(3);
        } else {
            this.drops.forEach((drop, i) => {
                const y = contentY + 25 + i * 34;
                this.add.image(colRightX + 150, y + 14, 'result_drop_bg').setDepth(2);
                const name = DropSystem.getDropDisplayName(drop);
                this.add.text(colRightX + 14, y + 8, name, {
                    fontSize: '13px', fontFamily: 'Arial', color: '#ffcc44',
                    stroke: '#000000', strokeThickness: 1
                }).setDepth(3);
            });
        }

        // === First Clear Rewards ===
        let bottomY = 340;
        if (this.isFirstClear && this.firstClearRewards.length > 0) {
            this.add.image(cx, bottomY, 'result_divider').setDepth(2);
            bottomY += 10;

            this.add.text(cx, bottomY, '初回クリア報酬!', {
                fontSize: '14px', fontFamily: 'Arial', color: '#ff88cc',
                stroke: '#000000', strokeThickness: 2
            }).setOrigin(0.5).setDepth(3);

            this.firstClearRewards.forEach((r, i) => {
                const y = bottomY + 22 + i * 24;
                this.add.text(cx, y, DropSystem.getDropDisplayName(r), {
                    fontSize: '13px', fontFamily: 'Arial', color: '#ffaadd',
                    stroke: '#000000', strokeThickness: 1
                }).setOrigin(0.5).setDepth(3);
            });
            bottomY += 22 + this.firstClearRewards.length * 24 + 10;
        }

        // === Divider before party ===
        this.add.image(cx, Math.max(bottomY, 380), 'result_divider').setDepth(2);

        // === Party character icons ===
        const partyY = Math.max(bottomY + 20, 400);
        const characters = this.cache.json.get('characters');
        if (characters && this.partyIds.length > 0) {
            const partyChars = this.partyIds.map(id => characters.find(c => c.id === id)).filter(Boolean);
            const startX = cx - ((partyChars.length - 1) * 60) / 2;

            partyChars.forEach((charData, i) => {
                const x = startX + i * 60;
                const charId = charData.charId || charData.id.replace('_normal', '');
                const iconKey = `icon_${charId}`;
                const col = ATTRIBUTE_COLORS[charData.attribute] || 0xffffff;

                // Background circle
                this.add.circle(x, partyY, 22, 0x111122, 0.8)
                    .setStrokeStyle(2, col, 0.9).setDepth(3);

                // Icon or fallback
                if (this.textures.exists(iconKey)) {
                    this.add.image(x, partyY, iconKey)
                        .setDisplaySize(36, 36).setDepth(4);
                } else {
                    this.add.circle(x, partyY, 14, col, 0.5).setDepth(4);
                }

                // Name
                const shortName = charData.name.split('・')[0].substring(0, 4);
                this.add.text(x, partyY + 28, shortName, {
                    fontSize: '9px', fontFamily: 'Arial', color: '#aabbcc',
                    stroke: '#000000', strokeThickness: 1
                }).setOrigin(0.5).setDepth(3);
            });
        }

        // === Buttons ===
        const btnY = GAME_HEIGHT - 55;

        // Retry button
        const retryImg = this.add.image(cx - 105, btnY, 'result_btn_retry')
            .setInteractive({ useHandCursor: true }).setDepth(3);
        this.add.text(cx - 105, btnY, 'もう一度', {
            fontSize: '16px', fontFamily: 'Arial', color: '#fff0dd',
            stroke: '#000000', strokeThickness: 2
        }).setOrigin(0.5).setDepth(4);

        retryImg.on('pointerover', () => retryImg.setAlpha(0.8));
        retryImg.on('pointerout', () => retryImg.setAlpha(1));
        retryImg.on('pointerdown', () => {
            const chars = this.cache.json.get('characters');
            const weaponsData = this.cache.json.get('weapons');
            const modulesData = this.cache.json.get('modules');
            const save = SaveManager.load();
            let party = this.partyIds.map(id => {
                const base = chars.find(c => c.id === id);
                return base ? EquipmentSystem.getCharBattleStats(base, save, weaponsData, modulesData) : null;
            }).filter(Boolean);
            if (party.length === 0) {
                party = chars.slice(0, 3).map(c =>
                    EquipmentSystem.getCharBattleStats(c, save, weaponsData, modulesData)
                );
            }
            this.scene.start('GameScene', {
                stageId: this.stageData.id,
                stageData: this.stageData,
                party
            });
        });

        // Menu button
        const menuImg = this.add.image(cx + 105, btnY, 'result_btn_menu')
            .setInteractive({ useHandCursor: true }).setDepth(3);
        this.add.text(cx + 105, btnY, 'メニューへ', {
            fontSize: '16px', fontFamily: 'Arial', color: '#ddfff0',
            stroke: '#000000', strokeThickness: 2
        }).setOrigin(0.5).setDepth(4);

        menuImg.on('pointerover', () => menuImg.setAlpha(0.8));
        menuImg.on('pointerout', () => menuImg.setAlpha(1));
        menuImg.on('pointerdown', () => this.scene.start('MenuScene'));
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
