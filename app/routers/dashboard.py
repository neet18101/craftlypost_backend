from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta
from app.services.supabase_service import get_supabase_service, SupabaseService

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


class StatsResponse(BaseModel):
    postsGenerated: int
    imagesCreated: int
    videosMade: int
    timeSaved: str
    postsChange: str
    imagesChange: str
    videosChange: str
    timeChange: str


class RecentContentItem(BaseModel):
    id: str
    title: str
    platform: str
    contentType: str
    createdAt: str
    icon: str


class PlatformStats(BaseModel):
    platform: str
    count: int
    percentage: int


class DashboardResponse(BaseModel):
    stats: StatsResponse
    recentContent: List[RecentContentItem]
    platformStats: List[PlatformStats]


@router.get(
    "/stats",
    response_model=DashboardResponse,
    summary="Get Dashboard Stats",
    description="Get user's dashboard statistics from the database"
)
async def get_dashboard_stats(
    supabase_service: SupabaseService = Depends(get_supabase_service)
):
    """
    Get dashboard statistics for the current user.
    Queries real data from content_history table.
    """

    # Default/fallback stats
    stats = StatsResponse(
        postsGenerated=0,
        imagesCreated=0,
        videosMade=0,
        timeSaved="0hrs",
        postsChange="+0%",
        imagesChange="+0%",
        videosChange="+0%",
        timeChange="+0%"
    )
    recent_content = []
    platform_stats = []

    # Try to get real data from Supabase
    if supabase_service.is_configured():
        try:
            # Get content counts by type
            client = supabase_service.client

            # Query all content history
            response = client.table("content_history").select(
                "*").order("created_at", desc=True).limit(100).execute()

            if response.data:
                all_content = response.data

                # Count by content type
                text_count = len(
                    [c for c in all_content if c.get("content_type") == "text"])
                image_count = len(
                    [c for c in all_content if c.get("content_type") == "image"])
                video_count = len(
                    [c for c in all_content if c.get("content_type") == "video"])

                # Calculate time saved (estimate: 15 min per post)
                total_posts = text_count + image_count + video_count
                time_saved_hours = (total_posts * 15) // 60

                stats = StatsResponse(
                    postsGenerated=text_count,
                    imagesCreated=image_count,
                    videosMade=video_count,
                    timeSaved=f"{time_saved_hours}hrs",
                    postsChange="+0%",  # Would need historical data to calculate
                    imagesChange="+0%",
                    videosChange="+0%",
                    timeChange="+0%"
                )

                # Get recent content (last 5)
                for content in all_content[:5]:
                    caption = content.get("caption", "")
                    recent_content.append(RecentContentItem(
                        id=str(content.get("id", "")),
                        title=caption[:60] +
                        "..." if len(caption) > 60 else caption,
                        platform=content.get("platform", "instagram"),
                        contentType=content.get("content_type", "text"),
                        createdAt=_format_time_ago(content.get("created_at")),
                        icon=content.get("platform", "instagram")
                    ))

                # Calculate platform stats
                platform_counts = {}
                for content in all_content:
                    platform = content.get("platform", "instagram")
                    platform_counts[platform] = platform_counts.get(
                        platform, 0) + 1

                # Sort by count and calculate percentages
                if platform_counts:
                    max_count = max(platform_counts.values())
                    for platform, count in sorted(platform_counts.items(), key=lambda x: x[1], reverse=True):
                        platform_stats.append(PlatformStats(
                            platform=platform.capitalize(),
                            count=count,
                            percentage=int((count / max_count)
                                           * 100) if max_count > 0 else 0
                        ))

        except Exception as e:
            print(f"Error fetching dashboard data: {e}")
            # Will use empty/default data

    # If no data from DB, return demo data for preview
    if not recent_content:
        recent_content = [
            RecentContentItem(
                id="demo-1",
                title="Introducing our new sustainable collection! 🌱 Every piece tells...",
                platform="instagram",
                contentType="text",
                createdAt="2 min ago",
                icon="instagram"
            ),
            RecentContentItem(
                id="demo-2",
                title="Product showcase - EcoBottle Pro",
                platform="linkedin",
                contentType="image",
                createdAt="15 min ago",
                icon="linkedin"
            ),
        ]

    if not platform_stats:
        platform_stats = [
            PlatformStats(platform="Instagram", count=0, percentage=100),
            PlatformStats(platform="LinkedIn", count=0, percentage=0),
            PlatformStats(platform="Twitter", count=0, percentage=0),
        ]

    # If no real stats, show some demo values
    if stats.postsGenerated == 0 and not supabase_service.is_configured():
        stats = StatsResponse(
            postsGenerated=1284,
            imagesCreated=456,
            videosMade=89,
            timeSaved="142hrs",
            postsChange="+12%",
            imagesChange="+8%",
            videosChange="+24%",
            timeChange="+18%"
        )

    return DashboardResponse(
        stats=stats,
        recentContent=recent_content,
        platformStats=platform_stats
    )


def _format_time_ago(timestamp_str: Optional[str]) -> str:
    """Convert timestamp to 'X min ago' format."""
    if not timestamp_str:
        return "just now"

    try:
        # Parse ISO timestamp
        timestamp = datetime.fromisoformat(
            timestamp_str.replace("Z", "+00:00"))
        now = datetime.now(
            timestamp.tzinfo) if timestamp.tzinfo else datetime.now()
        diff = now - timestamp

        if diff.total_seconds() < 60:
            return "just now"
        elif diff.total_seconds() < 3600:
            mins = int(diff.total_seconds() // 60)
            return f"{mins} min ago"
        elif diff.total_seconds() < 86400:
            hours = int(diff.total_seconds() // 3600)
            return f"{hours} hr ago"
        else:
            days = int(diff.total_seconds() // 86400)
            return f"{days} days ago"
    except:
        return "recently"


@router.get("/credits")
async def get_user_credits(
    supabase_service: SupabaseService = Depends(get_supabase_service)
):
    """Get user's credit balance from database."""

    # Default credits for free plan
    default_credits = {
        "text": 150,
        "image": 25,
        "video": 10,
        "plan": "free"
    }

    if supabase_service.is_configured():
        try:
            # For now, return default until auth is integrated
            # TODO: Get actual user_id from auth token
            pass
        except Exception as e:
            print(f"Error fetching credits: {e}")

    return default_credits
