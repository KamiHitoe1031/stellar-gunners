class TransformPotScene extends Phaser.Scene {
    constructor() {
        super('TransformPotScene');
    }

    init() {
        this.potItems = [];
        this.selectedTab = 'weapon';
        this.resultItems = [];
        this.isTransforming = false;
    }

    create() {
        this.weapons = this.cache.json.get('weapons');
        this.modules = this.cache.json.get('modules');

        this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0e0e22);

        // Back button
        const backBtn = this.add.text(20, 15, '< 戻る', {
            fontSize: '16px', fontFamily: 'Arial', color: '#88aacc',
            stroke: '#000000', strokeThickness: 2
        }).setInteractive({ useHandCursor: true });
        backBtn.on('pointerdown', () => this.scene.start('MenuScene'));
        backBtn.on('pointerover', () => backBtn.setColor('#bbddff'));
        backBtn.on('pointerout', () => backBtn.setColor('#88aacc'));

        // Title
        this.add.text(GAME_WIDTH / 2, 30, '量子変換炉', {
            fontSize: '26px', fontFamily: 'Arial', color: '#44ccff',
            stroke: '#000000', strokeThickness: 3
        }).setOrigin(0.5);

        this.add.text(GAME_WIDTH / 2, 58, '装備を量子分解し別の装備に再構成します', {
            fontSize: '12px', fontFamily: 'Arial', color: '#667799'
        }).setOrigin(0.5);

        // Cost display
        const save = SaveManager.load();
        this.creditsText = this.add.text(GAME_WIDTH - 20, 15, `クレジット: ${save.player.credits}`, {
            fontSize: '13px', fontFamily: 'Arial', color: '#ffcc44',
            stroke: '#000000', strokeThickness: 1
        }).setOrigin(1, 0);

        this.costText = this.add.text(GAME_WIDTH - 20, 35, `変換コスト: ${TransformPotSystem.COST_PER_USE}`, {
            fontSize: '11px', fontFamily: 'Arial', color: '#aaaaaa'
        }).setOrigin(1, 0);

        // Pot visual (center)
        this.drawPot();

        // Tab buttons
        this.createTabs();

        // Inventory list (left side)
        this.inventoryContainer = this.add.container(0, 0);
        this.refreshInventory();

        // Results area (right side)
        this.resultsContainer = this.add.container(0, 0);

        // Transform button
        this.transformBtn = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - 50, 180, 44, 0x113355)
            .setInteractive({ useHandCursor: true })
            .setStrokeStyle(2, 0x3388cc);
        this.transformBtnText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 50, '変換実行', {
            fontSize: '18px', fontFamily: 'Arial', color: '#88ccff'
        }).setOrigin(0.5);

        this.transformBtn.on('pointerover', () => {
            if (this.potItems.length > 0 && !this.isTransforming) {
                this.transformBtn.setFillStyle(0x1a4466);
            }
        });
        this.transformBtn.on('pointerout', () => this.transformBtn.setFillStyle(0x113355));
        this.transformBtn.on('pointerdown', () => this.doTransform());

        this.updateTransformButton();
    }

    drawPot() {
        const cx = GAME_WIDTH / 2;
        const cy = 200;

        // Reactor body (sci-fi hexagonal chamber)
        const g = this.add.graphics();
        g.fillStyle(0x112244, 0.9);
        g.fillRoundedRect(cx - 55, cy - 35, 110, 85, 6);
        g.fillStyle(0x0a1a33, 0.95);
        g.fillRoundedRect(cx - 50, cy - 30, 100, 75, 4);
        // Top panel
        g.fillStyle(0x1a3355, 0.9);
        g.fillRoundedRect(cx - 55, cy - 40, 110, 16, 4);
        // Glow ring
        g.lineStyle(2, 0x44aaff, 0.7);
        g.strokeRoundedRect(cx - 55, cy - 35, 110, 85, 6);
        // Inner glow
        g.lineStyle(1, 0x2288cc, 0.4);
        g.strokeRoundedRect(cx - 48, cy - 28, 96, 69, 3);
        // Energy indicators (top)
        g.fillStyle(0x44ccff, 0.6);
        g.fillCircle(cx - 35, cy - 33, 3);
        g.fillCircle(cx, cy - 33, 3);
        g.fillCircle(cx + 35, cy - 33, 3);

        // Reactor label
        this.add.text(cx, cy + 12, 'Q-CONV', {
            fontSize: '20px', fontFamily: 'Arial', color: '#44ccff',
            stroke: '#0a1a33', strokeThickness: 3
        }).setOrigin(0.5);

        // Slot indicators
        this.potSlots = [];
        for (let i = 0; i < TransformPotSystem.POT_CAPACITY; i++) {
            const sx = cx - 40 + i * 40;
            const sy = cy - 12;
            const slot = this.add.rectangle(sx, sy, 30, 30, 0x0a1a33, 0.7)
                .setStrokeStyle(1, 0x2266aa);
            const slotText = this.add.text(sx, sy, '', {
                fontSize: '10px', fontFamily: 'Arial', color: '#44ccff'
            }).setOrigin(0.5);
            this.potSlots.push({ bg: slot, text: slotText });
        }
    }

    createTabs() {
        const tabs = [
            { key: 'weapon', label: '武器' },
            { key: 'module', label: 'モジュール' }
        ];

        this.tabButtons = [];
        tabs.forEach((tab, i) => {
            const x = 80 + i * 120;
            const y = 90;
            const bg = this.add.rectangle(x, y, 100, 28, this.selectedTab === tab.key ? 0x334466 : 0x1a1a33)
                .setInteractive({ useHandCursor: true })
                .setStrokeStyle(1, this.selectedTab === tab.key ? 0x6688cc : 0x333355);
            const label = this.add.text(x, y, tab.label, {
                fontSize: '13px', fontFamily: 'Arial',
                color: this.selectedTab === tab.key ? '#ffffff' : '#888888'
            }).setOrigin(0.5);

            bg.on('pointerdown', () => {
                this.selectedTab = tab.key;
                this.potItems = [];
                this.resultItems = [];
                this.refreshTabs();
                this.refreshInventory();
                this.refreshPotSlots();
                this.refreshResults();
                this.updateTransformButton();
            });

            this.tabButtons.push({ bg, label, key: tab.key });
        });
    }

    refreshTabs() {
        this.tabButtons.forEach(t => {
            const active = t.key === this.selectedTab;
            t.bg.setFillStyle(active ? 0x334466 : 0x1a1a33);
            t.bg.setStrokeStyle(1, active ? 0x6688cc : 0x333355);
            t.label.setColor(active ? '#ffffff' : '#888888');
        });
    }

    refreshInventory() {
        this.inventoryContainer.removeAll(true);
        const inventory = TransformPotSystem.getInventory(this.selectedTab);
        const allItems = this.selectedTab === 'weapon' ? this.weapons : this.modules;

        const startX = 20;
        const startY = 120;

        if (inventory.length === 0) {
            const hint = this.add.text(startX, startY + 10,
                this.selectedTab === 'weapon'
                    ? '武器がありません\n(ステージクリアで入手)'
                    : 'モジュールがありません\n(ステージクリアで入手)',
                { fontSize: '12px', fontFamily: 'Arial', color: '#666666', lineSpacing: 4 }
            );
            this.inventoryContainer.add(hint);

            // Add starter items button
            const addBtn = this.add.rectangle(startX + 80, startY + 70, 160, 32, 0x223344)
                .setInteractive({ useHandCursor: true })
                .setStrokeStyle(1, 0x445566);
            const addLabel = this.add.text(startX + 80, startY + 70, 'サンプル追加 (無料)', {
                fontSize: '12px', fontFamily: 'Arial', color: '#88ccff'
            }).setOrigin(0.5);
            addBtn.on('pointerdown', () => {
                this.addSampleItems();
                this.refreshInventory();
            });
            this.inventoryContainer.add(addBtn);
            this.inventoryContainer.add(addLabel);
            return;
        }

        this.add.text(startX, startY, `所持${this.selectedTab === 'weapon' ? '武器' : 'モジュール'}: ${inventory.length}個`, {
            fontSize: '11px', fontFamily: 'Arial', color: '#aaaaaa'
        });

        inventory.forEach((inv, idx) => {
            const itemDef = allItems.find(a => a.id === inv.id);
            if (!itemDef) return;

            const y = startY + 20 + idx * 36;
            if (y > GAME_HEIGHT - 100) return;

            const alreadyInPot = this.potItems.some(p => p.invIndex === idx);
            const bgColor = alreadyInPot ? 0x332211 : 0x1a2233;

            const bg = this.add.rectangle(startX + 100, y + 12, 200, 30, bgColor, 0.9)
                .setInteractive({ useHandCursor: true })
                .setStrokeStyle(1, alreadyInPot ? 0x664422 : 0x334455);

            const rarityStr = this.selectedTab === 'weapon'
                ? '★'.repeat(itemDef.rarity)
                : itemDef.rarity;
            const name = this.add.text(startX + 10, y + 4, `${rarityStr} ${itemDef.name}`, {
                fontSize: '12px', fontFamily: 'Arial', color: alreadyInPot ? '#886644' : '#ffffff'
            });

            const typeInfo = this.selectedTab === 'weapon'
                ? itemDef.weaponType
                : `${itemDef.moduleType} | ${ATTRIBUTE_NAMES[itemDef.attribute] || ''}`;
            const sub = this.add.text(startX + 10, y + 18, typeInfo, {
                fontSize: '9px', fontFamily: 'Arial', color: '#777777'
            });

            if (!alreadyInPot && this.potItems.length < TransformPotSystem.POT_CAPACITY) {
                bg.on('pointerdown', () => {
                    this.potItems.push({ invIndex: idx, itemDef, invItem: inv });
                    this.refreshInventory();
                    this.refreshPotSlots();
                    this.updateTransformButton();
                });
                bg.on('pointerover', () => bg.setStrokeStyle(1, 0x6688cc));
                bg.on('pointerout', () => bg.setStrokeStyle(1, 0x334455));
            }

            this.inventoryContainer.add(bg);
            this.inventoryContainer.add(name);
            this.inventoryContainer.add(sub);
        });
    }

    refreshPotSlots() {
        this.potSlots.forEach((slot, i) => {
            if (i < this.potItems.length) {
                const item = this.potItems[i];
                slot.bg.setFillStyle(0x113355, 0.9);
                slot.bg.setStrokeStyle(1, 0x44ccff);
                slot.text.setText(item.itemDef.name.charAt(0));

                slot.bg.setInteractive({ useHandCursor: true });
                slot.bg.off('pointerdown');
                slot.bg.on('pointerdown', () => {
                    this.potItems.splice(i, 1);
                    this.refreshInventory();
                    this.refreshPotSlots();
                    this.updateTransformButton();
                });
            } else {
                slot.bg.setFillStyle(0x0a1a33, 0.7);
                slot.bg.setStrokeStyle(1, 0x2266aa);
                slot.text.setText('');
                slot.bg.disableInteractive();
            }
        });
    }

    updateTransformButton() {
        const canUse = this.potItems.length > 0 && TransformPotSystem.canAfford() && !this.isTransforming;
        this.transformBtn.setFillStyle(canUse ? 0x113355 : 0x0a1a2a);
        this.transformBtnText.setColor(canUse ? '#88ccff' : '#334455');

        if (!TransformPotSystem.canAfford()) {
            this.transformBtnText.setText('クレジット不足');
        } else if (this.potItems.length === 0) {
            this.transformBtnText.setText('装備を投入する');
        } else {
            this.transformBtnText.setText(`変換実行 (${this.potItems.length}個)`);
        }
    }

    doTransform() {
        if (this.potItems.length === 0 || !TransformPotSystem.canAfford() || this.isTransforming) return;
        this.isTransforming = true;

        TransformPotSystem.payCost();
        this.resultItems = [];

        // Visual effect: pot shakes
        this.cameras.main.shake(300, 0.005);

        const allItems = this.selectedTab === 'weapon' ? this.weapons : this.modules;

        // Remove items from inventory in reverse order (to preserve indices)
        const sortedByIndex = [...this.potItems].sort((a, b) => b.invIndex - a.invIndex);
        sortedByIndex.forEach(p => {
            TransformPotSystem.removeFromInventory(this.selectedTab, p.invIndex);
        });

        // Transform each item
        this.potItems.forEach((potItem, i) => {
            this.time.delayedCall(300 + i * 500, () => {
                let result;
                if (this.selectedTab === 'weapon') {
                    result = TransformPotSystem.transformWeapon(potItem.itemDef.id, allItems);
                } else {
                    result = TransformPotSystem.transformModule(potItem.itemDef.id, allItems);
                }

                if (result) {
                    TransformPotSystem.addToInventory(this.selectedTab, result);
                    this.resultItems.push({ input: potItem.itemDef, output: result });
                } else {
                    // Failed: return original
                    TransformPotSystem.addToInventory(this.selectedTab, potItem.itemDef);
                    this.resultItems.push({ input: potItem.itemDef, output: potItem.itemDef, failed: true });
                }

                this.refreshResults();

                // When all done
                if (this.resultItems.length === this.potItems.length) {
                    this.time.delayedCall(500, () => {
                        this.isTransforming = false;
                        this.potItems = [];
                        this.refreshInventory();
                        this.refreshPotSlots();
                        this.updateTransformButton();
                        this.updateCreditsDisplay();
                    });
                }
            });
        });
    }

    refreshResults() {
        this.resultsContainer.removeAll(true);
        const startX = GAME_WIDTH / 2 + 50;
        const startY = 130;

        if (this.resultItems.length === 0) return;

        const title = this.add.text(startX, startY, '変換結果:', {
            fontSize: '14px', fontFamily: 'Arial', color: '#44ccff'
        });
        this.resultsContainer.add(title);

        this.resultItems.forEach((r, i) => {
            const y = startY + 25 + i * 50;
            const inputName = r.input.name;
            const outputName = r.output.name;
            const isUpgrade = this.isRarityHigher(r.output, r.input);
            const isSame = r.failed;

            const arrow = this.add.text(startX, y, `${inputName}`, {
                fontSize: '12px', fontFamily: 'Arial', color: '#aaaaaa'
            });
            this.resultsContainer.add(arrow);

            const arrowIcon = this.add.text(startX, y + 16, isSame ? '→ (変換失敗)' : '→', {
                fontSize: '12px', fontFamily: 'Arial', color: isSame ? '#ff6666' : '#44ccff'
            });
            this.resultsContainer.add(arrowIcon);

            if (!isSame) {
                const resultColor = isUpgrade ? '#ffff44' : '#88ddff';
                const label = isUpgrade ? 'UP! ' : '';
                const resultText = this.add.text(startX + 20, y + 16, `${label}${outputName}`, {
                    fontSize: '12px', fontFamily: 'Arial', color: resultColor
                });
                this.resultsContainer.add(resultText);

                if (isUpgrade) {
                    this.tweens.add({
                        targets: resultText,
                        alpha: 0.5,
                        duration: 400,
                        yoyo: true,
                        repeat: 2
                    });
                }
            }
        });
    }

    isRarityHigher(a, b) {
        if (this.selectedTab === 'weapon') {
            return (a.rarity || 0) > (b.rarity || 0);
        }
        const order = ['N', 'R', 'SR', 'SSR'];
        return order.indexOf(a.rarity) > order.indexOf(b.rarity);
    }

    updateCreditsDisplay() {
        const save = SaveManager.load();
        this.creditsText.setText(`クレジット: ${save.player.credits}`);
    }

    addSampleItems() {
        const items = this.selectedTab === 'weapon' ? this.weapons : this.modules;
        const starters = items.slice(0, 4);
        starters.forEach(item => {
            TransformPotSystem.addToInventory(this.selectedTab, item);
        });
    }
}
