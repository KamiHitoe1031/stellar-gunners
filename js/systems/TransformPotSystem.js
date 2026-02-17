class TransformPotSystem {
    static COST_PER_USE = 200;
    static POT_CAPACITY = 3;

    static transformWeapon(inputWeaponId, allWeapons) {
        const input = allWeapons.find(w => w.id === inputWeaponId);
        if (!input) return null;

        // Same rarity or ±1 rarity, different weapon
        const candidates = allWeapons.filter(w =>
            w.id !== inputWeaponId &&
            Math.abs(w.rarity - input.rarity) <= 1
        );
        if (candidates.length === 0) return null;

        // Higher rarity has lower chance
        const weighted = [];
        candidates.forEach(c => {
            let weight = 10;
            if (c.rarity > input.rarity) weight = 3;
            if (c.rarity < input.rarity) weight = 5;
            if (c.rarity === input.rarity) weight = 10;
            for (let i = 0; i < weight; i++) weighted.push(c);
        });

        return weighted[Math.floor(Math.random() * weighted.length)];
    }

    static transformModule(inputModuleId, allModules) {
        const input = allModules.find(m => m.id === inputModuleId);
        if (!input) return null;

        const rarityOrder = ['N', 'R', 'SR', 'SSR'];
        const inputRarityIdx = rarityOrder.indexOf(input.rarity);

        const candidates = allModules.filter(m => {
            if (m.id === inputModuleId) return false;
            const idx = rarityOrder.indexOf(m.rarity);
            return Math.abs(idx - inputRarityIdx) <= 1;
        });
        if (candidates.length === 0) return null;

        const weighted = [];
        candidates.forEach(c => {
            const cIdx = rarityOrder.indexOf(c.rarity);
            let weight = 10;
            if (cIdx > inputRarityIdx) weight = 3;
            if (cIdx < inputRarityIdx) weight = 5;
            for (let i = 0; i < weight; i++) weighted.push(c);
        });

        return weighted[Math.floor(Math.random() * weighted.length)];
    }

    static canAfford() {
        const save = SaveManager.load();
        return save.player.credits >= this.COST_PER_USE;
    }

    static payCost() {
        const save = SaveManager.load();
        if (save.player.credits < this.COST_PER_USE) return false;
        save.player.credits -= this.COST_PER_USE;
        SaveManager.save(save);
        return true;
    }

    static addToInventory(type, item) {
        const save = SaveManager.load();
        if (type === 'weapon') {
            if (!save.weapons._inventory) save.weapons._inventory = [];
            save.weapons._inventory.push({
                id: item.id,
                name: item.name,
                obtainedAt: Date.now()
            });
        } else if (type === 'module') {
            if (!save.modules._inventory) save.modules._inventory = [];
            save.modules._inventory.push({
                id: item.id,
                name: item.name,
                obtainedAt: Date.now()
            });
        }
        SaveManager.save(save);
    }

    static removeFromInventory(type, index) {
        const save = SaveManager.load();
        if (type === 'weapon' && save.weapons._inventory) {
            save.weapons._inventory.splice(index, 1);
        } else if (type === 'module' && save.modules._inventory) {
            save.modules._inventory.splice(index, 1);
        }
        SaveManager.save(save);
    }

    static getInventory(type) {
        const save = SaveManager.load();
        if (type === 'weapon') return save.weapons._inventory || [];
        if (type === 'module') return save.modules._inventory || [];
        return [];
    }
}
