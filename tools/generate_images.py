"""
Stellar Gunners - Gemini API Image Generator
Uses NanobannaPro (gemini-3-pro-image-preview) for character art generation.
"""

import requests
import base64
import json
import os
import sys
import time
from pathlib import Path

# Load API key from LOCAL_SECRETS.md
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent
SECRETS_PATH = PROJECT_ROOT / "LOCAL_SECRETS.md"

def load_api_key():
    with open(SECRETS_PATH, "r", encoding="utf-8") as f:
        content = f.read()
    # Extract API key from markdown code block
    for line in content.splitlines():
        line = line.strip()
        if line.startswith("AIza"):
            return line
    raise RuntimeError("API key not found in LOCAL_SECRETS.md")

API_KEY = load_api_key()
MODEL = "gemini-3-pro-image-preview"
ENDPOINT = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent"

# Rate limiting: free tier = 15 RPM
DELAY_BETWEEN_REQUESTS = 5  # seconds


def generate_image_with_refs(prompt, ref_images, output_path, retry=2):
    """Generate an image using Gemini API with reference images as multimodal input."""
    headers = {
        "x-goog-api-key": API_KEY,
        "Content-Type": "application/json",
    }

    parts = [{"text": prompt}]
    for img_path in ref_images:
        with open(img_path, "rb") as f:
            img_b64 = base64.b64encode(f.read()).decode()
        parts.append({
            "inlineData": {
                "mimeType": "image/png",
                "data": img_b64
            }
        })

    payload = {
        "contents": [{"parts": parts}],
        "generationConfig": {
            "responseModalities": ["TEXT", "IMAGE"],
        },
    }

    for attempt in range(retry + 1):
        try:
            print(f"  Generating with {len(ref_images)} refs: {Path(output_path).name} (attempt {attempt+1})...")
            response = requests.post(ENDPOINT, headers=headers, json=payload, timeout=300)

            if response.status_code == 429:
                print(f"  Rate limited. Waiting 60s...")
                time.sleep(60)
                continue

            response.raise_for_status()
            result = response.json()

            candidates = result.get("candidates", [])
            if not candidates:
                print(f"  WARNING: No candidates. Response: {json.dumps(result, indent=2)[:500]}")
                if attempt < retry:
                    time.sleep(10)
                    continue
                return None

            parts_resp = candidates[0].get("content", {}).get("parts", [])
            image_data = None
            text_response = ""

            for part in parts_resp:
                if "inlineData" in part:
                    image_data = part["inlineData"]["data"]
                elif "inline_data" in part:
                    image_data = part["inline_data"]["data"]
                elif "text" in part:
                    text_response = part["text"]

            if image_data is None:
                print(f"  WARNING: No image in response. Text: {text_response[:200]}")
                if attempt < retry:
                    time.sleep(10)
                    continue
                return None

            image_bytes = base64.b64decode(image_data)
            Path(output_path).parent.mkdir(parents=True, exist_ok=True)
            with open(output_path, "wb") as f:
                f.write(image_bytes)

            size_kb = len(image_bytes) / 1024
            print(f"  OK: {Path(output_path).name} ({size_kb:.0f} KB)")
            if text_response:
                print(f"  Model note: {text_response[:100]}")
            return output_path

        except requests.exceptions.Timeout:
            print(f"  Timeout. Retrying...")
            time.sleep(10)
        except Exception as e:
            print(f"  Error: {e}")
            if attempt < retry:
                time.sleep(10)

    return None


