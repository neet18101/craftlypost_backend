import express from 'express';
import 'express-async-errors';
import { getSupabaseService } from '../services/supabaseService.js';
import { authenticateUser } from '../middleware/auth.js';

const router = express.Router();

// Apply auth middleware to dashboard routes
router.use(authenticateUser);

// GET /dashboard/stats - Get comprehensive dashboard statistics
router.get('/stats', async (req, res) => {
    try {
        const supabaseService = getSupabaseService();
        
        // Default response if Supabase not configured
        if (!supabaseService.isConfigured()) {
            return res.json({
                stats: {
                    postsGenerated: 0,
                    imagesCreated: 0,
                    videosMade: 0,
                    timeSaved: '0hrs',
                    postsChange: '+0%',
                    imagesChange: '+0%',
                    videosChange: '+0%',
                    timeChange: '+0%'
                },
                recentContent: [],
                platformStats: []
            });
        }

        // Get user ID from authenticated request (null for anonymous)
        const userId = req.user?.id || null;

        // Fetch content history for the user
        let query = supabaseService.client
            .from('content_history')
            .select('*')
            .order('created_at', { ascending: false });

        // Filter by user if authenticated
        if (userId) {
            query = query.eq('user_id', userId);
        }

        const { data: allContent, error } = await query;

        if (error) {
            console.error(`Dashboard query error: ${error.message}`);
            throw error;
        }

        // Calculate statistics
        const totalPosts = allContent?.length || 0;
        const textPosts = allContent?.filter(c => c.content_type === 'text').length || 0;
        const imagePosts = allContent?.filter(c => c.content_type === 'image').length || 0;
        const videoPosts = allContent?.filter(c => c.content_type === 'video').length || 0;

        // Calculate time saved (rough estimate: 15 min per post)
        const totalMinutes = totalPosts * 15;
        const hours = Math.floor(totalMinutes / 60);
        const timeSaved = hours > 0 ? `${hours}hrs` : `${totalMinutes}min`;

        // Get recent 5 items
        const recentContent = (allContent || []).slice(0, 5).map(item => ({
            id: String(item.id),
            title: item.caption?.substring(0, 50) + (item.caption?.length > 50 ? '...' : '') || item.topic || 'Untitled',
            platform: item.platform || 'unknown',
            contentType: item.content_type || 'text',
            createdAt: new Date(item.created_at).toLocaleDateString(),
            icon: ''
        }));

        // Calculate platform statistics
        const platformCounts = {};
        (allContent || []).forEach(item => {
            const platform = item.platform || 'unknown';
            platformCounts[platform] = (platformCounts[platform] || 0) + 1;
        });

        const platformStats = Object.entries(platformCounts)
            .map(([platform, count]) => ({
                platform: platform.charAt(0).toUpperCase() + platform.slice(1),
                count: count,
                percentage: totalPosts > 0 ? Math.round((count / totalPosts) * 100) : 0
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 4); // Top 4 platforms

        res.json({
            stats: {
                postsGenerated: textPosts,
                imagesCreated: imagePosts,
                videosMade: videoPosts,
                timeSaved: timeSaved,
                postsChange: '+12%',  // TODO: Calculate actual change from previous period
                imagesChange: '+8%',
                videosChange: '+15%',
                timeChange: '+10%'
            },
            recentContent,
            platformStats
        });

    } catch (error) {
        console.error(`Dashboard stats error: ${error.message}`);
        // Return empty data on error instead of failing
        res.json({
            stats: {
                postsGenerated: 0,
                imagesCreated: 0,
                videosMade: 0,
                timeSaved: '0hrs',
                postsChange: '+0%',
                imagesChange: '+0%',
                videosChange: '+0%',
                timeChange: '+0%'
            },
            recentContent: [],
            platformStats: []
        });
    }
});

// GET /dashboard/recent - Get recent content (legacy endpoint, redirects to stats)
router.get('/recent', async (req, res) => {
    try {
        const supabaseService = getSupabaseService();
        
        if (!supabaseService.isConfigured()) {
            return res.json({ items: [] });
        }
        
        const userId = req.user?.id || null;
        
        // Fetch recent content from database
        let query = supabaseService.client
            .from('content_history')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);

        if (userId) {
            query = query.eq('user_id', userId);
        }

        const { data, error } = await query;
        
        if (error) throw error;
        
        const items = (data || []).map(item => ({
            id: String(item.id || ''),
            contentType: item.content_type || '',
            platform: item.platform || '',
            topic: item.topic || '',
            caption: item.caption || '',
            createdAt: item.created_at || ''
        }));
        
        res.json({ items });
    } catch (error) {
        console.error(`Dashboard recent error: ${error.message}`);
        res.json({ items: [] });
    }
});

// GET /dashboard/history - Get comprehensive content history (text posts + UGC ads)
router.get('/history', async (req, res) => {
    try {
        const supabaseService = getSupabaseService();
        
        if (!supabaseService.isConfigured()) {
            return res.json([]);
        }

        const userId = req.user?.id || null;

        // Fetch content history (text/image posts)
        let contentQuery = supabaseService.client
            .from('content_history')
            .select('*')
            .order('created_at', { ascending: false });

        if (userId) {
            contentQuery = contentQuery.eq('user_id', userId);
        }

        const { data: contentHistory, error: contentError } = await contentQuery;

        if (contentError) {
            console.error(`Content history query error: ${contentError.message}`);
        }

        // Fetch UGC Ads
        let ugcQuery = supabaseService.client
            .from('ugc_ads')
            .select('*')
            .order('created_at', { ascending: false });

        if (userId) {
            ugcQuery = ugcQuery.eq('user_id', userId);
        }

        const { data: ugcAds, error: ugcError } = await ugcQuery;

        if (ugcError) {
            console.error(`UGC ads query error: ${ugcError.message}`);
        }

        // Transform and combine data
        const historyItems = [];

        // Add content history items
        (contentHistory || []).forEach(item => {
            historyItems.push({
                id: String(item.id),
                type: item.content_type || 'text',
                platform: item.platform,
                contentType: item.content_type,
                topic: item.topic,
                caption: item.caption,
                hashtags: item.hashtags || [],
                cta: item.cta,
                createdAt: item.created_at,
                isFavorite: item.is_favorite || false
            });
        });

        // Add UGC ads items
        (ugcAds || []).forEach(item => {
            historyItems.push({
                id: String(item.id),
                type: 'ugc_ad',
                productName: item.product_name,
                caption: item.caption,
                hashtags: item.hashtags || [],
                cta: item.cta,
                imageUrl: item.product_image_url,
                imagePrompt: item.image_prompt,
                adType: item.ad_type,
                mood: item.mood,
                visualStyle: item.visual_style,
                imageFormat: item.image_format,
                createdAt: item.created_at,
                isFavorite: item.is_favorite || false
            });
        });

        // Sort by created_at descending
        historyItems.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        res.json(historyItems);

    } catch (error) {
        console.error(`Dashboard history error: ${error.message}`);
        res.json([]);
    }
});

export default router;

