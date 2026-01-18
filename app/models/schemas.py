from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum


class Platform(str, Enum):
    INSTAGRAM = "instagram"
    LINKEDIN = "linkedin"
    TWITTER = "twitter"
    FACEBOOK = "facebook"
    TIKTOK = "tiktok"
    YOUTUBE = "youtube"


class Tone(str, Enum):
    PROFESSIONAL = "professional"
    CASUAL = "casual"
    HUMOROUS = "humorous"
    INSPIRATIONAL = "inspirational"
    EDUCATIONAL = "educational"
    PROMOTIONAL = "promotional"


class Goal(str, Enum):
    ENGAGEMENT = "engagement"
    AWARENESS = "awareness"
    CONVERSION = "conversion"
    TRAFFIC = "traffic"
    EDUCATION = "education"
    ENTERTAINMENT = "entertainment"


# ============================================
# TEXT POST GENERATION
# ============================================
class TextPostRequest(BaseModel):
    topic: str = Field(..., min_length=3, max_length=500,
                       description="Topic/idea for the post")
    platform: Platform
    tone: Tone
    goal: Goal
    includeHashtags: bool = True
    includeCTA: bool = True
    includeEmojis: bool = True

    class Config:
        json_schema_extra = {
            "example": {
                "topic": "Summer sale announcement",
                "platform": "instagram",
                "tone": "promotional",
                "goal": "conversion",
                "includeHashtags": True,
                "includeCTA": True,
                "includeEmojis": True
            }
        }


class ContentStats(BaseModel):
    characters: int
    words: int
    readTime: str
    engagementScore: str


class TextPostResponse(BaseModel):
    success: bool = True
    caption: str
    hashtags: List[str]
    cta: str
    stats: ContentStats
    creditsUsed: int = 1
    creditsRemaining: int


# ============================================
# IMAGE POST GENERATION
# ============================================
class ImagePostRequest(BaseModel):
    topic: str = Field(..., min_length=3, max_length=500)
    platform: Platform
    tone: Tone
    goal: Goal
    includeHashtags: bool = True
    includeCTA: bool = True
    includeEmojis: bool = True


class ImagePostResponse(BaseModel):
    success: bool = True
    caption: str
    hashtags: List[str]
    cta: str
    imagePrompt: str  # AI-generated prompt for image creation
    stats: ContentStats
    creditsUsed: int = 2
    creditsRemaining: int


# ============================================
# VIDEO SCRIPT GENERATION
# ============================================
class VideoScriptRequest(BaseModel):
    topic: str = Field(..., min_length=3, max_length=500)
    platform: Platform
    tone: Tone
    goal: Goal
    duration: str = "30s"  # 15s, 30s, 60s


class VideoScriptResponse(BaseModel):
    success: bool = True
    hook: str
    script: str
    cta: str
    hashtags: List[str]
    stats: ContentStats
    creditsUsed: int = 3
    creditsRemaining: int


# ============================================
# CREDITS
# ============================================
class CreditsResponse(BaseModel):
    textCredits: int
    imageCredits: int
    videoCredits: int
    totalCredits: int
    plan: str = "free"


class DeductCreditsRequest(BaseModel):
    creditType: str  # "text", "image", "video"
    amount: int = 1


class DeductCreditsResponse(BaseModel):
    success: bool
    creditsRemaining: int
    message: str


# ============================================
# ERROR RESPONSE
# ============================================
class ErrorResponse(BaseModel):
    success: bool = False
    error: str
    code: Optional[str] = None


# ============================================
# CONTENT HISTORY
# ============================================
class SaveContentRequest(BaseModel):
    contentType: str  # "text", "image", "video", "ugc"
    platform: str
    topic: str
    tone: str
    goal: str
    caption: str
    hashtags: Optional[List[str]] = []
    cta: Optional[str] = ""
    stats: ContentStats


class SaveContentResponse(BaseModel):
    success: bool = True
    id: str
    message: str = "Content saved to history successfully"


class ContentHistoryItem(BaseModel):
    id: str
    contentType: str
    platform: str
    topic: str
    caption: str
    hashtags: List[str]
    cta: str
    createdAt: str


class ContentHistoryResponse(BaseModel):
    items: List[ContentHistoryItem]