def generate_image(prompt, output_path, aspect_ratio="2:3", image_size="1K", retry=2):
    """Generate an image using Gemini API and save to file."""
    headers = {
        "x-goog-api-key": API_KEY,
        "Content-Type": "application/json",
    }

    payload = {
        "contents": [
            {
                "parts": [
                    {"text": prompt}
                ]
            }
        ],
        "generationConfig": {
            "responseModalities": ["TEXT", "IMAGE"],
        },
    }

    for attempt in range(retry + 1):
        try:
            print(f"  Generating: {Path(output_path).name} (attempt {attempt+1})...")
            response = requests.post(ENDPOINT, headers=headers, json=payload, timeout=180)

            if response.status_code == 429:
                print(f"  Rate limited. Waiting 60s...")
                time.sleep(60)
                continue

            response.raise_for_status()
            result = response.json()

            # Extract image from response
            candidates = result.get("candidates", [])
            if not candidates:
                print(f"  WARNING: No candidates. Response: {json.dumps(result, indent=2)[:500]}")
                if attempt < retry:
                    time.sleep(10)
                    continue
                return None

            parts = candidates[0].get("content", {}).get("parts", [])
            image_data = None
            text_response = ""

            for part in parts:
                if "inlineData" in part:
                    image_data = part["inlineData"]["data"]
                elif "inline_data" in part:
                    image_data = part["inline_data"]["data"]
                elif "text" in part:
                    text_response = part["text"]

            if image_data is None:
                print(f"  WARNING: No image in response. Text: {text_response[:200]}")
                if attempt < retry:
                    time.sleep(10)
                    continue
                return None

            # Save image
            image_bytes = base64.b64decode(image_data)
            Path(output_path).parent.mkdir(parents=True, exist_ok=True)
            with open(output_path, "wb") as f:
                f.write(image_bytes)

            size_kb = len(image_bytes) / 1024
            print(f"  OK: {Path(output_path).name} ({size_kb:.0f} KB)")
            if text_response:
                print(f"  Model note: {text_response[:100]}")
            return output_path

        except requests.exceptions.Timeout:
            print(f"  Timeout. Retrying...")
            time.sleep(10)
        except Exception as e:
            print(f"  Error: {e}")
            if attempt < retry:
                time.sleep(10)

    return None


# ============================================================
# Character Design Definitions
# ============================================================

STYLE_BASE = (
    "anime style illustration, Girl Cafe Gun inspired, "
    "Japanese mobile game character art, cel-shaded, clean lines, "
    "vibrant colors, detailed military sci-fi outfit, "
    "high quality anime art"
)

