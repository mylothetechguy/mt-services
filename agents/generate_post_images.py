#!/usr/bin/env python3
"""
M&T Services — LinkedIn Post Image Generator
Uses Kling AI to generate a professional image for each LinkedIn post.

Run this LOCALLY (not in the cloud — Kling AI is blocked there).

Setup:
    pip install anthropic requests PyJWT

Usage:
    # Generate images for the most recent posts file
    python agents/generate_post_images.py --posts linkedin_posts_2026-06-30.md

    # Specify an output folder
    python agents/generate_post_images.py --posts linkedin_posts_2026-06-30.md --out post_images/

    # Test API connection only
    python agents/generate_post_images.py --test

Environment variables (or pass as --kling-key / --anthropic-key):
    KLING_API_KEY=api-key-kling-...
    ANTHROPIC_API_KEY=sk-ant-...
"""

import argparse
import os
import re
import sys
import time
import json

try:
    import requests
except ImportError:
    print("Run: pip install requests")
    sys.exit(1)

try:
    import anthropic
except ImportError:
    print("Run: pip install anthropic")
    sys.exit(1)

# ── Kling AI client ───────────────────────────────────────────────────────────

KLING_BASE = "https://api.klingai.com"

def kling_headers(api_key: str) -> dict:
    """Try direct Bearer auth (newer Kling API keys)."""
    return {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }


def submit_image_task(api_key: str, prompt: str, aspect_ratio: str = "16:9") -> str:
    """Submit an image generation task; returns task_id."""
    url = f"{KLING_BASE}/v1/images/generations"
    payload = {
        "model": "kling-v1",
        "prompt": prompt,
        "negative_prompt": (
            "blurry, low quality, amateur, cluttered, text watermark, "
            "cartoon, anime, ugly, distorted, oversaturated"
        ),
        "n": 1,
        "aspect_ratio": aspect_ratio,
        "image_fidelity": 0.5,
    }
    resp = requests.post(url, headers=kling_headers(api_key), json=payload, timeout=30)

    # Surface useful errors
    if resp.status_code == 401:
        raise RuntimeError(
            "Kling API key rejected (401). "
            "Check the key at: https://klingai.com/global/developer/api-key"
        )
    if resp.status_code == 422:
        raise RuntimeError(f"Kling rejected the request body (422): {resp.text}")
    resp.raise_for_status()

    data = resp.json()
    if data.get("code", 0) != 0:
        raise RuntimeError(f"Kling error: {data.get('message', data)}")

    task_id = data["data"]["task_id"]
    return task_id


def poll_image_task(api_key: str, task_id: str, max_wait: int = 180) -> str:
    """Poll until the image is ready; returns the image URL."""
    url = f"{KLING_BASE}/v1/images/generations/{task_id}"
    deadline = time.time() + max_wait

    while time.time() < deadline:
        resp = requests.get(url, headers=kling_headers(api_key), timeout=15)
        resp.raise_for_status()
        data = resp.json()

        status = data.get("data", {}).get("task_status", "")
        if status == "succeed":
            works = data["data"].get("works", [])
            if works:
                return works[0]["resource"]["resource"]
            raise RuntimeError("Task succeeded but no image URL in response.")
        if status == "failed":
            raise RuntimeError(f"Kling image task failed: {data}")

        print(f"    status: {status} — waiting...", end="\r", flush=True)
        time.sleep(4)

    raise TimeoutError(f"Image task {task_id} didn't complete in {max_wait}s.")


def download_image(image_url: str, save_path: str):
    """Download an image URL to a local file."""
    resp = requests.get(image_url, timeout=60, stream=True)
    resp.raise_for_status()
    with open(save_path, "wb") as f:
        for chunk in resp.iter_content(chunk_size=8192):
            f.write(chunk)


# ── Prompt generation via Claude ──────────────────────────────────────────────

IMAGE_SYSTEM = """\
You are a visual art director for M&T Services, a veteran-owned AI automation company (Bossier City, LA).
Given a LinkedIn post, write a concise Kling AI image generation prompt (60–100 words) for a professional
LinkedIn header image that:
- Visually supports the post's message without repeating its text
- Feels premium, modern, tech-forward but approachable (not sci-fi)
- Uses dark navy (#0f2a3f) and teal/cyan (#06d6c4) as accent colors where natural
- Is a landscape photo-realistic scene, NOT a diagram or text-heavy graphic
- Avoids faces (DALL-E/Kling often distort them) — use hands, devices, environments, or abstract tech
- Works as a LinkedIn 1200×627px header image

Return ONLY the image prompt. No labels, no explanation."""


def make_image_prompt(anthropic_client: anthropic.Anthropic, post_content: str, post_type: str) -> str:
    msg = anthropic_client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=200,
        system=IMAGE_SYSTEM,
        messages=[
            {
                "role": "user",
                "content": (
                    f"Post type: {post_type}\n\n"
                    f"Post content:\n{post_content}\n\n"
                    "Write the image generation prompt."
                ),
            }
        ],
    )
    return msg.content[0].text.strip()


# ── Parse markdown posts file ─────────────────────────────────────────────────

