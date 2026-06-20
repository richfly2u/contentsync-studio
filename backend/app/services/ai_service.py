import os
from openai import AsyncOpenAI
from app.core.config import settings

client = AsyncOpenAI(api_key=settings.openai_api_key)


class AIService:
    @staticmethod
    async def extract_audio(video_path: str) -> str:
        import ffmpeg
        audio_path = video_path + ".mp3"
        (
            ffmpeg.input(video_path)
            .output(audio_path, format="mp3", acodec="libmp3lame", ac=1, ar="16000")
            .overwrite_output()
            .run(quiet=True)
        )
        return audio_path

    @staticmethod
    async def transcribe(audio_path: str) -> dict:
        with open(audio_path, "rb") as f:
            response = await client.audio.transcriptions.create(
                model="whisper-1",
                file=f,
                response_format="verbose_json",
            )
        return {
            "text": response.text,
            "language": getattr(response, "language", "zh"),
            "duration": getattr(response, "duration", 0),
        }

    @staticmethod
    async def clean_transcript(text: str, lang: str = "zh") -> str:
        prompt = {
            "zh": "你是一個專業的文稿編輯。移除以下文字中的口頭禪、重複詞、filler words（如：嗯、啊、那個、就是說、然後）。保持原意，不要改寫內容。只輸出乾淨的文字。",
            "en": "You are a professional transcript editor. Remove filler words (um, uh, like, you know, actually). Keep the original meaning. Output only the cleaned text.",
        }
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": prompt.get(lang, prompt["zh"])},
                {"role": "user", "content": text},
            ],
            temperature=0.3,
            max_tokens=4000,
        )
        return response.choices[0].message.content or text

    @staticmethod
    async def optimize_text(text: str, lang: str = "zh") -> str:
        prompt = {
            "zh": "請優化以下文稿，讓文字更流暢易讀。分段輸出，每段不超過3句話。保持說話者的個人風格。不要使用 markdown 格式。",
            "en": "Please polish the following transcript. Make it fluent and readable. Break into paragraphs of max 3 sentences each. Keep the speaker's voice. No markdown.",
        }
        response = await client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": prompt.get(lang, prompt["zh"])},
                {"role": "user", "content": text},
            ],
            temperature=0.5,
            max_tokens=4000,
        )
        return response.choices[0].message.content or text

    @staticmethod
    async def generate_summary(text: str, lang: str = "zh", length: str = "short") -> str:
        length_map = {
            "short": "15-30字的一句話摘要",
            "medium": "50-100字的段落摘要",
            "bullets": "5-10個重點列表",
        }
        prompt_t = length_map.get(length, length_map["short"])
        prompt_zh = f"為以下文字生成{prompt_t}。直接輸出內容，不要說明。"
        prompt_en = f"Generate a {prompt_t} for the following text. Output directly, no explanations."
        response = await client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": prompt_zh if lang == "zh" else prompt_en},
                {"role": "user", "content": text},
            ],
            temperature=0.3,
            max_tokens=1000,
        )
        return response.choices[0].message.content or text
