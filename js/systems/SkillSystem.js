class SkillSystem {
    constructor(scene) {
        this.scene = scene;
        this.cooldowns = {};
        this.ultGauge = {};
    }

    initForCharacter(charId, charData) {
        this.cooldowns[charId] = {
            skill1: { current: 0, max: (charData.skill1CD || 10) * 1000 },
            skill2: { current: 0, max: (charData.skill2CD || 18) * 1000 }
        };
        this.ultGauge[charId] = {
            current: 0,
            max: 1000,
            ultDmgMult: charData.ultDmgMult || 0,
            ultName: charData.ultName || 'ULT'
        };
    }

    isReady(charId, skillSlot) {
        const cd = this.cooldowns[charId]?.[skillSlot];
        return cd && cd.current <= 0;
    }

    useSkill(charId, skillSlot) {
        const cd = this.cooldowns[charId]?.[skillSlot];
        if (!cd || cd.current > 0) return false;
        cd.current = cd.max;
        EventsCenter.emit(GameEvents.SKILL_USED, { charId, skillSlot });
        return true;
    }

    isUltReady(charId) {
        const ult = this.ultGauge[charId];
        return ult && ult.current >= ult.max;
    }

    addUltGauge(charId, amount) {
        const ult = this.ultGauge[charId];
        if (!ult) return;
        ult.current = Math.min(ult.max, ult.current + amount);
    }

    useUlt(charId) {
        const ult = this.ultGauge[charId];
        if (!ult || ult.current < ult.max) return false;
        ult.current = 0;
        return true;
    }

    getUltPercent(charId) {
        const ult = this.ultGauge[charId];
        if (!ult || ult.max <= 0) return 0;
        return ult.current / ult.max;
    }

    update(delta) {
        for (const charId in this.cooldowns) {
            for (const slot in this.cooldowns[charId]) {
                const cd = this.cooldowns[charId][slot];
                if (cd.current > 0) {
                    cd.current = Math.max(0, cd.current - delta);
                }
            }
        }
    }

    getCooldownPercent(charId, skillSlot) {
        const cd = this.cooldowns[charId]?.[skillSlot];
        if (!cd || cd.max <= 0) return 0;
        return cd.current / cd.max;
    }

    getRemainingSeconds(charId, skillSlot) {
        const cd = this.cooldowns[charId]?.[skillSlot];
        if (!cd) return 0;
        return Math.ceil(cd.current / 1000);
    }
}
