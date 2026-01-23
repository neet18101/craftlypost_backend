import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleGenAI } from '@google/genai';
import { getSettings } from '../config/index.js';

class GeminiService {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.client = null;  // Old SDK for text generation
        this.genaiClient = null;  // New SDK for image generation
        
        if (apiKey) {
            try {
                // Old SDK for text generation
                this.client = new GoogleGenerativeAI(apiKey);
                // New SDK for image generation (Nano Banana)
                this.genaiClient = new GoogleGenAI({ apiKey: apiKey });
                console.log('✓ Gemini service configured');
            } catch (e) {
                console.error(`✗ Gemini service init failed: ${e.message}`);
            }
        }
    }

    isConfigured() {
        return !!(this.client && this.apiKey);
    }

    async generateUGCAdContent({
        productName,
        productDescription,
        adType,
        imageFormat,
        visualStyle,
        mood,
        targetAudience = null,
        additionalDetails = null
    }) {
        if (!this.isConfigured()) {
            throw new Error('Gemini API is not configured. Please set GOOGLE_API_KEY in .env');
        }

        // Map format IDs to dimensions
        const formatMap = {
            'square': { aspect: '1:1', dimensions: '1080x1080', platforms: 'Instagram, Facebook' },
            'portrait': { aspect: '4:5', dimensions: '1080x1350', platforms: 'Instagram Feed' },
            'story': { aspect: '9:16', dimensions: '1080x1920', platforms: 'Stories, Reels' },
            'landscape': { aspect: '16:9', dimensions: '1920x1080', platforms: 'YouTube, Twitter' }
        };

        // Map style IDs to descriptions
        const styleMap = {
            'authentic': 'Raw, real, unpolished',
            'minimal': 'Clean, simple, modern',
            'vibrant': 'Bold, colorful, energetic',
            'professional': 'Polished, studio-quality'
        };

        // Map ad type IDs to names
        const adTypeMap = {
            'testimonial': 'Testimonial',
            'before-after': 'Before/After',
            'unboxing': 'Unboxing',
            'lifestyle': 'Lifestyle',
            'product-showcase': 'Product Focus',
            'user-story': 'User Story'
        };

        const formatInfo = formatMap[imageFormat] || formatMap['square'];
        const styleDesc = styleMap[visualStyle] || 'authentic';
        const adTypeName = adTypeMap[adType] || adType;

        // Build comprehensive prompt for Gemini
        const prompt = `You are a UGC (User Generated Content) ad expert. Generate comprehensive ad content for the following product:

Product: ${productName}
Description: ${productDescription}
Ad Type: ${adTypeName}
Visual Style: ${styleDesc}
Mood: ${mood.charAt(0).toUpperCase() + mood.slice(1)}
Image Format: ${formatInfo.dimensions} (${formatInfo.aspect})
Platform: ${formatInfo.platforms}
${targetAudience ? `Target Audience: ${targetAudience}` : ''}
${additionalDetails ? `Additional Details: ${additionalDetails}` : ''}

Please provide the following in JSON format:

1. **imagePrompt**: A detailed, creative prompt for AI image generation (150-250 words). Make it look authentic and UGC-style, not overly polished. Include specific details about setting, lighting, composition, and the product in use.

2. **caption**: An engaging social media caption (100-200 words) that matches the ${mood} tone and ${adTypeName} style. Make it conversational and authentic, as if written by a real user.

3. **hashtags**: An array of 8-12 relevant, trending hashtags (mix of popular and niche).

4. **cta**: A compelling call-to-action (1-2 sentences).

Respond ONLY with valid JSON in this exact format:
{
  "imagePrompt": "detailed prompt here...",
  "caption": "engaging caption here...",
  "hashtags": ["#hashtag1", "#hashtag2", ...],
  "cta": "call to action here..."
}`;

        try {
            const model = this.client.getGenerativeModel({
                model: 'gemini-1.5-flash',
                generationConfig: {
                    temperature: 0.8,
                    maxOutputTokens: 2048
                }
            });

            const result = await model.generateContent(prompt);
            let responseText = result.response.text().trim();

            // Remove markdown code blocks if present
            if (responseText.startsWith('```json')) {
                responseText = responseText.substring(7);
            }
            if (responseText.startsWith('```')) {
                responseText = responseText.substring(3);
            }
            if (responseText.endsWith('```')) {
                responseText = responseText.substring(0, responseText.length - 3);
            }
            responseText = responseText.trim();

            // Parse JSON response
            const parsedResult = JSON.parse(responseText);

            // Add stats
            parsedResult.stats = {
                estimatedReach: '5K-15K',
                engagementRate: '3.5-7%',
                recommendedBudget: '$50-200',
                bestTimeToPost: 'Mon-Fri, 6-9 PM'
            };

            return parsedResult;

        } catch (error) {
            console.error(`Gemini API error: ${error.message}`);
            
            // Fallback if JSON parsing fails
            return {
                imagePrompt: `Create a realistic UGC-style ${adTypeName.toLowerCase()} ad for ${productName}. ${productDescription}. Visual style: ${styleDesc}. Mood: ${mood}. Make it look authentic, natural, and user-generated.`,
                caption: `Just tried ${productName} and I'm obsessed! 😍 ${productDescription.substring(0, 100)}... You NEED to try this!`,
                hashtags: [`#${productName.replace(/\s/g, '')}`, '#UGC', '#Viral', '#MustTry', '#ProductReview'],
                cta: `Tap the link in bio to get ${productName} now!`,
                stats: {
                    estimatedReach: '5K-15K',
                    engagementRate: '3.5-7%',
                    recommendedBudget: '$50-200',
                    bestTimeToPost: 'Mon-Fri, 6-9 PM'
                }
            };
        }
    }

    async generateImage(prompt, aspectRatio = '1:1', numberOfImages = 1) {
        if (!this.isConfigured()) {
            throw new Error('Gemini API is not configured. Please set GOOGLE_API_KEY in .env');
        }

        try {
            // Use new @google/genai SDK for Nano Banana
            const response = await this.genaiClient.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: prompt,
            });

            const images = [];

            // Extract images from response (matching official docs)
            for (const part of response.candidates[0].content.parts) {
                if (part.text) {
                    console.log(`Image generation note: ${part.text}`);
                } else if (part.inlineData) {
                    const imageData = part.inlineData.data;
                    const mimeType = part.inlineData.mimeType || 'image/png';
                    
                    images.push({
                        data: `data:${mimeType};base64,${imageData}`,
                        mimeType: mimeType
                    });
                }
            }

            if (images.length === 0) {
                throw new Error('No images were generated. The model may have blocked the request due to safety filters.');
            }

            console.log(`✓ Generated ${images.length} image(s) using Nano Banana (gemini-2.5-flash-image)`);

            return {
                success: true,
                images,
                promptUsed: prompt
            };

        } catch (error) {
            console.error(`=`.repeat(60));
            console.error(`Nano Banana image generation error: ${error.message}`);
            console.error(`Error type: ${error.constructor.name}`);
            console.error(`=`.repeat(60));
            
            return {
                success: false,
                error: error.message,
                images: []
            };
        }
    }
}

// Singleton getter function
export function getGeminiService() {
    const settings = getSettings();
    return new GeminiService(settings.googleApiKey);
}

export default GeminiService;
