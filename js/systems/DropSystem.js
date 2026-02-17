class DropSystem {
    static generateStageDrops(stageData) {
        const drops = [];
        const creditsMin = stageData.dropCreditsMin || 0;
        const creditsMax = stageData.dropCreditsMax || 0;
        if (creditsMax > 0) {
            const amount = Math.floor(creditsMin + Math.random() * (creditsMax - creditsMin));
            drops.push({ type: 'credit', amount });
        }

        if (Math.random() < (stageData.dropExpChance || 0)) {
            drops.push({ type: 'exp_material', id: 'exp_chip_s', amount: 1 });
        }

        if (Math.random() < (stageData.dropWeaponChance || 0)) {
            drops.push({ type: 'weapon', rarity: 1, amount: 1 });
        }

        return drops;
    }

    static generateFirstClearRewards(stageData) {
        const rewards = [];
        if (stageData.firstClearGems) {
            rewards.push({ type: 'gems', amount: stageData.firstClearGems });
        }
        if (stageData.firstClearItems && stageData.firstClearItems !== '') {
            const items = stageData.firstClearItems.split(',');
            items.forEach(item => {
                const [id, countStr] = item.trim().split(':');
                rewards.push({ type: 'item', id, amount: parseInt(countStr, 10) || 1 });
            });
        }
        return rewards;
    }

    static getDropDisplayName(drop) {
        switch (drop.type) {
            case 'credit': return `クレジット ×${drop.amount}`;
            case 'gems': return `ジェム ×${drop.amount}`;
            case 'exp_material': return `EXPチップ ×${drop.amount}`;
            case 'weapon': return `★${drop.rarity} 武器`;
            case 'item': return `${drop.id} ×${drop.amount}`;
            default: return `${drop.type} ×${drop.amount}`;
        }
    }
}
