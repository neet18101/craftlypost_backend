from supabase import create_client, Client
from app.config import get_settings


class SupabaseService:
    def __init__(self):
        settings = get_settings()
        if settings.supabase_url and settings.supabase_key:
            self.client: Client = create_client(
                settings.supabase_url,
                settings.supabase_key
            )
        else:
            self.client = None

    def is_configured(self) -> bool:
        """Check if Supabase is properly configured."""
        return self.client is not None

    async def get_user_credits(self, user_id: str) -> dict:
        """Get user's remaining credits from Supabase."""
        if not self.is_configured():
            # Return default credits if Supabase not configured
            return {"text": 150, "image": 25, "video": 10, "total": 185}

        try:
            response = self.client.table("user_credits").select(
                "*").eq("user_id", user_id).single().execute()
            if response.data:
                return response.data
            else:
                # Create default credits for new user
                default_credits = {
                    "user_id": user_id,
                    "text": 150,
                    "image": 25,
                    "video": 10
                }
                self.client.table("user_credits").insert(
                    default_credits).execute()
                return {**default_credits, "total": 185}
        except Exception as e:
            print(f"Supabase error: {e}")
            return {"text": 150, "image": 25, "video": 10, "total": 185}

    async def deduct_credit(self, user_id: str, credit_type: str) -> bool:
        """Deduct a credit from user's balance."""
        if not self.is_configured():
            return True  # Skip credit deduction if not configured

        try:
            # Get current credits
            response = self.client.table("user_credits").select(
                credit_type).eq("user_id", user_id).single().execute()

            if response.data and response.data.get(credit_type, 0) > 0:
                new_value = response.data[credit_type] - 1
                self.client.table("user_credits").update(
                    {credit_type: new_value}).eq("user_id", user_id).execute()
                return True
            return False
        except Exception as e:
            print(f"Supabase error: {e}")
            return True  # Allow operation to continue

    async def save_generated_content(self, user_id: str, content: dict) -> bool:
        """Save generated content to history."""
        if not self.is_configured():
            return True

        try:
            self.client.table("content_history").insert({
                "user_id": user_id,
                "platform": content.get("platform"),
                "content_type": content.get("content_type"),
                "caption": content.get("caption"),
                "hashtags": content.get("hashtags"),
                "cta": content.get("cta")
            }).execute()
            return True
        except Exception as e:
            print(f"Supabase error: {e}")
            return False


# Singleton instance
_supabase_service = None


def get_supabase_service() -> SupabaseService:
    global _supabase_service
    if _supabase_service is None:
        _supabase_service = SupabaseService()
    return _supabase_service
