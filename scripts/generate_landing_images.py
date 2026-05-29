"""
Gera 5 imagens para a Landing usando Nano Banana (Gemini image gen).
Estilo: poster urbano fanzine PT — vermelho, dourado, verde, azul, cream.
"""
import asyncio
import base64
import os
from pathlib import Path
from dotenv import load_dotenv
from emergentintegrations.llm.chat import LlmChat, UserMessage

load_dotenv("/app/backend/.env")

API_KEY = os.getenv("EMERGENT_LLM_KEY")
OUT_DIR = Path("/app/frontend/public/hero")
OUT_DIR.mkdir(parents=True, exist_ok=True)

STYLE = (
    "Estilo: collage poster urbano fanzine português, ilustração editorial bold, "
    "paleta limitada vermelho carmim (#C8102E), dourado (#FFCC00), verde escuro (#046A38), "
    "azul cobalto (#0E4D92), creme amarelado (#FFF4DC), preto (#0A0A0A). "
    "Tipografia heavy sans-serif, textura risograph, grão granulado subtil, bordas grossas pretas, "
    "blocos de cor, sombras duras offset, sensação manual, sem texto sobreposto, sem letras, sem palavras. "
    "Composição limpa, alta legibilidade, fotografia ilustrada com tratamento poster."
)

PROMPTS = {
    "hero.webp": (
        "Vista vertical de uma rua portuguesa nos Santos Populares com bandeirinhas coloridas "
        "vermelhas, douradas, verdes e azuis a atravessar entre as fachadas de azulejos. "
        "Pessoas pequenas ao fundo a partilharem uma mesa. Atmosfera viva, festiva, comunitária. "
        f"{STYLE} Formato 11:10 wide, sem texto."
    ),
    "city-porto.webp": (
        "Vista do Douro com as casas coloridas da Ribeira do Porto e a ponte D. Luís ao fundo. "
        "Barco rabelo no rio. Luz dourada de fim de tarde. "
        f"{STYLE} Formato 3:4 vertical, sem texto."
    ),
    "city-lisboa.webp": (
        "Beco de Alfama em Lisboa com escadas de calçada portuguesa, varandas com roupa estendida, "
        "azulejos azuis nas paredes, eléctrico amarelo 28 a passar ao fundo. "
        f"{STYLE} Formato 3:4 vertical, sem texto."
    ),
    "city-algarve.webp": (
        "Praia rochosa do Algarve com falésias douradas, mar turquesa, "
        "barcos de pesca tradicionais coloridos na areia, sol pleno. "
        f"{STYLE} Formato 3:4 vertical, sem texto."
    ),
    "portugal-map.webp": (
        "Mapa estilizado de Portugal continental e ilhas (Madeira e Açores), silhueta simples "
        "com bordas grossas pretas. Cidades principais marcadas com pontos circulares vermelhos: "
        "Braga, Porto, Coimbra, Lisboa, Évora, Faro, Funchal, Ponta Delgada. "
        "Linhas pontilhadas a ligar cidades. Fundo creme. Pequenas estrelas douradas e doodles fanzine. "
        f"{STYLE} Formato 3:4 vertical, sem texto, sem nomes de cidades."
    ),
}


async def gen_one(filename: str, prompt: str) -> None:
    print(f"[gen] {filename} ...")
    chat = LlmChat(
        api_key=API_KEY,
        session_id=f"landing-{filename}",
        system_message="És um artista de poster urbano fanzine português.",
    )
    chat.with_model("gemini", "gemini-3.1-flash-image-preview").with_params(modalities=["image", "text"])

    msg = UserMessage(text=prompt)
    _text, images = await chat.send_message_multimodal_response(msg)

    if not images:
        print(f"[fail] {filename}: no images returned")
        return

    img = images[0]
    image_bytes = base64.b64decode(img["data"])
    # Note: returned bytes are PNG. We'll save the raw bytes with .webp extension only
    # if the mime is image/webp; otherwise convert via Pillow.
    mime = img.get("mime_type", "image/png")
    print(f"[ok] {filename} mime={mime} size={len(image_bytes)//1024}KB")

    out_path = OUT_DIR / filename
    if mime == "image/webp":
        out_path.write_bytes(image_bytes)
    else:
        # Convert PNG → WebP using Pillow
        from io import BytesIO
        from PIL import Image
        im = Image.open(BytesIO(image_bytes))
        if im.mode != "RGB":
            im = im.convert("RGB")
        im.save(out_path, "WEBP", quality=85, method=6)
    print(f"[saved] {out_path}")


async def main() -> None:
    if not API_KEY:
        raise RuntimeError("EMERGENT_LLM_KEY missing in /app/backend/.env")
    # Sequential to avoid rate limits
    for filename, prompt in PROMPTS.items():
        try:
            await gen_one(filename, prompt)
        except Exception as e:
            print(f"[error] {filename}: {e}")


if __name__ == "__main__":
    asyncio.run(main())
