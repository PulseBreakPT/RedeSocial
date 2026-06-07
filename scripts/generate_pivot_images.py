"""
Lusorae · gera 2 imagens NOVAS específicas para o pivot Fev 2026:
- lusorae-mapa-poster.webp  → poster fanzine com motif de mapa + pulso de cidade
- lusorae-bairro.webp       → cena de bairro / vizinhança portuguesa

Reutiliza o resto das imagens existentes em /app/frontend/public/hero/.
Corre em background:  nohup python3 /app/scripts/generate_pivot_images.py > /tmp/genimg.log 2>&1 &
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
OUT_DIR = Path("/app/frontend/public/hero")
OUT_DIR.mkdir(parents=True, exist_ok=True)

STYLE = (
    "Estilo: poster urbano fanzine português, ilustração editorial bold, "
    "paleta limitada vermelho carmim (#C8102E), dourado (#FFCC00), verde "
    "escuro (#046A38), azul cobalto (#0E4D92), creme amarelado (#FFF4DC), "
    "preto (#0A0A0A). Halftone subtle, riso-print grain, bordas grossas "
    "pretas, blocos de cor, sombras duras offset, sensação manual, ilustrado, "
    "sem texto sobreposto, sem letras, sem palavras, sem números, sem logo."
)

PROMPTS = {
    "lusorae-mapa-poster.webp": (
        "Poster vertical fanzine: contorno estilizado do mapa de Portugal "
        "continental ao centro com pequenos pontos circulares vermelhos e "
        "dourados a indicar cidades, linhas de coordenadas a tracejado em "
        "cor azul cobalto, uma estrela vermelha grande no canto superior "
        "esquerdo, uma seta a apontar para um ponto no mapa, motifs de "
        "azulejos azuis num canto inferior, riso-print collage. "
        f"{STYLE} Formato 3:4 vertical."
    ),
    "lusorae-bairro.webp": (
        "Ilustração horizontal fanzine: cena de bairro português de manhã "
        "com varandas de ferro forjado com plantas verdes em vasos, uma "
        "padaria com toldo vermelho e dourado no rés-do-chão, duas "
        "vizinhas a conversar à porta com cesta de pão, um gato preto a "
        "passar na rua, calçada portuguesa visível, atmosfera viva e "
        "comunitária. "
        f"{STYLE} Formato 4:3 horizontal."
    ),
}


async def gen_one(filename: str, prompt: str) -> None:
    print(f"[gen] {filename} ...", flush=True)
    chat = LlmChat(
        api_key=API_KEY,
        session_id=f"lusorae-pivot-{filename}",
        system_message="És um artista de poster urbano fanzine português.",
    )
    chat.with_model("gemini", "gemini-3.1-flash-image-preview").with_params(
        modalities=["image", "text"]
    )
    msg = UserMessage(text=prompt)
    _text, images = await chat.send_message_multimodal_response(msg)
    if not images:
        print(f"[fail] {filename}: no images returned", flush=True)
        return
    img = images[0]
    raw = base64.b64decode(img["data"])
    mime = img.get("mime_type", "image/png")
    out_path = OUT_DIR / filename
    if mime == "image/webp":
        out_path.write_bytes(raw)
    else:
        im = Image.open(BytesIO(raw))
        if im.mode != "RGB":
            im = im.convert("RGB")
        im.save(out_path, "WEBP", quality=85, method=6)
    print(f"[saved] {out_path} ({len(raw)//1024} KB · {mime})", flush=True)


async def main() -> None:
    if not API_KEY:
        raise RuntimeError("EMERGENT_LLM_KEY missing in /app/backend/.env")
    # Em paralelo — 2 imagens, tipicamente <60s total
    await asyncio.gather(*(gen_one(f, p) for f, p in PROMPTS.items()))
    print("[done]")


if __name__ == "__main__":
    asyncio.run(main())
