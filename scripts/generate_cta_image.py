"""Gera 1 imagem de fundo para o CTA "Pronto para fazer parte da comunidade?"."""
import asyncio, base64, os
from pathlib import Path
from dotenv import load_dotenv
from emergentintegrations.llm.chat import LlmChat, UserMessage

load_dotenv("/app/backend/.env")
API_KEY = os.getenv("EMERGENT_LLM_KEY")
OUT = Path("/app/frontend/public/hero/cta-community.webp")

STYLE = (
    "Estilo: collage poster urbano fanzine português, ilustração editorial bold, "
    "paleta vermelho carmim (#C8102E), dourado (#FFCC00), preto (#0A0A0A), "
    "creme amarelado (#FFF4DC) como toques. Textura risograph, grão granulado, "
    "bordas grossas pretas, sombras duras offset. SEM TEXTO, SEM LETRAS, SEM PALAVRAS."
)

PROMPT = (
    "Cena ilustrada vista de cima de uma grande mesa comprida portuguesa em festa, com pessoas "
    "diversas (homens, mulheres, jovens, idosos) sentadas a partilhar comida, sardinhas, broa, "
    "vinho e pão. Mãos a brindar copos, conversas animadas. Bandeirinhas coloridas vermelhas e "
    "douradas em arco sobre a cena. Atmosfera de Santos Populares, união, comunidade lusófona. "
    "Composição horizontal, panorâmica. Tons predominantes vermelho carmim e dourado sobre fundo "
    "creme. Personagens ilustrados em silhuetas com formas bold, sem detalhe facial excessivo, "
    "para funcionar como FUNDO de uma secção web com texto branco e dourado sobreposto — "
    "deixar áreas de contraste suficiente. "
    f"{STYLE} Formato 21:9 widescreen panorâmico."
)


async def main() -> None:
    chat = LlmChat(api_key=API_KEY, session_id="cta-community", system_message="És um artista de poster urbano fanzine português.")
    chat.with_model("gemini", "gemini-3.1-flash-image-preview").with_params(modalities=["image", "text"])
    _text, images = await chat.send_message_multimodal_response(UserMessage(text=PROMPT))
    if not images:
        print("[fail] no images")
        return
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