CHARACTERS = {
    "chr_01": {
        "name": "Reina Volt",
        "name_jp": "レイナ・ヴォルト",
        "tag": "<Reina-01>",
        "appearance": (
            "young woman, age 20, confident leader aura, "
            "long crimson red hair in high ponytail with bangs, "
            "sharp amber-gold eyes, fair skin, "
            "wearing white tactical combat vest with red bio-hazard accents over black turtleneck, "
            "dark gray military pants, black combat boots, "
            "red armband on left arm, silver dog tags necklace, "
            "holding assault rifle casually"
        ),
        "colors": {"hair": "#CC3333", "outfit": "#FFFFFF", "accent": "#CC3333"},
        "expressions": {
            "confident": "confident smirk, one hand on hip, relaxed posture",
            "serious": "serious focused expression, eyes narrowed, tense posture",
            "battle": "battle-ready fierce expression, gripping rifle, dynamic forward-leaning pose",
            "surprised": "wide eyes, mouth slightly open, surprised expression, leaning back",
            "calm": "gentle calm smile, relaxed shoulders, peaceful expression",
        }
    },
    "chr_02": {
        "name": "Serena Leaf",
        "name_jp": "セレナ・リーフ",
        "tag": "<Serena-01>",
        "appearance": (
            "young woman, age 19, gentle healer aura, "
            "long flowing lavender purple hair reaching waist, soft waves, "
            "kind violet eyes, pale skin, "
            "wearing white medical coat with purple psychic-energy trim over lilac blouse, "
            "short white pleated skirt, white thigh-high boots with purple accents, "
            "purple crystal pendant necklace, medical cross armband, "
            "holding pistol elegantly in one hand"
        ),
        "colors": {"hair": "#C9A0DC", "outfit": "#FFFFFF", "accent": "#9966CC"},
        "expressions": {
            "calm": "serene gentle smile, hands clasped in front, peaceful healing aura",
            "worried": "worried anxious expression, eyebrows furrowed, hands near chest",
        }
    },
    "chr_03": {
        "name": "Kaira Arc",
        "name_jp": "カイラ・アーク",
        "tag": "<Kaira-01>",
        "appearance": (
            "young woman, age 18, energetic tomboy mechanic, "
            "short messy spiky bright blue hair with goggles on forehead, "
            "bright blue eyes full of energy, tanned skin, "
            "wearing heavy armored blue-gray tactical jacket open over black tank top, "
            "khaki cargo shorts with many pockets, reinforced combat boots, "
            "mechanical gauntlets on both hands with blue LED lights, "
            "carrying shotgun on back strap"
        ),
        "colors": {"hair": "#3388CC", "outfit": "#5577AA", "accent": "#33AAEE"},
        "expressions": {
            "excited": "big excited grin, fist pump, sparkling eyes, energetic pose",
            "confident": "confident grin, thumbs up, chest puffed out",
            "worried": "worried frown, scratching head, uncertain look",
            "amazed": "amazed wide eyes, mouth open in awe, leaning forward",
            "exhausted": "exhausted heavy breathing, hunched over, sweat drops",
        }
    },
    "chr_04": {
        "name": "Noir Shade",
        "name_jp": "ノワール・シェイド",
        "tag": "<Noir-01>",
        "appearance": (
            "young woman, age 21, mysterious lone wolf sniper, "
            "long black hair with dark purple highlights swept to one side covering one eye, "
            "deep amethyst purple eyes, pale porcelain skin, "
            "wearing form-fitting dark purple-black tactical bodysuit, "
            "long dark scarf flowing behind, thigh-high dark boots, "
            "tactical scope visor on forehead, fingerless gloves, "
            "holding sniper rifle vertically resting on shoulder"
        ),
        "colors": {"hair": "#2A1A3A", "outfit": "#1A0A2A", "accent": "#6633AA"},
        "expressions": {
            "cool": "cool emotionless expression, looking to the side, composed aloof pose",
        }
    },
    "chr_05": {
        "name": "Lilith Blaze",
        "name_jp": "リリス・ブレイズ",
        "tag": "<Lilith-01>",
        "appearance": (
            "young woman, age 17, cheerful energetic girl, "
            "bright orange flame-colored hair in twin tails with yellow ribbons, "
            "golden yellow eyes full of warmth, light skin with slight blush, "
            "wearing short cream military jacket with golden immunity-emblem buttons, "
            "orange pleated mini skirt, knee-high white socks, tan military boots, "
            "small grenade pouches on belt, yellow star hair clips, "
            "carrying rocket launcher with playful pose"
        ),
        "colors": {"hair": "#FF8833", "outfit": "#EECC88", "accent": "#FFAA33"},
        "expressions": {
            "cheerful": "bright cheerful smile, peace sign, bouncy happy pose",
            "wink": "playful wink with tongue out, tilted head, cute pose",
        }
    },
    "chr_06": {
        "name": "Mira Frost",
        "name_jp": "ミラ・フロスト",
        "tag": "<Mira-01>",
        "appearance": (
            "young woman, age 20, cool-headed analyst and sniper, "
            "short neat ice-blue bob cut hair with silver highlights, "
            "light icy blue eyes behind thin AR glasses, fair skin, "
            "wearing sleek white-blue tech suit under open gray lab coat, "
            "black fitted pants, white ankle boots with blue soles, "
            "holographic data tablet on left arm, earpiece communicator, "
            "holding sniper rifle in precise military stance"
        ),
        "colors": {"hair": "#88CCEE", "outfit": "#EEEEFF", "accent": "#4488CC"},
        "expressions": {
            "focused": "focused analytical expression, adjusting glasses, calculating look",
            "cold": "cold expressionless face, arms crossed, distant look",
        }
    }
}


# ============================================================
# Prompt Builders
# ============================================================

def build_portrait_prompt(char_key, expression_key):
    """Build prompt for scenario standing portrait."""
    char = CHARACTERS[char_key]
    expr_desc = char["expressions"][expression_key]
    colors = char["colors"]

    prompt = (
        f"A single full-body standing portrait of one anime girl character. "
        f"Only one character in the image, no duplicates, no multiple views. "
        f"Character: {char['appearance']}. "
        f"Expression and pose: {expr_desc}. "
        f"Style: {STYLE_BASE}. "
        f"Hair color: {colors['hair']}, main outfit color: {colors['outfit']}, accent color: {colors['accent']}. "
        f"Full body visible from head to feet, standing upright, centered in frame. "
        f"Solid bright magenta background (#FF00FF), flat background, no shadow on ground. "
        f"Clean anime linework, high detail face and outfit. "
        f"Portrait orientation, one person only."
    )
    return prompt


