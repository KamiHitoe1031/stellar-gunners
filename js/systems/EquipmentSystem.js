class EquipmentSystem {
    static getCharBattleStats(charData, save, weaponsData, modulesData) {
        const charSave = save.characters[charData.id] || { level: 1, breakthroughCount: 0, awakening: 0 };
        const level = charSave.level || 1;
        const breakthrough = charSave.breakthroughCount || 0;
        const awakening = charSave.awakening || 0;

        // Base stats scaled by level
        let hp = charData.hp + charData.growthHp * (level - 1);
        let atk = charData.atk + charData.growthAtk * (level - 1);
        let def = charData.def + charData.growthDef * (level - 1);
        let shield = charData.shield + charData.growthShield * (level - 1);
        let spd = charData.spd;
        let critRate = charData.critRate;
        let critDmg = charData.critDmg;
        let weaponAtk = 0;

        // Breakthrough bonus: +5% all stats per breakthrough
        if (breakthrough > 0) {
            const btMult = 1 + breakthrough * 0.05;
            hp = Math.floor(hp * btMult);
            atk = Math.floor(atk * btMult);
            def = Math.floor(def * btMult);
            shield = Math.floor(shield * btMult);
        }

        // Awakening bonus: +10% all stats per level
        if (awakening > 0) {
            const awMult = 1 + awakening * 0.10;
            hp = Math.floor(hp * awMult);
            atk = Math.floor(atk * awMult);
            def = Math.floor(def * awMult);
            shield = Math.floor(shield * awMult);
        }

        // Type bonus
        if (charData.type === 'dps') atk = Math.floor(atk * 1.15);
        if (charData.type === 'tank') {
            def = Math.floor(def * 1.20);
            shield = Math.floor(shield * 1.20);
        }

        // Equipment data
        const equipment = save.equipment?.[charData.id] || {};

        // Weapon bonus
        if (equipment.weaponId && save.weapons?.[equipment.weaponId]) {
            const wpnInstance = save.weapons[equipment.weaponId];
            const wpnDef = weaponsData.find(w => w.id === wpnInstance.weaponDefId);
            if (wpnDef) {
                const wpnLevel = wpnInstance.level || 1;
                weaponAtk = wpnDef.mainAtk + Math.floor(wpnDef.mainAtk * 0.05 * (wpnLevel - 1));
                if (wpnDef.subDamage) atk += wpnDef.subDamage;
                if (wpnDef.subCritRate) critRate += wpnDef.subCritRate;
                if (wpnDef.subFireRate) spd += wpnDef.subFireRate;
            }
        }

        // Module bonuses
        const moduleSlots = equipment.modules || [null, null, null, null];
        moduleSlots.forEach(modInstanceId => {
            if (!modInstanceId) return;
            const modInstance = save.modules?.[modInstanceId];
            if (!modInstance) return;
            const modDef = modulesData.find(m => m.id === modInstance.moduleDefId);
            if (!modDef) return;

            const modLevel = modInstance.level || 1;
            const scaledValue = modDef.mainValue + Math.floor(modDef.mainValue * 0.04 * (modLevel - 1));

            switch (modDef.moduleType) {
                case 'atk': atk += scaledValue; break;
                case 'def': def += scaledValue; break;
                case 'hp': hp += scaledValue; break;
                case 'shield': shield += scaledValue; break;
            }

            // Sub stats
            [
                { type: modDef.sub1Type, val: modDef.sub1Value },
                { type: modDef.sub2Type, val: modDef.sub2Value },
                { type: modDef.sub3Type, val: modDef.sub3Value }
            ].forEach(sub => {
                if (!sub.type || sub.type === '' || !sub.val) return;
                switch (sub.type) {
                    case 'critRate': critRate += sub.val; break;
                    case 'critDmg': critDmg += sub.val; break;
                    case 'damage': atk += sub.val; break;
                    case 'resistance': def += sub.val; break;
                    case 'dmgReduction': def += sub.val; break;
                }
            });
        });

        // Synchro bonus (sub-character stat contribution)
        const subChars = equipment.subChars || [];
        if (subChars.length > 0) {
            const allChars = typeof window !== 'undefined' && window._cachedCharacters;
            if (allChars) {
                subChars.forEach(subCharId => {
                    if (!subCharId) return;
                    const subChar = allChars.find(c => (c.charId || c.id.replace('_normal', '')) === subCharId);
                    if (!subChar) return;
                    // 10% of sub-char base stats, +50% if same attribute
                    const mult = charData.attribute === subChar.attribute ? 0.15 : 0.10;
                    hp += Math.floor(subChar.hp * mult);
                    atk += Math.floor(subChar.atk * mult);
                    def += Math.floor(subChar.def * mult);
                    shield += Math.floor(subChar.shield * mult);
                });
            }
        }

        // Weapon parts bonuses (percentage-based modifiers stored for Player.js to apply)
        let partBonuses = null;
        if (equipment.weaponId) {
            const partsData = typeof window !== 'undefined' && window._cachedPartsData;
            if (partsData) {
                partBonuses = this.getPartBonuses(equipment.weaponId, save, partsData);
                // Apply part bonuses to stats
                if (partBonuses.damage) atk += Math.floor(atk * partBonuses.damage / 100);
                if (partBonuses.critRate) critRate += partBonuses.critRate;
                if (partBonuses.critDmg) critDmg += partBonuses.critDmg;
            }
        }

        return {
            ...charData,
            hp, atk, def, shield, spd, critRate, critDmg, weaponAtk,
            level, breakthroughCount: breakthrough, partBonuses
        };
    }

    static getEquippedWeaponName(charId, save, weaponsData) {
        const equipment = save.equipment?.[charId] || {};
        if (!equipment.weaponId || !save.weapons?.[equipment.weaponId]) return null;
        const wpnInstance = save.weapons[equipment.weaponId];
        const wpnDef = weaponsData.find(w => w.id === wpnInstance.weaponDefId);
        return wpnDef ? wpnDef.name : null;
    }

    static equipWeapon(charId, weaponInstanceId) {
        const save = SaveManager.load();
        if (!save.equipment) save.equipment = {};
        if (!save.equipment[charId]) {
            save.equipment[charId] = { weaponId: null, modules: [null, null, null, null] };
        }
        save.equipment[charId].weaponId = weaponInstanceId;
        SaveManager.save(save);
    }

    static equipModule(charId, slotIndex, moduleInstanceId) {
        const save = SaveManager.load();
        if (!save.equipment) save.equipment = {};
        if (!save.equipment[charId]) {
            save.equipment[charId] = { weaponId: null, modules: [null, null, null, null] };
        }
        save.equipment[charId].modules[slotIndex] = moduleInstanceId;
        SaveManager.save(save);
    }

    static unequipWeapon(charId) {
        const save = SaveManager.load();
        if (save.equipment?.[charId]) {
            save.equipment[charId].weaponId = null;
            SaveManager.save(save);
        }
    }

    static getOwnedWeapons(save, weaponsData) {
        const result = [];
        if (!save.weapons) return result;
        for (const instanceId in save.weapons) {
            const inst = save.weapons[instanceId];
            const def = weaponsData.find(w => w.id === inst.weaponDefId);
            if (def) {
                result.push({ instanceId, ...inst, def });
            }
        }
        return result;
    }

    static getOwnedModules(save, modulesData) {
        const result = [];
        if (!save.modules) return result;
        for (const instanceId in save.modules) {
            const inst = save.modules[instanceId];
            const def = modulesData.find(m => m.id === inst.moduleDefId);
            if (def) {
                result.push({ instanceId, ...inst, def });
            }
        }
        return result;
    }

    // ===== Weapon Parts =====

    static getWeaponParts(weaponInstanceId, save) {
        return save.weaponParts?.[weaponInstanceId] || {
            barrel: null,
            magazine: null,
            scope: null,
            stock: null
        };
    }

    static attachPart(weaponInstanceId, slotType, partId) {
        const save = SaveManager.load();
        if (!save.weaponParts) save.weaponParts = {};
        if (!save.weaponParts[weaponInstanceId]) {
            save.weaponParts[weaponInstanceId] = { barrel: null, magazine: null, scope: null, stock: null };
        }
        save.weaponParts[weaponInstanceId][slotType] = partId;
        SaveManager.save(save);
    }

    static detachPart(weaponInstanceId, slotType) {
        const save = SaveManager.load();
        if (save.weaponParts?.[weaponInstanceId]) {
            save.weaponParts[weaponInstanceId][slotType] = null;
            SaveManager.save(save);
        }
    }

    static getOwnedParts(save) {
        return save.ownedParts || [];
    }

    static addPart(partId) {
        const save = SaveManager.load();
        if (!save.ownedParts) save.ownedParts = [];
        save.ownedParts.push(partId);
        SaveManager.save(save);
    }

    static getPartBonuses(weaponInstanceId, save, partsData) {
        const equipped = this.getWeaponParts(weaponInstanceId, save);
        const bonuses = {
            range: 0, accuracy: 0, fireRate: 0, magazineSize: 0,
            reloadSpeed: 0, stability: 0, critRate: 0, critDmg: 0, damage: 0
        };

        for (const slot of ['barrel', 'magazine', 'scope', 'stock']) {
            const partId = equipped[slot];
            if (!partId) continue;
            const partDef = partsData.find(p => p.id === partId);
            if (!partDef) continue;

            // Main effect
            if (partDef.mainEffect && bonuses[partDef.mainEffect] !== undefined) {
                bonuses[partDef.mainEffect] += partDef.mainValue;
            }

            // Sub effects (use midpoint of range for installed parts)
            for (let i = 1; i <= 3; i++) {
                const subType = partDef[`sub${i}Type`];
                const subMin = partDef[`sub${i}ValueMin`];
                const subMax = partDef[`sub${i}ValueMax`];
                if (subType && subType !== '' && typeof subMin === 'number') {
                    const avg = Math.floor((subMin + subMax) / 2);
                    if (bonuses[subType] !== undefined) {
                        bonuses[subType] += avg;
                    }
                }
            }
        }

        return bonuses;
    }

    // ===== Awakening =====

    static getAwakeningLevel(charId, save) {
        return save.characters?.[charId]?.awakening || 0;
    }

    static awakenCharacter(charId, cost) {
        const save = SaveManager.load();
        if (save.player.credits < cost) return false;
        if (!save.characters[charId]) {
            save.characters[charId] = { level: 1, exp: 0, breakthroughCount: 0, awakening: 0 };
        }
        save.characters[charId].awakening = (save.characters[charId].awakening || 0) + 1;
        save.player.credits -= cost;
        SaveManager.save(save);
        return true;
    }
}
