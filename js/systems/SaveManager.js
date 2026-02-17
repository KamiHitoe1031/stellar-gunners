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
}