def build_sprite_prompt(char_key):
    """Build prompt for game sprite sheet (SD/chibi top-down)."""
    char = CHARACTERS[char_key]
    colors = char["colors"]

    prompt = (
        f"Create a sprite sheet image of {char['tag']}, chibi/SD version of "
        f"{char['appearance']} for a top-down 2D shooting game. "
        f"Style: cute chibi anime style, 2-3 head tall proportions, "
        f"clean pixel-friendly edges, solid magenta background (#FF00FF). "
        f"Canvas: 512x512 pixel canvas. "
        f"\n\n"
        f"Row 1: Idle animation facing down (toward camera) - 4 frames: "
        f"neutral stand, slight bob down, lowest point, bob up. "
        f"Row 2: Walking down - 4 frames: left step, neutral, right step, neutral. "
        f"Row 3: Walking right (side view) - 4 frames: step forward, neutral, step back, neutral. "
        f"Row 4: Hit reaction and defeat - 4 frames: flinch back, stagger, falling, down on ground. "
        f"\n\n"
        f"Grid: 4x4 grid with 16 cells, uniform grid layout. "
        f"Hair color: {colors['hair']}, outfit: {colors['outfit']}, accent: {colors['accent']}. "
        f"Consistency: Keep exact character design, proportions, and colors across all 16 frames. "
        f"Each cell is exactly 128x128 pixels."
    )
    return prompt


def build_enemy_sprite_prompt(enemy_id, name, description, size):
    """Build prompt for enemy sprite."""
    prompt = (
        f"Create a sprite sheet image of a {description} enemy unit called '{name}' "
        f"for a top-down 2D sci-fi shooting game. "
        f"Style: anime mecha/sci-fi style, dark red and gray color scheme, "
        f"menacing glowing red eyes/sensors, solid magenta background (#FF00FF). "
        f"Canvas: 256x256 pixel canvas. "
        f"\n"
        f"2x2 grid, 4 cells: "
        f"Cell 1: facing down (toward camera), Cell 2: facing right, "
        f"Cell 3: attack pose, Cell 4: damaged/sparking. "
        f"\nEach cell is {size}x{size} pixels centered in 128x128 space. "
        f"Grid Layout, Isolated objects. "
        f"Consistent design across all 4 frames."
    )
    return prompt


def build_background_prompt(bg_key, description):
    """Build prompt for background image."""
    prompt = (
        f"Create a background illustration for a sci-fi military game scene: {description}. "
        f"Style: detailed anime background art, atmospheric lighting, "
        f"post-apocalyptic sci-fi setting with advanced technology ruins. "
        f"No characters, only environment. Wide shot composition. "
        f"High detail, painterly anime style."
    )
    return prompt


def build_face_icon_prompt(char_key):
    """Build prompt for character face icon."""
    char = CHARACTERS[char_key]
    colors = char["colors"]

    prompt = (
        f"Create a close-up face portrait icon of {char['tag']}, "
        f"showing only the face and upper shoulders of {char['appearance']}. "
        f"Expression: neutral friendly smile. "
        f"Style: anime style character icon for a game UI, clean lines, vibrant colors. "
        f"Square composition, face centered. "
        f"Hair color: {colors['hair']}, accent: {colors['accent']}. "
        f"Solid magenta background (#FF00FF). "
        f"Sharp clean edges suitable for small icon display."
    )
    return prompt


# ============================================================
# Generation Tasks
# ============================================================

ASSETS_DIR = PROJECT_ROOT / "assets" / "images"

def gen_portraits():
    """Generate all scenario standing portraits."""
    print("\n=== Generating Scenario Portraits ===\n")
    output_dir = ASSETS_DIR / "portraits"
    output_dir.mkdir(parents=True, exist_ok=True)

    for char_key, char in CHARACTERS.items():
        for expr_key in char["expressions"]:
            filename = f"{char_key}_{expr_key}.png"
            output_path = output_dir / filename

            if output_path.exists():
                print(f"  SKIP (exists): {filename}")
                continue

            prompt = build_portrait_prompt(char_key, expr_key)
            generate_image(prompt, str(output_path), aspect_ratio="2:3", image_size="1K")
            time.sleep(DELAY_BETWEEN_REQUESTS)


