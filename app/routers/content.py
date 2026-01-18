from fastapi import APIRouter, HTTPException, Depends
from app.models.schemas import (
    TextPostRequest, TextPostResponse,
    ImagePostRequest, ImagePostResponse,
    VideoScriptRequest, VideoScriptResponse,
    ErrorResponse, ContentStats, SaveContentRequest
)
from app.services.openai_service import get_openai_service, OpenAIService
from app.services.supabase_service import get_supabase_service, SupabaseService

router = APIRouter(prefix="/content", tags=["content"])


async def save_content_to_db(
    supabase_service: SupabaseService,
    platform: str,
    content_type: str,
    topic: str,
    tone: str,
    goal: str,
    caption: str,
    hashtags: list,
    cta: str
):
    """Save generated content to database for history tracking."""
    if supabase_service.is_configured():
        try:
            supabase_service.client.table("content_history").insert({
                "platform": platform,
                "content_type": content_type,
                "topic": topic,
                "tone": tone,
                "goal": goal,
                "caption": caption,
                "hashtags": hashtags,
                "cta": cta
            }).execute()
            print(f"Content saved to database: {content_type} for {platform}")
        except Exception as e:
            print(f"Failed to save content to DB: {e}")


@router.post(
    "/text",
    response_model=TextPostResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid request"},
        402: {"model": ErrorResponse, "description": "Insufficient credits"},
        500: {"model": ErrorResponse, "description": "Generation failed"}
    },
    summary="Generate Text Post",
    description="Generate AI-powered text post content. Costs 1 text credit."
)
async def generate_text_post(
    request: TextPostRequest,
    openai_service: OpenAIService = Depends(get_openai_service),
    supabase_service: SupabaseService = Depends(get_supabase_service)
):
    """
    Generate a text post for social media.

    - **topic**: What the post is about (3-500 chars)
    - **platform**: Target platform (instagram, linkedin, twitter, etc.)
    - **tone**: Voice of the content (professional, casual, humorous, etc.)
    - **goal**: Primary goal (engagement, awareness, conversion, etc.)
    - **includeHashtags**: Whether to generate hashtags
    - **includeCTA**: Whether to include a call-to-action
    - **includeEmojis**: Whether to use emojis

    **Cost: 1 text credit**
    """
    try:
        result = await openai_service.generate_text_post(request)

        # Save to database
        await save_content_to_db(
            supabase_service,
            platform=request.platform.value,
            content_type="text",
            topic=request.topic,
            tone=request.tone.value,
            goal=request.goal.value,
            caption=result.caption,
            hashtags=result.hashtags,
            cta=result.cta
        )

        return result
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={"success": False, "error": str(e)}
        )


@router.post(
    "/image",
    response_model=ImagePostResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid request"},
        402: {"model": ErrorResponse, "description": "Insufficient credits"},
        500: {"model": ErrorResponse, "description": "Generation failed"}
    },
    summary="Generate Image Post",
    description="Generate AI-powered image post content with caption and image prompt. Costs 2 image credits."
)
async def generate_image_post(
    request: ImagePostRequest,
    openai_service: OpenAIService = Depends(get_openai_service),
    supabase_service: SupabaseService = Depends(get_supabase_service)
):
    """
    Generate an image post with caption and AI image generation prompt.

    **Cost: 2 image credits**
    """
    try:
        result = await openai_service.generate_image_post(request)

        # Save to database
        await save_content_to_db(
            supabase_service,
            platform=request.platform.value,
            content_type="image",
            topic=request.topic,
            tone=request.tone.value,
            goal=request.goal.value,
            caption=result.caption,
            hashtags=result.hashtags,
            cta=result.cta
        )

        return result
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={"success": False, "error": str(e)}
        )


@router.post(
    "/video",
    response_model=VideoScriptResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid request"},
        402: {"model": ErrorResponse, "description": "Insufficient credits"},
        500: {"model": ErrorResponse, "description": "Generation failed"}
    },
    summary="Generate Video Script",
    description="Generate AI-powered video script with hook, content, and CTA. Costs 3 video credits."
)
async def generate_video_script(
    request: VideoScriptRequest,
    openai_service: OpenAIService = Depends(get_openai_service),
    supabase_service: SupabaseService = Depends(get_supabase_service)
):
    """
    Generate a video script with hook, main content, and call-to-action.

    **Cost: 3 video credits**
    """
    try:
        result = await openai_service.generate_video_script(request)

        # Save to database
        await save_content_to_db(
            supabase_service,
            platform=request.platform.value,
            content_type="video",
            topic=request.topic,
            tone=request.tone.value,
            goal=request.goal.value,
            caption=result.script,  # Use script as caption for video
            hashtags=result.hashtags,
            cta=result.cta
        )

        return result
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={"success": False, "error": str(e)}
        )


@router.post(
    "/history",
    summary="Save Content to History",
    description="Manually save generated content to history"
)
async def save_to_history(
    request: SaveContentRequest,
    supabase_service: SupabaseService = Depends(get_supabase_service)
):
    """
    Manually save generated content to history.
    This allows users to save content after generation.
    """
    try:
        if not supabase_service.is_configured():
            raise HTTPException(
                status_code=503,
                detail={"success": False,
                        "error": "Database service not configured"}
            )

        # TODO: Get actual user_id from authentication middleware/token
        # For now, using a hardcoded user_id. You need to either:
        # 1. Create a user in Supabase Auth with this ID, OR
        # 2. Replace this with an actual user ID from your Supabase Auth
        # 3. Implement proper authentication to get the logged-in user's ID
        user_id = "00000000-0000-0000-0000-000000000000"

        # Save to database
        result = supabase_service.client.table("content_history").insert({
            "user_id": user_id,  # Required field with FK constraint
            "platform": request.platform,
            "content_type": request.contentType,
            "topic": request.topic,
            "tone": request.tone,
            "goal": request.goal,
            "caption": request.caption,
            "hashtags": request.hashtags or [],
            "cta": request.cta or ""
        }).execute()

        # Get the inserted record ID
        if result.data and len(result.data) > 0:
            record_id = result.data[0].get('id', 'unknown')
        else:
            record_id = 'unknown'

        return {
            "success": True,
            "id": str(record_id),
            "message": "Content saved to history successfully"
        }
    except Exception as e:
        print(f"Failed to save content to history: {e}")
        raise HTTPException(
            status_code=500,
            detail={"success": False, "error": str(e)}
        )


@router.get(
    "/history",
    summary="Get Content History",
    description="Retrieve all saved content from history"
)
async def get_content_history(
    supabase_service: SupabaseService = Depends(get_supabase_service)
):
    """
    Retrieve all saved content from history.
    Returns a list of previously generated and saved content.
    """
    try:
        if not supabase_service.is_configured():
            return {"items": []}

        # Fetch from database
        result = supabase_service.client.table("content_history") \
            .select("*") \
            .order("created_at", desc=True) \
            .limit(50) \
            .execute()

        items = []
        if result.data:
            for item in result.data:
                items.append({
                    "id": str(item.get('id', '')),
                    "contentType": item.get('content_type', ''),
                    "platform": item.get('platform', ''),
                    "topic": item.get('topic', ''),
                    "caption": item.get('caption', ''),
                    "hashtags": item.get('hashtags', []),
                    "cta": item.get('cta', ''),
                    "createdAt": item.get('created_at', '')
                })

        return {"items": items}
    except Exception as e:
        print(f"Failed to fetch content history: {e}")
        return {"items": []}
