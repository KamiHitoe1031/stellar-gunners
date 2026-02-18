class ShopScene extends Phaser.Scene {
    constructor() {
        super('ShopScene');
    }

    init() {
        this.currentTab = 'weapons';
    }

    create() {
        this.weaponsData = this.cache.json.get('weapons');
        this.modulesData = this.cache.json.get('modules');
        this.save = SaveManager.load();

        this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0e0e22);

        this.shopItems = this.buildShopItems();
        this.showShop();
    }

    buildShopItems() {
        const items = [];

        // Weapons for sale (rarity 1-2 always available, rarity 3 costs gems)
        this.weaponsData.forEach(w => {
            if (w.rarity <= 2) {
                items.push({
                    id: w.id, name: w.name, category: 'weapons',
                    desc: `${w.weaponType} / ATK+${w.mainAtk}`,
                    price: w.rarity === 1 ? 200 : 500,
                    currency: 'credits', rarity: w.rarity, data: w
                });
            } else if (w.rarity === 3) {
                items.push({
                    id: w.id, name: w.name, category: 'weapons',
                    desc: `${w.weaponType} / ATK+${w.mainAtk}`,
                    price: 50, currency: 'gems', rarity: w.rarity, data: w
                });
            }
        });

        // Materials
        items.push({
            id: 'exp_chip_s', name: 'EXPチップS', category: 'materials',
            desc: 'キャラEXP +50', price: 100, currency: 'credits', rarity: 1
        });
        items.push({
            id: 'exp_chip_m', name: 'EXPチップM', category: 'materials',
            desc: 'キャラEXP +200', price: 350, currency: 'credits', rarity: 2
        });
        items.push({
            id: 'exp_chip_l', name: 'EXPチップL', category: 'materials',
            desc: 'キャラEXP +800', price: 1200, currency: 'credits', rarity: 3
        });
        items.push({
            id: 'stamina_drink', name: '電力ドリンク', category: 'materials',
            desc: '電力 +60 回復', price: 10, currency: 'gems', rarity: 2
        });

        return items;
    }

    showShop() {
        this.clearUI();
        this.save = SaveManager.load();

        this.createBackButton(() => this.scene.start('MenuScene'));

        this.add.text(GAME_WIDTH / 2, 28, 'ショップ', {
            fontSize: '24px', fontFamily: 'Arial', color: '#ffffff',
            stroke: '#000000', strokeThickness: 2
        }).setOrigin(0.5);

        // Currency display
        this.add.text(GAME_WIDTH - 20, 15, `クレジット: ${this.save.player.credits}`, {
            fontSize: '13px', fontFamily: 'Arial', color: '#ffcc44'
        }).setOrigin(1, 0);
        this.add.text(GAME_WIDTH - 20, 33, `ジェム: ${this.save.player.gems}`, {
            fontSize: '13px', fontFamily: 'Arial', color: '#44ccff'
        }).setOrigin(1, 0);

        // Tabs
        const tabs = [
            { key: 'weapons', label: '武器' },
            { key: 'materials', label: '素材' }
        ];

        tabs.forEach((tab, i) => {
            const tx = 120 + i * 140;
            const isActive = this.currentTab === tab.key;
            const tabBg = this.add.rectangle(tx, 68, 120, 30, isActive ? 0x2244aa : 0x1a1a33)
                .setInteractive({ useHandCursor: true })
                .setStrokeStyle(1, isActive ? 0x4488ff : 0x333355);

            this.add.text(tx, 68, tab.label, {
                fontSize: '14px', fontFamily: 'Arial', color: isActive ? '#ffffff' : '#888888'
            }).setOrigin(0.5);

            tabBg.on('pointerdown', () => {
                this.currentTab = tab.key;
                this.showShop();
            });
        });

        // Items list
        const filteredItems = this.shopItems.filter(item => item.category === this.currentTab);
        const startY = 100;
        const itemHeight = 70;

        filteredItems.forEach((item, i) => {
            const y = startY + i * itemHeight;
            if (y + itemHeight > GAME_HEIGHT - 20) return; // Skip if off screen

            const rarityColors = { 1: 0x666666, 2: 0x2255aa, 3: 0x8844cc, 4: 0xcc8800 };
            const borderColor = rarityColors[item.rarity] || 0x333355;

            const bg = this.add.rectangle(GAME_WIDTH / 2, y + 28, 720, 60, 0x1a1a33, 0.9)
                .setInteractive({ useHandCursor: true })
                .setStrokeStyle(1, borderColor);

            // Weapon/item icon
            const iconX = 60;
            if (item.data && item.data.weaponType) {
                const iconKey = `wpn_icon_${item.data.weaponType}`;
                if (this.textures.exists(iconKey)) {
                    this.add.image(iconX, y + 28, iconKey).setDisplaySize(44, 44);
                }
            } else {
                // Material icon (colored square)
                const matColors = { exp_chip_s: 0x44cc88, exp_chip_m: 0x4488cc, exp_chip_l: 0x8844cc, stamina_drink: 0xcc8844 };
                this.add.rectangle(iconX, y + 28, 40, 40, matColors[item.id] || 0x666666, 0.8)
                    .setStrokeStyle(1, borderColor);
                const matLabels = { exp_chip_s: 'EXP\nS', exp_chip_m: 'EXP\nM', exp_chip_l: 'EXP\nL', stamina_drink: '電力' };
                this.add.text(iconX, y + 28, matLabels[item.id] || '?', {
                    fontSize: '10px', fontFamily: 'Arial', color: '#ffffff', align: 'center'
                }).setOrigin(0.5);
            }

            // Name + desc
            const rarityStr = '★'.repeat(item.rarity);
            this.add.text(92, y + 12, `${rarityStr} ${item.name}`, {
                fontSize: '14px', fontFamily: 'Arial', color: '#ffffff'
            });
            this.add.text(92, y + 33, item.desc, {
                fontSize: '11px', fontFamily: 'Arial', color: '#aaaaaa'
            });

            // Price + buy button
            const isCredits = item.currency === 'credits';
            const canAfford = isCredits
                ? this.save.player.credits >= item.price
                : this.save.player.gems >= item.price;

            const priceText = `${item.price} ${isCredits ? 'Cr' : 'Gem'}`;
            const priceColor = canAfford ? (isCredits ? '#ffcc44' : '#44ccff') : '#ff4444';

            const buyBtn = this.add.rectangle(GAME_WIDTH - 90, y + 28, 100, 36, canAfford ? 0x225533 : 0x332222)
                .setInteractive({ useHandCursor: canAfford })
                .setStrokeStyle(1, canAfford ? 0x44aa66 : 0x663333);

            this.add.text(GAME_WIDTH - 90, y + 20, '購入', {
                fontSize: '13px', fontFamily: 'Arial', color: canAfford ? '#ffffff' : '#666666'
            }).setOrigin(0.5);
            this.add.text(GAME_WIDTH - 90, y + 36, priceText, {
                fontSize: '10px', fontFamily: 'Arial', color: priceColor
            }).setOrigin(0.5);

            if (canAfford) {
                buyBtn.on('pointerover', () => buyBtn.setFillStyle(0x336644));
                buyBtn.on('pointerout', () => buyBtn.setFillStyle(0x225533));
                buyBtn.on('pointerdown', () => this.purchaseItem(item));
            }
        });
    }

    purchaseItem(item) {
        const save = SaveManager.load();
        const isCredits = item.currency === 'credits';

        if (isCredits) {
            if (save.player.credits < item.price) return;
            save.player.credits -= item.price;
        } else {
            if (save.player.gems < item.price) return;
            save.player.gems -= item.price;
        }

        // Add item to inventory
        if (item.category === 'weapons' && item.data) {
            // Add weapon to weapons inventory
            if (!save.weapons) save.weapons = {};
            const instanceId = `${item.id}_${Date.now()}`;
            save.weapons[instanceId] = {
                weaponDefId: item.id,
                level: 1,
                acquiredAt: Date.now()
            };
        } else if (item.id === 'stamina_drink') {
            save.player.stamina = Math.min(save.player.stamina + 60, 240);
        } else {
            if (!save.inventory) save.inventory = {};
            if (!save.inventory[item.id]) save.inventory[item.id] = 0;
            save.inventory[item.id] += 1;
        }

        SaveManager.save(save);

        // Show purchase effect
        const text = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, `${item.name} を購入!`, {
            fontSize: '22px', fontFamily: 'Arial', color: '#44ff88',
            stroke: '#000000', strokeThickness: 3
        }).setOrigin(0.5).setDepth(200);

        this.tweens.add({
            targets: text,
            y: text.y - 50,
            alpha: 0,
            duration: 800,
            ease: 'Power2',
            onComplete: () => {
                text.destroy();
                this.showShop();
            }
        });
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