def gen_sprites():
    """Generate game sprite sheets for all characters."""
    print("\n=== Generating Game Sprites ===\n")
    output_dir = ASSETS_DIR / "characters"
    output_dir.mkdir(parents=True, exist_ok=True)

    for char_key in CHARACTERS:
        filename = f"{char_key}_sprites.png"
        output_path = output_dir / filename

        if output_path.exists():
            print(f"  SKIP (exists): {filename}")
            continue

        prompt = build_sprite_prompt(char_key)
        generate_image(prompt, str(output_path), aspect_ratio="1:1", image_size="1K")
        time.sleep(DELAY_BETWEEN_REQUESTS)


def gen_face_icons():
    """Generate face icons for UI."""
    print("\n=== Generating Face Icons ===\n")
    output_dir = ASSETS_DIR / "ui"
    output_dir.mkdir(parents=True, exist_ok=True)

    for char_key in CHARACTERS:
        filename = f"{char_key}_icon.png"
        output_path = output_dir / filename

        if output_path.exists():
            print(f"  SKIP (exists): {filename}")
            continue

        prompt = build_face_icon_prompt(char_key)
        generate_image(prompt, str(output_path), aspect_ratio="1:1", image_size="1K")
        time.sleep(DELAY_BETWEEN_REQUESTS)


ENEMIES = [
    ("enemy_drone_01", "偵察ドローン", "small floating reconnaissance drone with propellers and a red sensor eye", 48),
    ("enemy_soldier_01", "虚晶兵", "humanoid crystalline soldier with red energy core and rifle", 64),
    ("enemy_mech_01", "突撃メカ", "four-legged assault mech walker with cannons", 80),
    ("enemy_elite_01", "エリートスナイパー", "heavily armored elite sniper soldier with long barrel rifle and cape", 72),
    ("enemy_turret_01", "固定砲台", "stationary automated defense turret with rotating barrel", 64),
    ("enemy_healer_01", "修復ユニット", "floating repair drone with green healing beam emitters", 56),
    ("boss_xr07", "XR-07", "massive humanoid war machine boss with multiple weapon arms, glowing red core, heavy armor plating", 128),
]

def gen_enemies():
    """Generate enemy sprites."""
    print("\n=== Generating Enemy Sprites ===\n")
    output_dir = ASSETS_DIR / "enemies"
    output_dir.mkdir(parents=True, exist_ok=True)

    for enemy_id, name_jp, desc, size in ENEMIES:
        filename = f"{enemy_id}.png"
        output_path = output_dir / filename

        if output_path.exists():
            print(f"  SKIP (exists): {filename}")
            continue

        prompt = build_enemy_sprite_prompt(enemy_id, name_jp, desc, size)
        generate_image(prompt, str(output_path), aspect_ratio="1:1", image_size="1K")
        time.sleep(DELAY_BETWEEN_REQUESTS)


BACKGROUNDS = [
    ("bg_city_ruin", "Ruined post-apocalyptic city with crumbling buildings, overgrown vegetation, scattered debris, dusty sunlight filtering through broken structures, daytime"),
    ("bg_city_ruin_deep", "Deep interior of ruined city, dark and ominous atmosphere, glowing purple void crystals embedded in walls, emergency lights flickering, industrial pipes"),
    ("bg_city_lab", "Abandoned high-tech research laboratory interior, broken computer terminals, holographic displays still active, test tubes and equipment, blue-white lighting"),
    ("bg_battle_city", "Top-down view of urban battlefield with ruined buildings, craters, broken vehicles, debris scattered, overhead perspective for 2D game"),
    ("bg_battle_lab", "Top-down view of research facility interior with lab equipment, corridors, computer stations, overhead perspective for 2D game"),
]

def gen_backgrounds():
    """Generate background images."""
    print("\n=== Generating Backgrounds ===\n")
    output_dir = ASSETS_DIR / "backgrounds"
    output_dir.mkdir(parents=True, exist_ok=True)

    for bg_key, desc in BACKGROUNDS:
        filename = f"{bg_key}.png"
        output_path = output_dir / filename

        if output_path.exists():
            print(f"  SKIP (exists): {filename}")
            continue

        prompt = build_background_prompt(bg_key, desc)
        generate_image(prompt, str(output_path), aspect_ratio="16:9", image_size="1K")
        time.sleep(DELAY_BETWEEN_REQUESTS)


