class SaveManager {
    static getDefault() {
        return {
            version: 2,
            player: {
                name: 'Commander',
                level: 1,
                exp: 0,
                stamina: 120,
                lastStaminaRefill: Date.now(),
                credits: 1000,
                gems: 0
            },
            characters: {},
            weapons: {},
            modules: {},
            equipment: {},
            progress: {
                currentChapter: 1,
                clearedStages: {},
                staminaSpent: 0
            },
            inventory: {},
            readScenarios: {},
            gallery: {
                unlockedIds: []
            },
            settings: {
                bgmVolume: 0.5,
                sfxVolume: 0.7,
                skipMode: 'all'
            }
        };
    }

    static load() {
        try {
            const raw = localStorage.getItem(SAVE_KEY);
            if (!raw) return this.getDefault();
            const data = JSON.parse(raw);
            return { ...this.getDefault(), ...data };
        } catch {
            return this.getDefault();
        }
    }

    static save(data) {
        try {
            localStorage.setItem(SAVE_KEY, JSON.stringify(data));
        } catch (e) {
            console.warn('Save failed:', e);
        }
    }

    static initCharacters(charactersData) {
        const save = this.load();
        if (Object.keys(save.characters).length === 0) {
            charactersData.forEach(c => {
                save.characters[c.id] = {
                    level: 1,
                    exp: 0,
                    breakthroughCount: 0,
                    awakening: 0
                };
            });
            this.save(save);
        }
        return save;
    }

    static markStageCleared(stageId, stars) {
        const save = this.load();
        const existing = save.progress.clearedStages[stageId];
        if (!existing || existing.stars < stars) {
            save.progress.clearedStages[stageId] = { stars, clearedAt: Date.now() };
        }
        this.save(save);
        return save;
    }

    static addCredits(amount) {
        const save = this.load();
        save.player.credits += amount;
        this.save(save);
        return save;
    }

    static addGems(amount) {
        const save = this.load();
        save.player.gems += amount;
        this.save(save);
        return save;
    }

    static markAsRead(scenarioId, seqNo) {
        const save = this.load();
        if (!save.readScenarios[scenarioId]) {
            save.readScenarios[scenarioId] = [];
        }
        if (!save.readScenarios[scenarioId].includes(seqNo)) {
            save.readScenarios[scenarioId].push(seqNo);
        }
        this.save(save);
    }

    static isRead(scenarioId, seqNo) {
        const save = this.load();
        return save.readScenarios[scenarioId]?.includes(seqNo) || false;
    }

    static getCharLevel(charId) {
        const save = this.load();
        return save.characters[charId]?.level || 1;
    }

    static getCharExp(charId) {
        const save = this.load();
        return save.characters[charId]?.exp || 0;
    }

    static levelUpCharacter(charId, progressionData) {
        const save = this.load();
        if (!save.characters[charId]) {
            save.characters[charId] = { level: 1, exp: 0, breakthroughCount: 0, awakening: 0 };
        }
        const charSave = save.characters[charId];
        const currentLevel = charSave.level;

        // Find next level XP requirement
        const nextLevelData = progressionData.find(p => p.level === currentLevel + 1);
        if (!nextLevelData) return { success: false, reason: 'max_level' };

        const cost = nextLevelData.xpRequired;
        if (save.player.credits < cost) return { success: false, reason: 'no_credits', needed: cost };

        save.player.credits -= cost;
        charSave.level += 1;
        this.save(save);
        return { success: true, newLevel: charSave.level, creditsSpent: cost };
    }

    static getCharStats(charData, level) {
        return {
            hp: charData.hp + charData.growthHp * (level - 1),
            atk: charData.atk + charData.growthAtk * (level - 1),
            def: charData.def + charData.growthDef * (level - 1),
            shield: charData.shield + charData.growthShield * (level - 1)
        };
    }

    static addInventoryItem(itemId, amount) {
        const save = this.load();
        if (!save.inventory[itemId]) save.inventory[itemId] = 0;
        save.inventory[itemId] += amount;
        this.save(save);
        return save;
    }

    static getInventory() {
        const save = this.load();
        return save.inventory || {};
    }

    /** Refill stamina based on time elapsed (1 per minute, max 120) */
    static refillStamina(save) {
        if (!save) save = this.load();
        const now = Date.now();
        const last = save.player.lastStaminaRefill || now;
        const elapsedMinutes = Math.floor((now - last) / 60000);
        const maxStamina = 120;

        if (elapsedMinutes > 0 && save.player.stamina < maxStamina) {
            save.player.stamina = Math.min(maxStamina, save.player.stamina + elapsedMinutes);
            save.player.lastStaminaRefill = now;
            this.save(save);
        }
        return save;
    }

    /** Grant XP to party members after battle */
    static grantBattleRewards(partyIds, stageData) {
        const save = this.load();
        const xpPerChar = stageData.baseXP || 50;
        const creditsReward = stageData.baseCreditReward || 100;

        partyIds.forEach(charId => {
            if (!save.characters[charId]) {
                save.characters[charId] = { level: 1, exp: 0, breakthroughCount: 0, awakening: 0 };
            }
            save.characters[charId].exp = (save.characters[charId].exp || 0) + xpPerChar;
        });

        // Player XP
        save.player.exp = (save.player.exp || 0) + Math.floor(xpPerChar / 2);
        const playerLevelThreshold = save.player.level * 200;
        if (save.player.exp >= playerLevelThreshold) {
            save.player.level += 1;
            save.player.exp -= playerLevelThreshold;
        }

        save.player.credits += creditsReward;
        this.save(save);
        return { xpPerChar, creditsReward, playerLevel: save.player.level };
    }
}
