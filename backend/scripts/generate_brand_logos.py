"""
One-shot script: generate the Lusorae brand logos via Gemini Nano Banana.
Outputs:
  /app/frontend/public/brand/lusorae-wordmark.png
  /app/frontend/public/brand/lusorae-L.png
Run:
  cd /app/backend && python -m scripts.generate_brand_logos
"""
import asyncio
import base64
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")

OUT_DIR = Path("/app/frontend/public/brand")
OUT_DIR.mkdir(parents=True, exist_ok=True)

MODEL = "gemini-3.1-flash-image-preview"

WORDMARK_PROMPT = (
    "A premium editorial logotype that reads exactly 'LUSORAE' — all letters in a "
    "single custom italic serif wordmark, ultra-bold weight (black), with a soft "
    "curved baseline so the word gently bows like a smile (subtle curvature, not "
    "extreme). The strokes are confident and modern with thick weight contrast, "
    "elegant italic slant (~12°), slightly condensed counters, refined terminals. "
    "Pure solid jet-black ink on a clean off-white paper background. No drop "
    "shadows, no gradients, no outlines, no extra ornaments, no taglines, no "
    "additional text or letters anywhere. Vector-like crisp silhouette, perfectly "
    "centred, generous symmetric margins. Render as a wide horizontal logo plate, "
    "high contrast, magazine-grade typography. Spelling must be exactly L-U-S-O-R-A-E."
)

MONOGRAM_PROMPT = (
    "A single italic capital letter 'L' as a premium monogram logo. The L is set "
    "in a custom ultra-bold (black weight) italic serif, with a soft curved "
    "baseline foot — the horizontal stroke of the L gently arcs like a smile, "
    "and the vertical stem has confident thick weight contrast and elegant "
    "italic slant (~12°). Refined terminals, magazine-grade engineering. Pure "
    "solid jet-black ink on a clean off-white paper background. No drop shadows, "
    "no gradients, no outlines, no ornaments, no other letters, no taglines, no "
    "additional text. Vector-like crisp silhouette, perfectly centred in a "
    "square composition, generous symmetric margins. The shape must be "
    "unmistakably a stylised italic letter L."
)


async def generate(prompt: str, out_path: Path) -> bool:
    api_key = os.getenv("EMERGENT_LLM_KEY")
    if not api_key:
        print("ERROR: EMERGENT_LLM_KEY missing")
        return False

    chat = (
        LlmChat(api_key=api_key, session_id=f"brand-{out_path.stem}", system_message="You are a brand identity designer.")
        .with_model("gemini", MODEL)
        .with_params(modalities=["image", "text"])
    )

    msg = UserMessage(text=prompt)
    text, images = await chat.send_message_multimodal_response(msg)
    print(f"[{out_path.name}] text reply: {(text or '')[:80]}")
    if not images:
        print(f"[{out_path.name}] no images returned")
        return False

    img = images[0]
    image_bytes = base64.b64decode(img["data"])
    out_path.write_bytes(image_bytes)
    print(f"[{out_path.name}] saved {len(image_bytes)} bytes -> {out_path}")
    return True


async def main():
    ok1 = await generate(WORDMARK_PROMPT, OUT_DIR / "lusorae-wordmark.png")
    ok2 = await generate(MONOGRAM_PROMPT, OUT_DIR / "lusorae-L.png")
    if not (ok1 and ok2):
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
