"""
Stellar Gunners - VEO 3.1 PV Clip Generator
Generates short anime-style video clips for each character using Google VEO 3.1 API.
Output: assets/video/clips/chr_0X_clip.mp4
"""

import requests
import json
import base64
import os
import sys
import time
from pathlib import Path

# Load API key from LOCAL_SECRETS.md
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent
SECRETS_PATH = PROJECT_ROOT / "LOCAL_SECRETS.md"
CHARACTERS_PATH = PROJECT_ROOT / "assets" / "data" / "characters.json"
OUTPUT_DIR = PROJECT_ROOT / "assets" / "video" / "clips"

VEO_MODELS = {
    "3.1": "veo-3.1-generate-preview",
    "3.1-fast": "veo-3.1-fast-generate-preview",
    "3.0": "veo-3.0-generate-001",
    "3.0-fast": "veo-3.0-fast-generate-001",
}
VEO_MODEL = VEO_MODELS["3.1"]  # Default; override with --model flag
API_BASE = "https://generativelanguage.googleapis.com/v1beta"


def load_api_key():
    with open(SECRETS_PATH, "r", encoding="utf-8") as f:
        content = f.read()
    for line in content.splitlines():
        line = line.strip()
        if line.startswith("AIza"):
            return line
    raise RuntimeError("API key not found in LOCAL_SECRETS.md")