def parse_posts(filepath: str) -> list:
    """Extract posts from the markdown calendar file."""
    with open(filepath) as f:
        text = f.read()

    # Split on ## Post N — ...
    sections = re.split(r"(?=^## Post \d+)", text, flags=re.MULTILINE)
    posts = []

    for section in sections:
        m = re.match(r"## Post (\d+) — (.+?)\n\*\*Type:\*\* (.+?)(?:\s+\|.*)?$", section, re.MULTILINE)
        if not m:
            continue
        index = int(m.group(1))
        date = m.group(2).strip()
        post_type = m.group(3).strip()

        # Extract content between ``` fences
        code_match = re.search(r"```\n(.*?)\n```", section, re.DOTALL)
        content = code_match.group(1).strip() if code_match else ""

        if content:
            posts.append({"index": index, "date": date, "type": post_type, "content": content})

    return posts


# ── Main ──────────────────────────────────────────────────────────────────────

def test_connection(kling_key: str):
    """Quick connection test — submits a minimal task."""
    print("Testing Kling AI connection...")
    try:
        task_id = submit_image_task(
            kling_key,
            "professional modern office desk with laptop, dark navy and teal color scheme, cinematic lighting",
        )
        print(f"  Connection OK — task_id: {task_id}")
        print("  (Task submitted but not polled — you'll be billed for this test image.)")
        print("  Check your Kling AI dashboard to see it complete.")
    except Exception as e:
        print(f"  Connection FAILED: {e}")
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(description="M&T Services LinkedIn Post Image Generator")
    parser.add_argument("--posts", type=str, help="Path to linkedin_posts_*.md file")
    parser.add_argument("--out", type=str, default="post_images", help="Output folder (default: post_images/)")
    parser.add_argument("--kling-key", type=str, default=None, help="Kling AI API key")
    parser.add_argument("--anthropic-key", type=str, default=None, help="Anthropic API key")
    parser.add_argument("--test", action="store_true", help="Test API connection only")
    parser.add_argument("--aspect", type=str, default="16:9", choices=["16:9", "1:1", "9:16"],
                        help="Image aspect ratio (default: 16:9 for LinkedIn headers)")
    args = parser.parse_args()

    kling_key = args.kling_key or os.environ.get("KLING_API_KEY", "")
    anthropic_key = args.anthropic_key or os.environ.get("ANTHROPIC_API_KEY", "")

    if not kling_key:
        print("Error: Kling API key required. Set KLING_API_KEY or pass --kling-key")
        sys.exit(1)

    if args.test:
        test_connection(kling_key)
        return

    if not args.posts:
        print("Error: --posts <path to linkedin_posts_*.md> is required")
        sys.exit(1)
    if not anthropic_key:
        print("Error: Anthropic API key required for prompt generation. Set ANTHROPIC_API_KEY or pass --anthropic-key")
        sys.exit(1)

    posts = parse_posts(args.posts)
    if not posts:
        print(f"No posts found in {args.posts}. Make sure it's a file from linkedin_agent.py.")
        sys.exit(1)

    os.makedirs(args.out, exist_ok=True)
    anthropic_client = anthropic.Anthropic(api_key=anthropic_key)

    print(f"\nM&T Services — LinkedIn Post Image Generator")
    print(f"{'=' * 48}")
    print(f"Posts found : {len(posts)}")
    print(f"Aspect ratio: {args.aspect}")
    print(f"Output dir  : {args.out}/")
    print()

    results = []
    for post in posts:
        label = f"Post {post['index']} — {post['type']}"
        print(f"[{post['index']:02d}/{len(posts)}] {label}")

        # Step 1: Generate image prompt
        print(f"  Generating image prompt...", end="", flush=True)
        img_prompt = make_image_prompt(anthropic_client, post["content"], post["type"])
        print(" ✓")
        print(f"  Prompt: {img_prompt[:80]}...")

        # Step 2: Submit to Kling AI
        print(f"  Submitting to Kling AI...", end="", flush=True)
        try:
            task_id = submit_image_task(kling_key, img_prompt, args.aspect)
            print(f" ✓  (task: {task_id})")
        except Exception as e:
            print(f" FAILED: {e}")
            results.append({**post, "status": "failed", "error": str(e)})
            continue

        # Step 3: Poll for completion
        print(f"  Waiting for image...", end="", flush=True)
        try:
            image_url = poll_image_task(kling_key, task_id)
            print(f" ✓")
        except Exception as e:
            print(f" FAILED: {e}")
            results.append({**post, "status": "failed", "error": str(e)})
            continue

        # Step 4: Download
        safe_date = post["date"].replace(",", "").replace(" ", "_")
        filename = f"post_{post['index']:02d}_{safe_date}.jpg"
        save_path = os.path.join(args.out, filename)
        print(f"  Downloading → {save_path}...", end="", flush=True)
        try:
            download_image(image_url, save_path)
            size_kb = os.path.getsize(save_path) // 1024
            print(f" ✓  ({size_kb} KB)")
            results.append({**post, "status": "ok", "file": save_path, "prompt": img_prompt})
        except Exception as e:
            print(f" FAILED: {e}")
            results.append({**post, "status": "failed", "error": str(e)})

        print()

    # Summary
    ok = [r for r in results if r.get("status") == "ok"]
    failed = [r for r in results if r.get("status") == "failed"]

    print(f"Done: {len(ok)} images saved, {len(failed)} failed.")
    if ok:
        print(f"\nImages saved to: {args.out}/")
        for r in ok:
            print(f"  {r['file']}")
    if failed:
        print(f"\nFailed posts:")
        for r in failed:
            print(f"  Post {r['index']}: {r.get('error', 'unknown error')}")

    # Save a manifest
    manifest_path = os.path.join(args.out, "manifest.json")
    with open(manifest_path, "w") as f:
        json.dump(results, f, indent=2)
    print(f"\nManifest saved to: {manifest_path}")


if __name__ == "__main__":
    main()