def gen_pv_action_art():
    """Generate action illustration for each character using portraits as reference.
    These are used as VEO image-to-video reference frames for PV clips."""
    print("\n=== Generating PV Action Art (for VEO reference) ===\n")

    portrait_map = {
        "chr_01": "confident",
        "chr_02": "calm",
        "chr_03": "confident",
        "chr_04": "cool",
        "chr_05": "cheerful",
        "chr_06": "focused",
    }

    action_descriptions = {
        "chr_01": (
            "dynamic action pose, dashing forward while firing her assault rifle, "
            "green bio-energy particles swirling around her, spent shell casings flying, "
            "dramatic wind blowing her red ponytail, intense determined expression"
        ),
        "chr_02": (
            "elegant combat pose, channeling psychic healing energy with one hand "
            "while aiming her pistol with the other, purple energy waves radiating outward, "
            "hair floating with psychic power, serene yet powerful expression"
        ),
        "chr_03": (
            "powerful action stance, blasting her shotgun with one hand while her "
            "mechanical gauntlets project a blue energy shield, ground cracking beneath her, "
            "fearless grin, blue sparks flying from her armor"
        ),
        "chr_04": (
            "precise sniper stance on a high vantage point, looking through scope, "
            "dark purple energy coiling around the barrel of her sniper rifle, "
            "scarf flowing dramatically in the wind, cool emotionless focused expression"
        ),
        "chr_05": (
            "energetic combat pose, leaping through the air with her rocket launcher, "
            "brilliant orange explosions blooming in the background, "
            "bright cheerful smile, twin tails flying, immunity golden aura around her"
        ),
        "chr_06": (
            "calculated precision pose, kneeling and aiming her sniper rifle, "
            "ice crystals forming along the barrel and spreading on the ground, "
            "frost particles in the air, AR glasses glowing with targeting data, cold focused eyes"
        ),
    }

    output_dir = PROJECT_ROOT / "assets" / "video" / "pv_art"
    output_dir.mkdir(parents=True, exist_ok=True)
    portrait_dir = ASSETS_DIR / "portraits"

    for char_key, char in CHARACTERS.items():
        filename = f"{char_key}_action.png"
        output_path = output_dir / filename

        if output_path.exists():
            print(f"  SKIP (exists): {filename}")
            continue

        expr = portrait_map.get(char_key)
        if not expr:
            continue

        ref_path = portrait_dir / f"{char_key}_{expr}.png"
        if not ref_path.exists():
            print(f"  WARNING: Missing portrait {ref_path.name}, skipping.")
            continue

        action_desc = action_descriptions.get(char_key, "dynamic action battle pose")
        colors = char["colors"]

        prompt = (
            f"Using this character's exact design as reference - same face, hair color, "
            f"hair style, outfit, and weapon - create a new dramatic action illustration. "
            f"Character: {char['appearance']}. "
            f"Pose and action: {action_desc}. "
            f"Background: dramatic ruined sci-fi cityscape with neon lights, energy beams in the sky, "
            f"floating debris, atmospheric cinematic lighting. "
            f"Style: {STYLE_BASE}, dynamic action composition, dramatic camera angle, "
            f"motion blur on fast elements, energy effects. "
            f"Hair color: {colors['hair']}, outfit: {colors['outfit']}, accent: {colors['accent']}. "
            f"Full body visible, landscape orientation (16:9), single character only. "
            f"High quality, no text or UI elements."
        )

        print(f"\n  --- {char['name_jp']} ({char_key}) ---")
        generate_image_with_refs(prompt, [str(ref_path)], str(output_path), retry=2)
        time.sleep(DELAY_BETWEEN_REQUESTS)


