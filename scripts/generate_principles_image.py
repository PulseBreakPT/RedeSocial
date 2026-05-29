"""Gera imagem de fundo para o bloco preto 'FEITO PARA PESSOAS · NÃO PARA ALGORITMOS'."""
import asyncio, base64, os
from pathlib import Path
from dotenv import load_dotenv
from emergentintegrations.llm.chat import LlmChat, UserMessage

load_dotenv("/app/backend/.env")
API_KEY = os.getenv("EMERGENT_LLM_KEY")
OUT = Path("/app/frontend/public/hero/principles-bg.webp")

PROMPT = (
    "Ilustração linha fina dourada (#FFCC00) sobre fundo PRETO TOTAL (#0A0A0A). "
    "Composição: silhuetas de pessoas a conversar em círculos, mãos a apontar, balões de fala "
    "abstratos vazios, asteriscos, pequenas estrelas, conexões geométricas a unir as pessoas — "
    "tudo desenhado em traço fino dourado contínuo, estilo line-art mono-cromático. "
    "Sem preenchimentos, só linhas. Atmosfera de rede humana, conversa real, anti-algoritmo. "
    "Composição horizontal panorâmica wide. Estilo fanzine português editorial, traço expressivo "
    "manual. SEM TEXTO, SEM LETRAS, SEM PALAVRAS. Formato 21:9 widescreen. "
    "Fundo deve ser preto puro absoluto para se misturar com a secção web."
)


async def main() -> None:
    chat = LlmChat(api_key=API_KEY, session_id="principles-bg", system_message="És um artista de poster urbano fanzine português.")
    chat.with_model("gemini", "gemini-3.1-flash-image-preview").with_params(modalities=["image", "text"])
    _t, images = await chat.send_message_multimodal_response(UserMessage(text=PROMPT))
    if not images:
        print("[fail] no images"); return
    img = images[0]
    image_bytes = base64.b64decode(img["data"])
    mime = img.get("mime_type", "image/png")
    print(f"[ok] mime={mime} size={len(image_bytes)//1024}KB")
    if mime == "image/webp":
        OUT.write_bytes(image_bytes)
    else:
        from io import BytesIO
        from PIL import Image
        im = Image.open(BytesIO(image_bytes))
        if im.mode != "RGB":
            im = im.convert("RGB")
        im.save(OUT, "WEBP", quality=82, method=6)
    print(f"[saved] {OUT}")


if __name__ == "__main__":
    asyncio.run(main())