def load_characters():
    with open(CHARACTERS_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


# Character visual descriptions for VEO prompts
# portrait_key: which portrait file to use as reference image
CHARACTER_VISUALS = {
    "chr_01": {
        "appearance": "young woman with fiery red hair in a ponytail, wearing a sleek military combat suit with bio-green energy lines, carrying an assault rifle",
        "action": "firing rapid bursts from her assault rifle while dashing forward, green energy particles swirling around her, spent casings flying",
        "color_theme": "red and green",
        "portrait_key": "chr_01_confident",
    },
    "chr_02": {
        "appearance": "gentle woman with long purple hair, wearing a white-and-purple medic uniform with psychic energy wings, holding a glowing pistol",
        "action": "channeling a healing aura around herself, purple psychic energy rippling outward in waves, hair floating with power",
        "color_theme": "purple and white",
        "portrait_key": "chr_02_calm",
    },
    "chr_03": {
        "appearance": "strong athletic woman with short blue hair, wearing heavy blue-silver mechanical power armor, wielding a massive shotgun",
        "action": "deploying an energy shield while blasting enemies with her shotgun, blue mechanical parts whirring, standing firm like a fortress",
        "color_theme": "blue and silver",
        "portrait_key": "chr_03_confident",
    },
    "chr_04": {
        "appearance": "mysterious woman with dark black hair and shadowy aura, wearing a dark stealth suit with corrosion-purple accents, holding a long sniper rifle",
        "action": "taking a precise sniper shot from a vantage point, dark energy coiling around the barrel, a single devastating bullet piercing through multiple targets",
        "color_theme": "black and dark purple",
        "portrait_key": "chr_04_cool",
    },
    "chr_05": {
        "appearance": "cheerful woman with bright orange hair in twin tails, wearing a white-and-orange combat outfit with immunity symbols, carrying a rocket launcher",
        "action": "launching explosive rounds that burst into brilliant orange fireballs, laughing confidently as explosions bloom behind her",
        "color_theme": "orange and white",
        "portrait_key": "chr_05_cheerful",
    },
    "chr_06": {
        "appearance": "cool composed woman with ice-blue long hair, wearing a sleek white-blue tech suit with frost crystals, aiming a precision sniper rifle",
        "action": "firing ice-infused sniper shots that freeze enemies on impact, frost spreading from each bullet trail, calm focused expression",
        "color_theme": "ice blue and white",
        "portrait_key": "chr_06_focused",
    },
}

PORTRAITS_DIR = PROJECT_ROOT / "assets" / "images" / "portraits"
PV_ART_DIR = PROJECT_ROOT / "assets" / "video" / "pv_art"


def build_prompt(char_data, visual_info, clip_type="action"):
    """Build a VEO prompt for a character clip."""
    name = char_data["name"]
    attribute = char_data["attribute"]
    weapon = char_data["weaponType"].replace("_", " ")
    skill1 = char_data["skill1Name"]
    ult = char_data["ultName"]

    base_style = (
        "Anime style, high quality Japanese animation, dramatic cinematic lighting, "
        "sci-fi dystopian city background with neon lights and debris, "
        "smooth animation, 24fps anime look, vibrant colors"
    )

    if clip_type == "action":
        prompt = (
            f"{base_style}. "
            f"A {visual_info['appearance']}. "
            f"She is {visual_info['action']}. "
            f"The scene has dramatic {visual_info['color_theme']} energy effects. "
            f"Camera slowly zooms in with slight dynamic angle. "
            f"Epic battle atmosphere with particle effects and lens flares."
        )
    elif clip_type == "intro":
        prompt = (
            f"{base_style}. "
            f"A {visual_info['appearance']} standing confidently facing the camera. "
            f"Wind blowing through her hair, {visual_info['color_theme']} energy particles "
            f"gently floating around her. She smirks and grips her weapon. "
            f"Cinematic portrait shot, shallow depth of field, dramatic backlighting."
        )
    elif clip_type == "ultimate":
        prompt = (
            f"{base_style}. "
            f"A {visual_info['appearance']} unleashing a massive ultimate attack. "
            f"Overwhelming {visual_info['color_theme']} energy explosion fills the screen. "
            f"Camera pulls back to show the massive scale of the attack. "
            f"Screen-shaking power, intense glow, epic climax moment."
        )

    return prompt


def generate_video_clip(prompt, output_path, duration_seconds=8, ref_image_path=None, model=None):
    """Generate a video clip using VEO API.
    Note: VEO accepts even durations: 4, 6, or 8 seconds.
    If ref_image_path is provided, uses image-to-video mode for visual consistency.
    """
    api_key = load_api_key()
    use_model = model or VEO_MODEL
    endpoint = f"{API_BASE}/models/{use_model}:predictLongRunning"
    print(f"  Model: {use_model}")

    headers = {
        "x-goog-api-key": api_key,
        "Content-Type": "application/json",
    }

    instance = {"prompt": prompt}

    # Image-to-video: use portrait as reference/starting frame
    if ref_image_path and os.path.exists(ref_image_path):
        with open(ref_image_path, "rb") as f:
            img_b64 = base64.b64encode(f.read()).decode()
        instance["image"] = {
            "bytesBase64Encoded": img_b64,
            "mimeType": "image/png",
        }
        print(f"  Using reference image: {Path(ref_image_path).name}")

    payload = {
        "instances": [instance],
        "parameters": {
            "aspectRatio": "16:9",
            "durationSeconds": duration_seconds,
        },
    }

    # Retry loop with rate limit handling
    max_retries = 5
    for attempt in range(max_retries):
        print(f"  Sending VEO 3.1 request (attempt {attempt + 1}/{max_retries})...")
        response = requests.post(endpoint, headers=headers, json=payload, timeout=60)

        if response.status_code == 429:
            wait_time = 120 * (attempt + 1)  # 120s, 240s, 360s, ...
            print(f"  Rate limited (429). Waiting {wait_time}s...")
            time.sleep(wait_time)
            continue

        if response.status_code != 200:
            print(f"  ERROR: HTTP {response.status_code}")
            print(f"  Response: {response.text[:500]}")
            return False

        break  # Success, exit retry loop
    else:
        print(f"  ERROR: Max retries ({max_retries}) exhausted due to rate limiting")
        return False

    result = response.json()
    operation_name = result.get("name")
    if not operation_name:
        print(f"  ERROR: No operation name in response")
        print(f"  Response: {json.dumps(result, indent=2)[:500]}")
        return False

    print(f"  Operation: {operation_name}")
    print(f"  Polling for completion...")

    # Poll for completion
    poll_url = f"{API_BASE}/{operation_name}"
    max_wait = 600  # 10 minutes max
    poll_interval = 15  # seconds
    elapsed = 0

    while elapsed < max_wait:
        time.sleep(poll_interval)
        elapsed += poll_interval

        poll_resp = requests.get(poll_url, headers={"x-goog-api-key": api_key}, timeout=30)
        if poll_resp.status_code != 200:
            print(f"  Poll error: HTTP {poll_resp.status_code}")
            continue

        poll_data = poll_resp.json()
        done = poll_data.get("done", False)
        print(f"  [{elapsed}s] done={done}")

        if done:
            # Extract video URI
            resp_obj = poll_data.get("response", {})
            videos = resp_obj.get("generateVideoResponse", {}).get("generatedSamples", [])
            if not videos:
                # Try alternative response structure
                videos = resp_obj.get("generatedSamples", [])

            if not videos:
                print(f"  ERROR: No video in response")
                print(f"  Response: {json.dumps(poll_data, indent=2)[:1000]}")
                return False

            video_uri = videos[0].get("video", {}).get("uri")
            if not video_uri:
                print(f"  ERROR: No video URI")
                print(f"  Video data: {json.dumps(videos[0], indent=2)[:500]}")
                return False

            # Download the video (requires API key)
            print(f"  Downloading video...")
            video_resp = requests.get(
                video_uri, headers={"x-goog-api-key": api_key}, timeout=120
            )
            if video_resp.status_code != 200:
                print(f"  ERROR: Download failed: HTTP {video_resp.status_code}")
                return False

            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            with open(output_path, "wb") as f:
                f.write(video_resp.content)

            size_mb = len(video_resp.content) / (1024 * 1024)
            print(f"  Saved: {output_path} ({size_mb:.1f} MB)")
            return True

    print(f"  ERROR: Timed out after {max_wait}s")
    return False


def generate_all_clips(clip_types=None, characters=None, model=None, output_dir=None):
    """Generate clips for all characters."""
    if clip_types is None:
        clip_types = ["action"]

    out_dir = Path(output_dir) if output_dir else OUTPUT_DIR
    char_data = load_characters()
    out_dir.mkdir(parents=True, exist_ok=True)

    results = {}

    for char in char_data:
        char_id = char["charId"]

        # Filter by requested characters
        if characters and char_id not in characters:
            continue

        visual = CHARACTER_VISUALS.get(char_id)
        if not visual:
            print(f"  Skipping {char_id}: no visual description")
            continue

        for clip_type in clip_types:
            clip_name = f"{char_id}_{clip_type}"
            output_path = out_dir / f"{clip_name}.mp4"

            if output_path.exists():
                print(f"\n[SKIP] {clip_name} already exists: {output_path}")
                results[clip_name] = "skipped"
                continue

            print(f"\n{'='*60}")
            print(f"Generating: {clip_name} ({char['name']})")
            print(f"{'='*60}")

            prompt = build_prompt(char, visual, clip_type)
            print(f"  Prompt: {prompt[:200]}...")

            # Use Gemini-generated action art as reference (preferred),
            # fallback to raw portrait
            ref_image = None
            pv_art_path = PV_ART_DIR / f"{char_id}_action.png"
            if pv_art_path.exists():
                ref_image = str(pv_art_path)
                print(f"  Using PV action art: {pv_art_path.name}")
            else:
                portrait_key = visual.get("portrait_key")
                if portrait_key:
                    ref_path = PORTRAITS_DIR / f"{portrait_key}.png"
                    if ref_path.exists():
                        ref_image = str(ref_path)
                        print(f"  Fallback to portrait: {ref_path.name}")

            success = generate_video_clip(
                prompt, str(output_path), duration_seconds=8,
                ref_image_path=ref_image, model=model,
            )
            results[clip_name] = "success" if success else "failed"

            if success:
                # Rate limiting: wait between requests (VEO has strict RPM limits)
                print(f"  Waiting 60s before next request...")
                time.sleep(60)

    print(f"\n{'='*60}")
    print("Results Summary:")
    print(f"{'='*60}")
    for name, status in results.items():
        icon = "OK" if status == "success" else ("--" if status == "skipped" else "NG")
        print(f"  [{icon}] {name}")

    return results


def generate_title_clip():
    """Generate a title/opening clip for the PV."""
    output_path = OUTPUT_DIR / "title_clip.mp4"
    if output_path.exists():
        print(f"[SKIP] title_clip already exists")
        return True

    prompt = (
        "Anime style, high quality Japanese animation. "
        "A dramatic sci-fi establishing shot: camera sweeps over a ruined futuristic city at sunset. "
        "Towering neon-lit buildings, floating debris, energy beams in the sky. "
        "Lens flare and particle effects. Cinematic widescreen, epic scale. "
        "Dark atmospheric mood with vibrant blue and purple accents."
    )

    print(f"\n{'='*60}")
    print(f"Generating: Title Clip")
    print(f"{'='*60}")

    return generate_video_clip(prompt, str(output_path), duration_seconds=8)


def generate_ending_clip():
    """Generate an ending clip for the PV."""
    output_path = OUTPUT_DIR / "ending_clip.mp4"
    if output_path.exists():
        print(f"[SKIP] ending_clip already exists")
        return True

    prompt = (
        "Anime style, high quality Japanese animation. "
        "Six anime warrior women standing in a line formation facing the camera, "
        "each with different colored energy auras (red, purple, blue, dark, orange, ice blue). "
        "They stand on a futuristic platform overlooking a vast sci-fi cityscape. "
        "Camera slowly pulls back to reveal the epic scale. "
        "Sunset lighting, dramatic backlighting, particle effects floating upward."
    )

    print(f"\n{'='*60}")
    print(f"Generating: Ending Clip")
    print(f"{'='*60}")

    return generate_video_clip(prompt, str(output_path), duration_seconds=8)


def main():
    """
    Usage:
        python generate_pv_clips.py                    # Generate action clips for all characters
        python generate_pv_clips.py all                # Generate all clip types for all characters
        python generate_pv_clips.py chr_01 chr_03      # Generate action clips for specific characters
        python generate_pv_clips.py --type intro       # Generate intro clips for all
        python generate_pv_clips.py --type action,ultimate  # Multiple clip types
        python generate_pv_clips.py title              # Generate title clip only
        python generate_pv_clips.py ending             # Generate ending clip only
        python generate_pv_clips.py full               # Generate everything (title + all chars + ending)
    """
    args = sys.argv[1:]

    if not args or args == ["all"]:
        clip_types = ["action"] if not args else ["action", "intro", "ultimate"]
        generate_all_clips(clip_types=clip_types)
        return

    if args[0] == "title":
        generate_title_clip()
        return

    if args[0] == "ending":
        generate_ending_clip()
        return

    if args[0] == "full":
        generate_title_clip()
        time.sleep(10)
        generate_all_clips(clip_types=["action"])
        time.sleep(10)
        generate_ending_clip()
        return

    # Parse --type, --model, --output-dir flags
    clip_types = ["action"]
    characters = []
    model = None
    output_dir = None

    i = 0
    while i < len(args):
        if args[i] == "--type" and i + 1 < len(args):
            clip_types = args[i + 1].split(",")
            i += 2
        elif args[i] == "--model" and i + 1 < len(args):
            model_key = args[i + 1]
            if model_key in VEO_MODELS:
                model = VEO_MODELS[model_key]
                print(f"Using model: {model}")
            else:
                print(f"Unknown model: {model_key}. Available: {list(VEO_MODELS.keys())}")
                return
            i += 2
        elif args[i] == "--output-dir" and i + 1 < len(args):
            output_dir = args[i + 1]
            print(f"Output dir: {output_dir}")
            i += 2
        elif args[i].startswith("chr_"):
            characters.append(args[i])
            i += 1
        else:
            print(f"Unknown argument: {args[i]}")
            print(main.__doc__)
            i += 1

    generate_all_clips(
        clip_types=clip_types,
        characters=characters if characters else None,
        model=model,
        output_dir=output_dir,
    )


if __name__ == "__main__":
    main()
