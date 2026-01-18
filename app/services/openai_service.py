from openai import OpenAI
from google import genai
from google.genai import types
from groq import Groq
from app.config import get_settings
from app.models.schemas import (
    TextPostRequest, TextPostResponse,
    ImagePostRequest, ImagePostResponse,
    VideoScriptRequest, VideoScriptResponse,
    ContentStats
)
import json
import asyncio


class OpenAIService:
    def __init__(self):
        settings = get_settings()
        self.openai_client = None
        self.gemini_client = None
        self.groq_client = None

        # Try OpenAI first
        if settings.openai_api_key:
            try:
                self.openai_client = OpenAI(api_key=settings.openai_api_key)
                print("OpenAI client initialized")
            except Exception as e:
                print(f"OpenAI init failed: {e}")

        # Setup Gemini
        if settings.google_api_key:
            try:
                self.gemini_client = genai.Client(
                    api_key=settings.google_api_key)
                print("Gemini client initialized")
            except Exception as e:
                print(f"Gemini init failed: {e}")

        # Setup Groq as final fallback
        if settings.groq_api_key:
            try:
                self.groq_client = Groq(api_key=settings.groq_api_key)
                print("Groq client initialized")
            except Exception as e:
                print(f"Groq init failed: {e}")

    def _get_platform_context(self, platform: str) -> dict:
        """Get platform-specific limits and best practices."""
        platforms = {
            "instagram": {
                "char_limit": 2200,
                "hashtag_limit": 30,
                "best_practices": "Use emojis, line breaks, and storytelling. End with a CTA."
            },
            "linkedin": {
                "char_limit": 3000,
                "hashtag_limit": 5,
                "best_practices": "Professional tone, use bullet points, share insights and value."
            },
            "twitter": {
                "char_limit": 280,
                "hashtag_limit": 3,
                "best_practices": "Be concise, use hooks, create threads for longer content."
            },
            "facebook": {
                "char_limit": 63206,
                "hashtag_limit": 10,
                "best_practices": "Tell stories, ask questions, encourage engagement."
            },
            "tiktok": {
                "char_limit": 2200,
                "hashtag_limit": 10,
                "best_practices": "Trendy, casual, use popular hashtags and hooks."
            },
            "youtube": {
                "char_limit": 5000,
                "hashtag_limit": 15,
                "best_practices": "SEO-optimized descriptions, include timestamps and links."
            }
        }
        return platforms.get(platform, platforms["instagram"])

    async def _generate_with_openai(self, system_prompt: str, user_prompt: str) -> dict:
        """Generate content using OpenAI."""
        response = await asyncio.to_thread(
            self.openai_client.chat.completions.create,
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.8,
            max_tokens=1000,
            response_format={"type": "json_object"}
        )
        return json.loads(response.choices[0].message.content)

    async def _generate_with_gemini(self, system_prompt: str, user_prompt: str) -> dict:
        """Generate content using Google Gemini SDK."""
        full_prompt = f"{system_prompt}\n\n{user_prompt}"

        response = await asyncio.to_thread(
            self.gemini_client.models.generate_content,
            model="gemini-2.0-flash",
            contents=full_prompt,
            config=types.GenerateContentConfig(
                temperature=0.8,
                max_output_tokens=1000,
                response_mime_type="application/json"
            )
        )

        text = response.text.strip()
        return self._clean_json_response(text)

    async def _generate_with_groq(self, system_prompt: str, user_prompt: str) -> dict:
        """Generate content using Groq (Llama 3.1)."""
        full_system = system_prompt + \
            "\n\nIMPORTANT: Respond ONLY with valid JSON. No markdown, no code blocks, no extra text."

        response = await asyncio.to_thread(
            self.groq_client.chat.completions.create,
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": full_system},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.8,
            max_tokens=1024,
            response_format={"type": "json_object"}
        )

        text = response.choices[0].message.content.strip()
        return self._clean_json_response(text)

    def _clean_json_response(self, text: str) -> dict:
        """Clean and parse JSON response."""
        # Remove markdown code blocks if present
        if text.startswith("```json"):
            text = text[7:]
        if text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        return json.loads(text.strip())

    async def _generate_content(self, system_prompt: str, user_prompt: str) -> dict:
        """Try OpenAI → Gemini → Groq with fallback."""

        # Try OpenAI first
        if self.openai_client:
            try:
                print("Trying OpenAI...")
                return await self._generate_with_openai(system_prompt, user_prompt)
            except Exception as e:
                print(f"OpenAI failed: {e}")

        # Fallback to Gemini
        if self.gemini_client:
            for attempt in range(2):
                try:
                    print(f"Using Gemini (attempt {attempt + 1}/2)...")
                    if attempt > 0:
                        await asyncio.sleep(2)
                    return await self._generate_with_gemini(system_prompt, user_prompt)
                except Exception as e:
                    print(f"Gemini attempt {attempt + 1} failed: {e}")

        # Final fallback to Groq
        if self.groq_client:
            for attempt in range(2):
                try:
                    print(f"Using Groq (attempt {attempt + 1}/2)...")
                    if attempt > 0:
                        await asyncio.sleep(2)
                    return await self._generate_with_groq(system_prompt, user_prompt)
                except Exception as e:
                    print(f"Groq attempt {attempt + 1} failed: {e}")
                    if attempt == 1:
                        raise Exception(
                            f"All AI providers failed. Last error: {e}")

        raise Exception(
            "No AI provider available. Configure OpenAI, Google, or Groq API key.")

    async def generate_text_post(self, request: TextPostRequest) -> TextPostResponse:
        """Generate text post content."""

        platform_ctx = self._get_platform_context(request.platform.value)

        system_prompt = f"""You are an expert social media content creator.
Create engaging content for {request.platform.value}.

Platform Guidelines:
- Character limit: {platform_ctx['char_limit']}
- Hashtag limit: {platform_ctx['hashtag_limit']}
- Best practices: {platform_ctx['best_practices']}

Content Requirements:
- Tone: {request.tone.value}
- Goal: {request.goal.value}
- Include emojis: {request.includeEmojis}
- Generate hashtags: {request.includeHashtags}
- Include CTA: {request.includeCTA}

Respond with valid JSON:
{{
    "caption": "The main caption text",
    "hashtags": ["#hashtag1", "#hashtag2"],
    "cta": "Call to action text"
}}"""

        user_prompt = f"""Create a {request.tone.value} social media post for {request.platform.value} about:

{request.topic}

Goal: {request.goal.value}. Make it engaging and optimized for the platform."""

        result = await self._generate_content(system_prompt, user_prompt)

        caption = result.get("caption", "")
        words = len(caption.split())

        return TextPostResponse(
            success=True,
            caption=caption,
            hashtags=result.get(
                "hashtags", []) if request.includeHashtags else [],
            cta=result.get("cta", "") if request.includeCTA else "",
            stats=ContentStats(
                characters=len(caption),
                words=words,
                readTime=f"{max(1, words // 3)} sec",
                engagementScore="High" if len(
                    result.get("hashtags", [])) >= 5 else "Medium"
            ),
            creditsUsed=1,
            creditsRemaining=149
        )

    async def generate_image_post(self, request: ImagePostRequest) -> ImagePostResponse:
        """Generate image post with caption and image prompt."""

        system_prompt = f"""You are an expert social media content creator.
Create engaging content for {request.platform.value} with an image.

Respond with valid JSON:
{{
    "caption": "The caption text",
    "hashtags": ["#hashtag1", "#hashtag2"],
    "cta": "Call to action",
    "imagePrompt": "Detailed prompt for AI image generation"
}}"""

        user_prompt = f"""Create a {request.tone.value} image post for {request.platform.value} about:

{request.topic}

Goal: {request.goal.value}. Include a detailed image generation prompt."""

        result = await self._generate_content(system_prompt, user_prompt)

        caption = result.get("caption", "")
        words = len(caption.split())

        return ImagePostResponse(
            success=True,
            caption=caption,
            hashtags=result.get("hashtags", []),
            cta=result.get("cta", ""),
            imagePrompt=result.get("imagePrompt", ""),
            stats=ContentStats(
                characters=len(caption),
                words=words,
                readTime=f"{max(1, words // 3)} sec",
                engagementScore="High"
            ),
            creditsUsed=2,
            creditsRemaining=23
        )

    async def generate_video_script(self, request: VideoScriptRequest) -> VideoScriptResponse:
        """Generate video script."""

        system_prompt = f"""You are an expert video content creator.
Create a {request.duration} video script for {request.platform.value}.

Respond with valid JSON:
{{
    "hook": "Attention-grabbing opening line",
    "script": "Main video script content",
    "cta": "Call to action at the end",
    "hashtags": ["#hashtag1", "#hashtag2"]
}}"""

        user_prompt = f"""Create a {request.tone.value} video script for {request.platform.value} about:

{request.topic}

Duration: {request.duration}
Goal: {request.goal.value}"""

        result = await self._generate_content(system_prompt, user_prompt)

        script = result.get("script", "")
        words = len(script.split())

        return VideoScriptResponse(
            success=True,
            hook=result.get("hook", ""),
            script=script,
            cta=result.get("cta", ""),
            hashtags=result.get("hashtags", []),
            stats=ContentStats(
                characters=len(script),
                words=words,
                readTime=f"{max(1, words // 3)} sec",
                engagementScore="High"
            ),
            creditsUsed=3,
            creditsRemaining=7
        )


# Singleton instance
_openai_service = None


def get_openai_service() -> OpenAIService:
    global _openai_service
    if _openai_service is None:
        _openai_service = OpenAIService()
    return _openai_service
