"""
Lusorae · v3 redesign — gera 11 imagens fotográficas para a nova landing.
Estilo: travel/lifestyle photography moderno, luz natural, editorial clean.

Corre em background:
    nohup python3 /app/scripts/generate_v3_images.py > /tmp/genv3.log 2>&1 &
"""
import asyncio
import base64
import os
from io import BytesIO
from pathlib import Path

from dotenv import load_dotenv
from PIL import Image
from emergentintegrations.llm.chat import LlmChat, UserMessage

load_dotenv("/app/backend/.env")
API_KEY = os.getenv("EMERGENT_LLM_KEY")
OUT_DIR = Path("/app/frontend/public/v3")
OUT_DIR.mkdir(parents=True, exist_ok=True)

PHOTO_STYLE = (
    "Professional travel/editorial photography, warm natural light, "
    "modern clean composition, slight gentle desaturation, soft contrast, "
    "high quality, photorealistic, no text overlay, no watermark, no logo, "
    "no people's faces close-up (or use anonymous silhouettes), 4K quality. "
)

PROMPTS = {
    # ---- CITY CARDS (also reused as map avatars, cropped circular) ----
    "city-faro.webp": (
        "Aerial coastal photograph of Faro Old Town, Algarve, southern "
        "Portugal: white-washed buildings, soft warm golden hour light, "
        "blue Atlantic ocean meeting beige sand cliffs, no people. Wide "
        "16:10 aspect. " + PHOTO_STYLE
    ),
    "city-porto.webp": (
        "Photograph of Porto Ribeira at sunset: the iconic Dom Luís I "
        "Bridge crossing the Douro river, colorful tiered houses on the "
        "hill, warm orange sky, a few rabelo boats. Wide 16:10 aspect. "
        + PHOTO_STYLE
    ),
    "city-coimbra.webp": (
        "Photograph of the University of Coimbra tower (Torre da "
        "Universidade) on the hilltop overlooking the Mondego river, "
        "afternoon golden light, baroque architecture details visible. "
        "Wide 16:10 aspect. " + PHOTO_STYLE
    ),
    "city-lisboa.webp": (
        "Photograph of a classic yellow Tram 28 climbing a Lisbon street "
        "in Alfama, azulejo-tiled facade in the background, soft "
        "afternoon light, slight motion blur on the tram. Wide 16:10 "
        "aspect. " + PHOTO_STYLE
    ),
    "city-braga.webp": (
        "Photograph of Bom Jesus do Monte sanctuary in Braga: the famous "
        "white baroque staircase rising through forested hills, soft "
        "natural daylight, blue sky with white clouds. Wide 16:10 "
        "aspect. " + PHOTO_STYLE
    ),
    # ---- COMMUNITY CARDS ----
    "com-surf.webp": (
        "Photograph of a surfer riding a powerful blue-green wave at "
        "Praia da Nazaré, Portugal, white foam crashing, dramatic side "
        "view, late afternoon sunlight. Wide 16:10 aspect. " + PHOTO_STYLE
    ),
    "com-stadium.webp": (
        "Photograph of a packed football stadium at night with stadium "
        "lights illuminating the green pitch, blurred crowd in the "
        "stands holding red flags. Wide 16:10 aspect. " + PHOTO_STYLE
    ),
    "com-camera.webp": (
        "Close-up photograph of a professional DSLR camera on a wooden "
        "table with soft window light, very shallow depth of field, "
        "warm tones, a small notebook beside it. Wide 16:10 aspect. "
        + PHOTO_STYLE
    ),
    "com-trails.webp": (
        "Photograph of a hiking trail winding through green mountains "
        "in northern Portugal (Peneda-Gerês), morning mist, distant "
        "valleys visible, soft blue sky. Wide 16:10 aspect. " + PHOTO_STYLE
    ),
    "com-code.webp": (
        "Close-up photograph of a sleek modern laptop screen showing "
        "colorful syntax-highlighted code in a dark editor theme, "
        "warm desk light, slight bokeh background, plants out of focus. "
        "Wide 16:10 aspect. " + PHOTO_STYLE
    ),
    "com-music.webp": (
        "Photograph of a live music concert: a band silhouetted on "
        "stage with red and warm yellow stage lights, fog/haze, crowd "
        "silhouettes in foreground with arms raised, dramatic and "
        "atmospheric. Wide 16:10 aspect. " + PHOTO_STYLE
    ),
}


async def gen_one(filename: str, prompt: str) -> None:
    print(f"[gen] {filename}", flush=True)
    chat = LlmChat(
        api_key=API_KEY,
        session_id=f"lusorae-v3-{filename}",
        system_message="You are a professional travel/editorial photographer.",
    )
    chat.with_model("gemini", "gemini-3.1-flash-image-preview").with_params(
        modalities=["image", "text"]
    )
    msg = UserMessage(text=prompt)
    _text, images = await chat.send_message_multimodal_response(msg)
    if not images:
        print(f"[fail] {filename}: no image", flush=True)
        return
    img = images[0]
    raw = base64.b64decode(img["data"])
    out_path = OUT_DIR / filename
    if img.get("mime_type") == "image/webp":
        out_path.write_bytes(raw)
    else:
        im = Image.open(BytesIO(raw))
        if im.mode != "RGB":
            im = im.convert("RGB")
        im.save(out_path, "WEBP", quality=85, method=6)
    print(f"[ok]  {filename} ({len(raw)//1024} KB)", flush=True)


async def main() -> None:
    if not API_KEY:
        raise RuntimeError("EMERGENT_LLM_KEY missing")
    # 3-by-3 batches para evitar rate limits e ainda assim ser rápido
    items = list(PROMPTS.items())
    for i in range(0, len(items), 3):
        batch = items[i:i + 3]
        print(f"--- batch {i//3+1} ({len(batch)} images) ---", flush=True)
        await asyncio.gather(*(gen_one(f, p) for f, p in batch))
    print("[done]")


if __name__ == "__main__":
    asyncio.run(main())
