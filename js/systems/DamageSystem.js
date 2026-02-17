class DamageSystem {
    static getAttributeMultiplier(attackerAttr, defenderAttr) {
        if (!attackerAttr || !defenderAttr) return 1.0;
        const chart = ATTRIBUTE_CHART[attackerAttr];
        if (!chart) return 1.0;
        if (chart.strongVs === defenderAttr) return ADVANTAGE_MULTIPLIER;
        if (chart.weakVs === defenderAttr) return DISADVANTAGE_MULTIPLIER;
        return 1.0;
    }

    static calculateDamage(attacker, defender, skillMultiplier = 1.0) {
        const baseAtk = attacker.atk || 0;
        const weaponAtk = attacker.weaponAtk || 0;
        const def = defender.def || 0;

        const rawDamage = (baseAtk * skillMultiplier) + weaponAtk;
        const attrMult = this.getAttributeMultiplier(attacker.attribute, defender.attribute);
        const defReduction = 1 - (def / (def + 200));
        const randomMult = 0.95 + Math.random() * 0.1;

        let isCrit = false;
        let critMult = 1.0;
        const critRate = (attacker.critRate || 0) / 100;
        if (Math.random() < critRate) {
            isCrit = true;
            critMult = (attacker.critDmg || 150) / 100;
        }

        const finalDamage = Math.max(1, Math.floor(
            rawDamage * attrMult * defReduction * critMult * randomMult
        ));

        return { damage: finalDamage, isCrit, attribute: attacker.attribute };
    }

    static calculateBreakDamage(attacker, baseDamage) {
        let breakDmg = baseDamage * 0.1;
        if (attacker.type === 'breaker') {
            breakDmg *= (TYPE_BONUS.breaker.breakMult || 1.3);
        }
        return Math.floor(breakDmg);
    }

    /**
     * Check if an enemy attack should apply a status effect.
     * Based on enemy attribute: corrosion→poison, bio→burn, psychic→slow, machine→stun
     */
    static rollStatusEffect(enemyAttribute, isElite) {
        const chance = isElite ? 0.25 : 0.10;
        if (Math.random() > chance) return null;

        switch (enemyAttribute) {
            case 'corrosion':
                return { name: 'poison', duration: 5000, icon: '☠', color: '#aa44dd',
                         dot: true, tickDamage: 0.02, tickInterval: 1000 };
            case 'bio':
                return { name: 'burn', duration: 4000, icon: '🔥', color: '#ff6622',
                         dot: true, tickDamage: 0.03, tickInterval: 1000 };
            case 'psychic':
                return { name: 'slow', duration: 3000, icon: '▼', color: '#44cc44',
                         speedMult: 0.5 };
            case 'machine':
                return { name: 'stun', duration: 1500, icon: '⚡', color: '#ffff00',
                         speedMult: 0 };
            default:
                return null;
        }
    }
}
