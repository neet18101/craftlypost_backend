from fastapi import APIRouter, Depends
from app.models.schemas import CreditsResponse, DeductCreditsRequest, DeductCreditsResponse
from app.services.supabase_service import get_supabase_service, SupabaseService

router = APIRouter(prefix="/credits", tags=["credits"])


@router.get(
    "",
    response_model=CreditsResponse,
    summary="Get User Credits",
    description="Get the current user's credit balance"
)
async def get_credits(
    supabase_service: SupabaseService = Depends(get_supabase_service)
):
    """
    Get user's remaining credits for text, image, and video generation.
    """
    credits = await supabase_service.get_user_credits("demo-user")
    return CreditsResponse(
        textCredits=credits.get("text_credits", 150),
        imageCredits=credits.get("image_credits", 25),
        videoCredits=credits.get("video_credits", 10),
        totalCredits=credits.get("text_credits", 150) + credits.get(
            "image_credits", 25) + credits.get("video_credits", 10),
        plan=credits.get("plan", "free")
    )


@router.post(
    "/deduct",
    response_model=DeductCreditsResponse,
    summary="Deduct Credits",
    description="Deduct credits after content generation"
)
async def deduct_credit(
    request: DeductCreditsRequest,
    supabase_service: SupabaseService = Depends(get_supabase_service)
):
    """
    Deduct credits from user's balance.

    - **creditType**: "text", "image", or "video"
    - **amount**: Number of credits to deduct (default: 1)
    """
    credit_map = {
        "text": "text_credits",
        "image": "image_credits",
        "video": "video_credits"
    }

    if request.creditType not in credit_map:
        return DeductCreditsResponse(
            success=False,
            creditsRemaining=0,
            message="Invalid credit type"
        )

    success = await supabase_service.deduct_credit("demo-user", credit_map[request.creditType])
    credits = await supabase_service.get_user_credits("demo-user")

    return DeductCreditsResponse(
        success=success,
        creditsRemaining=credits.get(credit_map[request.creditType], 0),
        message="Credits deducted successfully" if success else "Insufficient credits"
    )
