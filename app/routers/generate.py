from fastapi import APIRouter, HTTPException, Depends
from app.models.schemas import GenerateRequest, GenerateResponse, ErrorResponse
from app.services.openai_service import get_openai_service, OpenAIService

router = APIRouter(prefix="/api/generate", tags=["generate"])


@router.post(
    "/content",
    response_model=GenerateResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid request"},
        500: {"model": ErrorResponse, "description": "Generation failed"}
    }
)
async def generate_content(
    request: GenerateRequest,
    openai_service: OpenAIService = Depends(get_openai_service)
):
    """
    Generate AI-powered social media content.

    - **content_type**: Type of content to generate (text, image, ugc, video)
    - **platform**: Target social media platform
    - **topic**: Description of what the post should be about (10-500 chars)
    - **tone**: The tone/voice of the content
    - **goal**: The primary goal of the content
    - **options**: Additional options (hashtags, cta, emojis)
    """
    try:
        result = await openai_service.generate_content(request)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate content: {str(e)}"
        )


@router.post("/regenerate")
async def regenerate_content(
    request: GenerateRequest,
    openai_service: OpenAIService = Depends(get_openai_service)
):
    """Regenerate content with the same parameters."""
    try:
        result = await openai_service.generate_content(request)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to regenerate content: {str(e)}"
        )