def gen_key_visual():
    """Generate key visual and title logo using character portraits as reference."""
    print("\n=== Generating Key Visual & Title Logo ===\n")

    # Collect reference portraits (one per character)
    portrait_map = {
        "chr_01": "confident",
        "chr_02": "calm",
        "chr_03": "confident",
        "chr_04": "cool",
        "chr_05": "cheerful",
        "chr_06": "focused",
    }
    ref_images = []
    portrait_dir = ASSETS_DIR / "portraits"
    for char_key, expr in portrait_map.items():
        path = portrait_dir / f"{char_key}_{expr}.png"
        if path.exists():
            ref_images.append(str(path))
            print(f"  Ref: {path.name}")
        else:
            print(f"  WARNING: Missing ref {path.name}")

    if len(ref_images) < 3:
        print("  ERROR: Need at least 3 reference portraits. Aborting.")
        return

    # --- Key Visual ---
    kv_output = PROJECT_ROOT / "assets" / "images" / "key_visual.png"
    kv_prompt = (
        "Create an epic anime key visual / promotional illustration for a sci-fi "
        "military shooting game called 'STELLAR GUNNERS'. "
        "These attached images show the 6 playable characters of the game. "
        "Reference their exact designs, outfits, hair colors, and weapons. "
        "Create a NEW dramatic group illustration with ALL 6 characters in dynamic "
        "battle action poses, weapons drawn, facing the viewer as a team. "
        "Arrangement: center character (red-haired girl with assault rifle) in front, "
        "others flanking in V-formation. "
        "Background: dramatic ruined sci-fi cityscape at dusk, glowing energy beams "
        "in the sky, floating debris, atmospheric orange-blue lighting. "
        "Style: high quality anime promotional art, vibrant saturated colors, "
        "dramatic cinematic lighting from behind, action movie poster composition. "
        "Landscape orientation (16:9 aspect ratio), full body shots. "
        "DO NOT include any text, title, or logos in the image - characters and "
        "background only."
    )
    print("\n  --- Key Visual ---")
    generate_image_with_refs(kv_prompt, ref_images, str(kv_output), retry=2)
    time.sleep(DELAY_BETWEEN_REQUESTS)

    # --- Title Logo ---
    logo_output = PROJECT_ROOT / "assets" / "images" / "title_logo.png"
    logo_prompt = (
        "Create a stylish sci-fi video game title logo image. "
        "Main text: 'STELLAR GUNNERS' in bold futuristic military-style font. "
        "The letters should have: metallic silver-blue base color, bright cyan/blue "
        "energy glow effects around edges, subtle circuit-board texture within letters, "
        "thin neon blue accent lines extending from letter edges. "
        "Below the main title in smaller elegant text: 'ステラガンナーズ' (Japanese subtitle) "
        "in clean white with subtle blue glow. "
        "Background: solid very dark navy (#050515) or transparent. "
        "Style: professional game logo design, sharp clean edges, premium quality. "
        "The logo should look like it belongs on a AAA anime game title screen. "
        "Landscape orientation. Text only, no characters or illustrations."
    )
    print("\n  --- Title Logo ---")
    generate_image(logo_prompt, str(logo_output))


# ============================================================
# Main
# ============================================================

def main():
    print("=" * 60)
    print("Stellar Gunners - Image Asset Generator")
    print(f"Model: {MODEL}")
    print(f"API Key: {API_KEY[:10]}...")
    print("=" * 60)

    if len(sys.argv) > 1:
        task = sys.argv[1]
        if task == "portraits":
            gen_portraits()
        elif task == "sprites":
            gen_sprites()
        elif task == "icons":
            gen_face_icons()
        elif task == "enemies":
            gen_enemies()
        elif task == "backgrounds":
            gen_backgrounds()
        elif task == "pvart":
            gen_pv_action_art()
        elif task == "keyvisual":
            gen_key_visual()
        elif task == "all":
            gen_portraits()
            gen_sprites()
            gen_face_icons()
            gen_enemies()
            gen_backgrounds()
            gen_key_visual()
        elif task == "test":
            # Quick test: generate one portrait
            prompt = build_portrait_prompt("chr_01", "confident")
            output = ASSETS_DIR / "portraits" / "test_reina.png"
            generate_image(prompt, str(output))
        else:
            print(f"Unknown task: {task}")
            print("Usage: python generate_images.py [portraits|sprites|icons|enemies|backgrounds|all|test]")
    else:
        print("\nUsage: python generate_images.py [task]")
        print("Tasks:")
        print("  test        - Generate one test image (Reina portrait)")
        print("  portraits   - Generate all scenario standing portraits (16 images)")
        print("  sprites     - Generate game sprite sheets (6 images)")
        print("  icons       - Generate face icons for UI (6 images)")
        print("  enemies     - Generate enemy sprites (7 images)")
        print("  backgrounds - Generate background images (5 images)")
        print("  pvart       - Generate PV action illustrations (6 images, for VEO ref)")
        print("  keyvisual   - Generate key visual + title logo")
        print("  all         - Generate everything (40+ images)")

    print("\nDone!")


if __name__ == "__main__":
    main()
