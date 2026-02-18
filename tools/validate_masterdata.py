"""
Validate masterdata JSON files for Stellar Gunners.
Checks referential integrity, duplicate IDs, and enum validity.

Usage: python tools/validate_masterdata.py [data_dir]
  data_dir defaults to assets/data/
"""

import json
import sys
import os

VALID_ATTRIBUTES = ['bio', 'psychic', 'machine', 'corrosion', 'immunity']
VALID_TYPES = ['dps', 'medic', 'tank', 'support', 'breaker']
VALID_WEAPON_TYPES = ['pistol', 'assault_rifle', 'shotgun', 'sniper_rifle', 'launcher']
VALID_ENEMY_CATEGORIES = ['normal', 'elite', 'boss']
VALID_ATTACK_PATTERNS = [
    'chase_shoot', 'stationary_burst', 'strafe', 'circle_burst',
    'aoe_heal', 'spiral', 'phase_shift', 'sniper', 'rush',
    'charge_slam', 'swarm'
]


def load_json(data_dir, filename):
    path = os.path.join(data_dir, filename)
    if not os.path.exists(path):
        return None
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)


def validate(data_dir):
    errors = []
    warnings = []

    # Load all data files
    characters = load_json(data_dir, 'characters.json')
    weapons = load_json(data_dir, 'weapons.json')
    modules = load_json(data_dir, 'modules.json')
    enemies = load_json(data_dir, 'enemies.json')
    stages = load_json(data_dir, 'stages.json')
    scenarios = load_json(data_dir, 'scenarios.json')
    scenario_gallery = load_json(data_dir, 'scenario_gallery.json')
    drop_tables = load_json(data_dir, 'drop_tables.json')
    progression = load_json(data_dir, 'progression.json')
    weapon_parts = load_json(data_dir, 'weapon_parts.json')

    # Check required files exist
    required_files = {
        'characters.json': characters,
        'enemies.json': enemies,
        'stages.json': stages,
        'scenarios.json': scenarios,
        'scenario_gallery.json': scenario_gallery,
        'drop_tables.json': drop_tables,
        'progression.json': progression,
    }
    for fname, data in required_files.items():
        if data is None:
            errors.append(f"[MISSING FILE] {fname} not found in {data_dir}")

    if any(v is None for v in [characters, enemies, stages, scenarios]):
        return errors, warnings  # Can't continue without core files

    # Build ID sets
    char_ids = set()
    char_sprite_keys = set()
    enemy_ids = set()
    stage_ids = set()
    scenario_ids = set()
    drop_table_ids = set()

    # === 1. Characters validation ===
    print("  Checking characters...")
    for c in characters:
        cid = c.get('charId') or c.get('id', '')
        if cid in char_ids:
            errors.append(f"[DUPLICATE] Character ID '{cid}' is duplicated")
        char_ids.add(cid)
        char_sprite_keys.add(c.get('spriteKey', ''))

        attr = c.get('attribute', '')
        if attr not in VALID_ATTRIBUTES:
            errors.append(f"[ENUM] Character '{cid}' has invalid attribute '{attr}' (valid: {VALID_ATTRIBUTES})")

        ctype = c.get('type', '')
        if ctype not in VALID_TYPES:
            errors.append(f"[ENUM] Character '{cid}' has invalid type '{ctype}' (valid: {VALID_TYPES})")

        wpn = c.get('weaponType', '')
        if wpn not in VALID_WEAPON_TYPES:
            errors.append(f"[ENUM] Character '{cid}' has invalid weaponType '{wpn}' (valid: {VALID_WEAPON_TYPES})")

        # Check required numeric fields
        for field in ['hp', 'atk', 'def', 'spd', 'shield', 'rarity']:
            val = c.get(field)
            if val is None or (isinstance(val, str) and val == ''):
                errors.append(f"[MISSING] Character '{cid}' is missing required field '{field}'")

    # === 2. Enemies validation ===
    print("  Checking enemies...")
    for e in enemies:
        eid = e.get('id', '')
        if eid in enemy_ids:
            errors.append(f"[DUPLICATE] Enemy ID '{eid}' is duplicated")
        enemy_ids.add(eid)

        attr = e.get('attribute', '')
        if attr not in VALID_ATTRIBUTES:
            errors.append(f"[ENUM] Enemy '{eid}' has invalid attribute '{attr}'")

        cat = e.get('category', '')
        if cat not in VALID_ENEMY_CATEGORIES:
            errors.append(f"[ENUM] Enemy '{eid}' has invalid category '{cat}'")

        pattern = e.get('attackPattern', '')
        if pattern and pattern not in VALID_ATTACK_PATTERNS:
            warnings.append(f"[ENUM?] Enemy '{eid}' has unknown attackPattern '{pattern}'")

        # Check drop table reference (can be comma-separated)
        dt = e.get('dropTable', '')
        if dt and drop_tables:
            valid_tables = {d.get('tableId', '') for d in drop_tables}
            for dt_ref in dt.split(','):
                dt_ref = dt_ref.strip()
                if dt_ref and dt_ref not in valid_tables:
                    errors.append(f"[REF] Enemy '{eid}' references dropTable '{dt_ref}' which doesn't exist")

    # === 3. Stages validation ===
    print("  Checking stages...")
    for s in stages:
        sid = s.get('id', '')
        if sid in stage_ids:
            errors.append(f"[DUPLICATE] Stage ID '{sid}' is duplicated")
        stage_ids.add(sid)

        # Check wave enemy references
        for wkey in ['wave1', 'wave2', 'wave3', 'wave4']:
            wave_str = s.get(wkey, '')
            if wave_str:
                for entry in wave_str.split(','):
                    parts = entry.strip().split(':')
                    if len(parts) >= 1:
                        enemy_ref = parts[0].strip()
                        if enemy_ref and enemy_ref not in enemy_ids:
                            errors.append(f"[REF] Stage '{sid}' wave '{wkey}' references unknown enemy '{enemy_ref}'")

        # Check areas wave enemy references
        areas = s.get('areas', [])
        for ai, area in enumerate(areas):
            waves = area.get('waves', [])
            for wi, wave_str in enumerate(waves):
                for entry in wave_str.split(','):
                    parts = entry.strip().split(':')
                    if len(parts) >= 1:
                        enemy_ref = parts[0].strip()
                        if enemy_ref and enemy_ref not in enemy_ids:
                            errors.append(f"[REF] Stage '{sid}' area[{ai}] wave[{wi}] references unknown enemy '{enemy_ref}'")

        # Check scenario reference
        scenario_ref = s.get('scenarioId', '')
        if scenario_ref:
            scenario_ids_in_data = {sc.get('scenarioId', '') for sc in scenarios}
            if scenario_ref not in scenario_ids_in_data:
                errors.append(f"[REF] Stage '{sid}' references scenarioId '{scenario_ref}' which doesn't exist in scenarios.json")

    # === 4. Scenarios validation ===
    print("  Checking scenarios...")
    seen_scenario_seq = set()
    for sc in scenarios:
        sid = sc.get('scenarioId', '')
        seq = sc.get('seqNo', '')
        combo = f"{sid}:{seq}"
        if combo in seen_scenario_seq:
            errors.append(f"[DUPLICATE] Scenario '{sid}' seqNo {seq} is duplicated")
        seen_scenario_seq.add(combo)
        scenario_ids.add(sid)

        # Check speaker sprite key reference
        sprite = sc.get('speakerSpriteKey', '')
        if sprite and sprite != '':
            if sprite not in char_sprite_keys:
                warnings.append(f"[REF?] Scenario '{sid}' seq {seq} references speakerSpriteKey '{sprite}' not in characters")

    # === 5. Scenario gallery validation ===
    print("  Checking scenario_gallery...")
    if scenario_gallery:
        gallery_ids = set()
        for g in scenario_gallery:
            gid = g.get('galleryId', '')
            if gid in gallery_ids:
                errors.append(f"[DUPLICATE] Gallery ID '{gid}' is duplicated")
            gallery_ids.add(gid)

            # Check scenario reference
            gscen = g.get('scenarioId', '')
            if gscen and gscen not in scenario_ids:
                errors.append(f"[REF] Gallery '{gid}' references scenarioId '{gscen}' which doesn't exist")

    # === 6. Drop tables validation ===
    print("  Checking drop_tables...")
    if drop_tables:
        for d in drop_tables:
            tid = d.get('tableId', '')
            drop_table_ids.add(tid)

    # === 7. Progression validation ===
    print("  Checking progression...")
    if progression:
        levels = set()
        for p in progression:
            lvl = p.get('level', '')
            if lvl in levels:
                errors.append(f"[DUPLICATE] Progression level {lvl} is duplicated")
            levels.add(lvl)

    # === 8. Weapon parts validation ===
    if weapon_parts:
        print("  Checking weapon_parts...")
        part_ids = set()
        for wp in weapon_parts:
            pid = wp.get('partId') or wp.get('id', '')
            if pid in part_ids:
                errors.append(f"[DUPLICATE] Weapon part ID '{pid}' is duplicated")
            part_ids.add(pid)

    # === Summary stats ===
    print()
    print(f"  Characters: {len(char_ids)}")
    print(f"  Enemies: {len(enemy_ids)}")
    print(f"  Stages: {len(stage_ids)}")
    print(f"  Scenarios: {len(scenario_ids)} (unique IDs)")
    print(f"  Gallery entries: {len(scenario_gallery) if scenario_gallery else 0}")
    print(f"  Drop tables: {len(drop_table_ids)}")

    return errors, warnings


def main():
    data_dir = sys.argv[1] if len(sys.argv) > 1 else os.path.join(
        os.path.dirname(__file__), '..', 'assets', 'data')

    print(f"Validating masterdata in: {data_dir}")
    print()

    errors, warnings = validate(data_dir)

    print()
    if warnings:
        print(f"=== WARNINGS ({len(warnings)}) ===")
        for w in warnings:
            print(f"  {w}")
        print()

    if errors:
        print(f"=== ERRORS ({len(errors)}) ===")
        for e in errors:
            print(f"  {e}")
        print()
        print(f"Validation FAILED with {len(errors)} error(s) and {len(warnings)} warning(s).")
        sys.exit(1)
    else:
        print(f"Validation PASSED. {len(warnings)} warning(s).")
        sys.exit(0)


if __name__ == '__main__':
    main()
