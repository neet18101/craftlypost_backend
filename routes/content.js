import express from 'express';
import 'express-async-errors';
import { getOpenAIService } from '../services/openaiService.js';
import { getGeminiService } from '../services/geminiService.js';
import { getSupabaseService } from '../services/supabaseService.js';
import { authenticateUser } from '../middleware/auth.js';
import { 
    TextPostRequest, 
    ImagePostRequest, 
    VideoScriptRequest,
    UGCAdRequest,
    SaveContentRequest
} from '../models/schemas.js';

const router = express.Router();

// Apply auth middleware to all content routes
router.use(authenticateUser);

// Helper function to save content to database
async function saveContentToDb(supabaseService, data, userId = null) {
    if (supabaseService.isConfigured()) {
        try {
            await supabaseService.client.from('content_history').insert({
                user_id: userId,
                platform: data.platform,
                content_type: data.contentType,
                topic: data.topic,
                tone: data.tone,
                goal: data.goal,
                caption: data.caption,
                hashtags: data.hashtags,
                cta: data.cta
            });
            console.log(`Content saved to database: ${data.contentType} for ${data.platform} (user: ${userId || 'anonymous'})`);
        } catch (e) {
            console.error(`Failed to save content to DB: ${e.message}`);
        }
    }
}

// POST /content/generate/text - Generate text post
router.post('/generate/text', async (req, res) => {
    try {
        // Validate request
        const request = await TextPostRequest.parseAsync(req.body);
        
        const openaiService = getOpenAIService();
        const supabaseService = getSupabaseService();
        
        const result = await openaiService.generateTextPost(request);
        
        // Save to database
        await saveContentToDb(supabaseService, {
            platform: request.platform,
            contentType: 'text',
            topic: request.topic,
            tone: request.tone,
            goal: request.goal,
            caption: result.caption,
            hashtags: result.hashtags,
            cta: result.cta
        }, req.user?.id);
        
        res.json(result);
    } catch (error) {
        console.error(`Text generation error: ${error.message}`);
        res.status(500).json({
            success: false,
            error: error.message || 'Text generation failed'
        });
    }
});

// POST /content/generate/image - Generate image post
router.post('/generate/image', async (req, res) => {
    try {
        const request = await ImagePostRequest.parseAsync(req.body);
        
        const openaiService = getOpenAIService();
        const supabaseService = getSupabaseService();
        
        const result = await openaiService.generateImagePost(request);
        
        // Save to database
        await saveContentToDb(supabaseService, {
            platform: request.platform,
            contentType: 'image',
            topic: request.topic,
            tone: request.tone,
            goal: request.goal,
            caption: result.caption,
            hashtags: result.hashtags,
            cta: result.cta
        }, req.user?.id);
        
        res.json(result);
    } catch (error) {
        console.error(`Image generation error: ${error.message}`);
        res.status(500).json({
            success: false,
            error: error.message || 'Image  generation failed'
        });
    }
});

// POST /content/generate/video - Generate video script
router.post('/generate/video', async (req, res) => {
    try {
        const request = await VideoScriptRequest.parseAsync(req.body);
        
        const openaiService = getOpenAIService();
        const supabaseService = getSupabaseService();
        
        const result = await openaiService.generateVideoScript(request);
        
        // Save to database
        await saveContentToDb(supabaseService, {
            platform: request.platform,
            contentType: 'video',
            topic: request.topic,
            tone: request.tone,
            goal: request.goal,
            caption: result.script, // Use script as caption for video
            hashtags: result.hashtags,
            cta: result.cta
        }, req.user?.id);
        
        res.json(result);
    } catch (error) {
        console.error(`Video generation error: ${error.message}`);
        res.status(500).json({
            success: false,
            error: error.message || 'Video generation failed'
        });
    }
});

// POST /content/generate/ugc-ad - Generate UGC ad
router.post('/generate/ugc-ad', async (req, res) => {
    try {
        const request = await UGCAdRequest.parseAsync(req.body);
        
        const geminiService = getGeminiService();
        const supabaseService = getSupabaseService();
        
        // Generate content using Gemini
        const result = await geminiService.generateUGCAdContent({
            productName: request.productName,
            productDescription: request.productDescription,
            adType: request.adType,
            imageFormat: request.imageFormat,
            visualStyle: request.visualStyle,
            mood: request.mood,
            targetAudience: request.targetAudience,
            additionalDetails: request.additionalDetails
        });
        
        // Map image format to aspect ratio
        const formatToAspect = {
            'square': '1:1',
            'portrait': '4:5',
            'story': '9:16',
            'landscape': '16:9'
        };
        const aspectRatio = formatToAspect[request.imageFormat] || '1:1';
        
        // Generate actual image using Nano Banana API
        console.log(`Generating image with prompt: ${result.imagePrompt.substring(0, 100)}...`);
        const imageResult = await geminiService.generateImage(
            result.imagePrompt,
            aspectRatio,
            1
        );
        
        // Get the generated image and upload to Supabase Storage
        let generatedImageUrl = null;
        if (imageResult.success && imageResult.images.length > 0) {
            const imageBase64 = imageResult.images[0].data;
            console.log('✓ Image generated successfully!');
            console.log(`Image data format: ${imageBase64.substring(0, 30)}...`);
            
            // Upload to Supabase Storage
            console.log(`Supabase configured: ${supabaseService.isConfigured()}`);
            if (supabaseService.isConfigured()) {
                try {
                    console.log(`Attempting to upload image to Supabase storage bucket: ugc-ads`);
                    generatedImageUrl = await supabaseService.uploadImageToStorage(
                        imageBase64,
                        `${request.productName.replace(/\s/g, '_')}_${Date.now()}.png`,
                        'ugc-ads'
                    );
                    console.log(`✅ SUCCESS! Image uploaded to storage: ${generatedImageUrl}`);
                } catch (e) {
                    console.error(`❌ UPLOAD FAILED: ${e.message}`);
                    console.error(`Error stack: ${e.stack}`);
                    generatedImageUrl = imageBase64;
                }
            } else {
                console.warn('⚠️ Supabase not configured, using base64');
                // Fallback to base64 if Supabase not configured
                generatedImageUrl = imageBase64;
            }
        } else {
            console.error(`Image generation failed: ${imageResult.error || 'Unknown error'}`);
        }
        
        // Save to ugc_ads table in database
        if (supabaseService.isConfigured()) {
            try {
                // Get user ID from authenticated request
                const userId = req.user?.id || null;
                
                await supabaseService.client.from('ugc_ads').insert({
                    user_id: userId,
                    product_name: request.productName,
                    product_description: request.productDescription,
                    target_audience: request.targetAudience,
                    ad_type: request.adType,
                    image_format: request.imageFormat,
                    visual_style: request.visualStyle,
                    mood: request.mood,
                    additional_details: request.additionalDetails,
                    image_prompt: result.imagePrompt,
                    caption: result.caption,
                    hashtags: result.hashtags,
                    cta: result.cta,
                    estimated_reach: result.stats.estimatedReach,
                    engagement_rate: result.stats.engagementRate,
                    recommended_budget: result.stats.recommendedBudget,
                    best_time_to_post: result.stats.bestTimeToPost,
                    product_image_url: generatedImageUrl,
                    credits_used: 2
                });
                console.log(`UGC ad saved to database for product: ${request.productName}`);
            } catch (e) {
                console.error(`Failed to save UGC ad to database: ${e.message}`);
            }
        }
        
        // Return response with generated image
        res.json({
            success: true,
            imagePrompt: result.imagePrompt,
            caption: result.caption,
            hashtags: result.hashtags,
            cta: result.cta,
            stats: result.stats,
            creditsUsed: 2,
            creditsRemaining: 1000, // TODO: Implement actual credit tracking
            generatedImageUrl
        });
    } catch (error) {
        console.error(`UGC ad generation error: ${error.message}`);
        res.status(500).json({
            success: false,
            error: error.message || 'UGC ad generation failed'
        });
    }
});

// POST /content/save - Save content to history
router.post('/save', async (req, res) => {
    try {
        const request = await SaveContentRequest.parseAsync(req.body);
        
        const supabaseService = getSupabaseService();
        
        if (!supabaseService.isConfigured()) {
            return res.status(503).json({
                success: false,
                error: 'Database service not configured'
            });
        }
        
        // Get user ID from authenticated request
        // If user is not logged in, req.user will be null (allows anonymous saves if needed)
        const userId = req.user?.id || null;
        
        // Save to database
        const { data, error } = await supabaseService.client.from('content_history').insert({
            user_id: userId,
            platform: request.platform,
            content_type: request.contentType,
            topic: request.topic,
            tone: request.tone,
            goal: request.goal,
            caption: request.caption,
            hashtags: request.hashtags || [],
            cta: request.cta || ''
        }).select();
        
        if (error) throw error;
        
        const recordId = data && data.length > 0 ? data[0].id : 'unknown';
        
        console.log(`✅ Content saved by ${req.user?.email || 'anonymous'} (ID: ${userId})`);
        
        res.json({
            success: true,
            id: String(recordId),
            message: 'Content saved to history successfully'
        });
    } catch (error) {
        console.error(`Failed to save content to history: ${error.message}`);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to save content'
        });
    }
});

// GET /content/history - Get content history
router.get('/history', async (req, res) => {
    try {
        const supabaseService = getSupabaseService();
        
        if (!supabaseService.isConfigured()) {
            return res.json({ items: [] });
        }
        
        // Fetch from database
        const { data, error } = await supabaseService.client
            .from('content_history')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);
        
        if (error) throw error;
        
        const items = (data || []).map(item => ({
            id: String(item.id || ''),
            contentType: item.content_type || '',
            platform: item.platform || '',
            topic: item.topic || '',
            caption: item.caption || '',
            hashtags: item.hashtags || [],
            cta: item.cta || '',
            createdAt: item.created_at || ''
        }));
        
        res.json({ items });
    } catch (error) {
        console.error(`Failed to fetch content history: ${error.message}`);
        res.json({ items: [] });
    }
});

export default router;
