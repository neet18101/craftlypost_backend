import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';
import { getSettings } from '../config/index.js';

class OpenAIService {
    constructor() {
        const settings = getSettings();
        this.openaiClient = null;
        this.geminiClient = null;
        this.groqClient = null;

        // Initialize OpenAI
        if (settings.openaiApiKey) {
            try {
                this.openaiClient = new OpenAI({ apiKey: settings.openaiApiKey });
                console.log('✓ OpenAI client initialized');
            } catch (e) {
                console.error(`✗ OpenAI init failed: ${e.message}`);
            }
        }

        // Initialize Gemini
        if (settings.googleApiKey) {
            try {
                this.geminiClient = new GoogleGenerativeAI(settings.googleApiKey);
                console.log('✓ Gemini client initialized');
            } catch (e) {
                console.error(`✗ Gemini init failed: ${e.message}`);
            }
        }

        // Initialize Groq
        if (settings.groqApiKey) {
            try {
                this.groqClient = new Groq({ apiKey: settings.groqApiKey });
                console.log('✓ Groq client initialized');
            } catch (e) {
                console.error(`✗ Groq init failed: ${e.message}`);
            }
        }
    }

    _getPlatformContext(platform) {
        const platforms = {
            instagram: {
                charLimit: 2200,
                hashtagLimit: 30,
                bestPractices: 'Use emojis, line breaks, and storytelling. End with a CTA.'
            },
            linkedin: {
                charLimit: 3000,
                hashtagLimit: 5,
                bestPractices: 'Professional tone, use bullet points, share insights and value.'
            },
            twitter: {
                charLimit: 280,
                hashtagLimit: 3,
                bestPractices: 'Be concise, use hooks, create threads for longer content.'
            },
            facebook: {
                charLimit: 63206,
                hashtagLimit: 10,
                bestPractices: 'Tell stories, ask questions, encourage engagement.'
            },
            tiktok: {
                charLimit: 2200,
                hashtagLimit: 10,
                bestPractices: 'Trendy, casual, use popular hashtags and hooks.'
            },
            youtube: {
                charLimit: 5000,
                hashtagLimit: 15,
                bestPractices: 'SEO-optimized descriptions, include timestamps and links.'
            }
        };
        return platforms[platform] || platforms.instagram;
    }

    async _generateWithOpenAI(systemPrompt, userPrompt) {
        const response = await this.openaiClient.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            temperature: 0.8,
            max_tokens: 1000,
            response_format: { type: 'json_object' }
        });

        return JSON.parse(response.choices[0].message.content);
    }

    async _generateWithGemini(systemPrompt, userPrompt) {
        const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;
        const model = this.geminiClient.getGenerativeModel({
            model: 'gemini-1.5-flash',
            generationConfig: {
                temperature: 0.8,
                maxOutputTokens: 1000,
                responseMimeType: 'application/json'
            }
        });

        const result = await model.generateContent(fullPrompt);
        const text = result.response.text().trim();
        return this._cleanJsonResponse(text);
    }

    async _generateWithGroq(systemPrompt, userPrompt) {
        const fullSystem = systemPrompt + '\n\nIMPORTANT: Respond ONLY with valid JSON. No markdown, no code blocks, no extra text.';

        const response = await this.groqClient.chat.completions.create({
            model: 'llama-3.1-8b-instant',
            messages: [
                { role: 'system', content: fullSystem },
                { role: 'user', content: userPrompt }
            ],
            temperature: 0.8,
            max_tokens: 1024,
            response_format: { type: 'json_object' }
        });

        const text = response.choices[0].message.content.trim();
        return this._cleanJsonResponse(text);
    }

    _cleanJsonResponse(text) {
        // Remove markdown code blocks if present
        let cleaned = text;
        if (cleaned.startsWith('```json')) {
            cleaned = cleaned.substring(7);
        }
        if (cleaned.startsWith('```')) {
            cleaned = cleaned.substring(3);
        }
        if (cleaned.endsWith('```')) {
            cleaned = cleaned.substring(0, cleaned.length - 3);
        }
        return JSON.parse(cleaned.trim());
    }

    async _generateContent(systemPrompt, userPrompt) {
        // Try OpenAI first
        if (this.openaiClient) {
            try {
                console.log('🤖 Trying OpenAI...');
                return await this._generateWithOpenAI(systemPrompt, userPrompt);
            } catch (e) {
                console.error(`OpenAI failed: ${e.message}`);
            }
        }

        // Fallback to Gemini
        if (this.geminiClient) {
            for (let attempt = 0; attempt < 2; attempt++) {
                try {
                    console.log(`🤖 Using Gemini (attempt ${attempt + 1}/2)...`);
                    if (attempt > 0) {
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    }
                    return await this._generateWithGemini(systemPrompt, userPrompt);
                } catch (e) {
                    console.error(`Gemini attempt ${attempt + 1} failed: ${e.message}`);
                }
            }
        }

        // Final fallback to Groq
        if (this.groqClient) {
            for (let attempt = 0; attempt < 2; attempt++) {
                try {
                    console.log(`🤖 Using Groq (attempt ${attempt + 1}/2)...`);
                    if (attempt > 0) {
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    }
                    return await this._generateWithGroq(systemPrompt, userPrompt);
                } catch (e) {
                    console.error(`Groq attempt ${attempt + 1} failed: ${e.message}`);
                    if (attempt === 1) {
                        throw new Error(`All AI providers failed. Last error: ${e.message}`);
                    }
                }
            }
        }

        throw new Error('No AI provider available. Configure OpenAI, Google, or Groq API key.');
    }

    async generateTextPost(request) {
        const platformCtx = this._getPlatformContext(request.platform);

        const systemPrompt = `You are an expert social media content creator.
Create engaging content for ${request.platform}.

Platform Guidelines:
- Character limit: ${platformCtx.charLimit}
- Hashtag limit: ${platformCtx.hashtagLimit}
- Best practices: ${platformCtx.bestPractices}

Content Requirements:
- Tone: ${request.tone}
- Goal: ${request.goal}
- Include emojis: ${request.includeEmojis}
- Generate hashtags: ${request.includeHashtags}
- Include CTA: ${request.includeCTA}

Respond with valid JSON:
{
    "caption": "The main caption text",
    "hashtags": ["#hashtag1", "#hashtag2"],
    "cta": "Call to action text"
}`;

        const userPrompt = `Create a ${request.tone} social media post for ${request.platform} about:

${request.topic}

Goal: ${request.goal}. Make it engaging and optimized for the platform.`;

        const result = await this._generateContent(systemPrompt, userPrompt);

        const caption = result.caption || '';
        const words = caption.split(' ').length;

        return {
            success: true,
            caption,
            hashtags: request.includeHashtags ? (result.hashtags || []) : [],
            cta: request.includeCTA ? (result.cta || '') : '',
            stats: {
                characters: caption.length,
                words,
                readTime: `${Math.max(1, Math.floor(words / 3))} sec`,
                engagementScore: (result.hashtags?.length >= 5) ? 'High' : 'Medium'
            },
            creditsUsed: 1,
            creditsRemaining: 149
        };
    }

    async generateImagePost(request) {
        const systemPrompt = `You are an expert social media content creator.
Create engaging content for ${request.platform} with an image.

Respond with valid JSON:
{
    "caption": "The caption text",
    "hashtags": ["#hashtag1", "#hashtag2"],
    "cta": "Call to action",
    "imagePrompt": "Detailed prompt for AI image generation"
}`;

        const userPrompt = `Create a ${request.tone} image post for ${request.platform} about:

${request.topic}

Goal: ${request.goal}. Include a detailed image generation prompt.`;

        const result = await this._generateContent(systemPrompt, userPrompt);

        const caption = result.caption || '';
        const words = caption.split(' ').length;

        return {
            success: true,
            caption,
            hashtags: result.hashtags || [],
            cta: result.cta || '',
            imagePrompt: result.imagePrompt || '',
            stats: {
                characters: caption.length,
                words,
                readTime: `${Math.max(1, Math.floor(words / 3))} sec`,
                engagementScore: 'High'
            },
            creditsUsed: 2,
            creditsRemaining: 23
        };
    }

    async generateVideoScript(request) {
        const systemPrompt = `You are an expert video content creator.
Create a ${request.duration} video script for ${request.platform}.

Respond with valid JSON:
{
    "hook": "Attention-grabbing opening line",
    "script": "Main video script content",
    "cta": "Call to action at the end",
    "hashtags": ["#hashtag1", "#hashtag2"]
}`;

        const userPrompt = `Create a ${request.tone} video script for ${request.platform} about:

${request.topic}

Duration: ${request.duration}
Goal: ${request.goal}`;

        const result = await this._generateContent(systemPrompt, userPrompt);

        const script = result.script || '';
        const words = script.split(' ').length;

        return {
            success: true,
            hook: result.hook || '',
            script,
            cta: result.cta || '',
            hashtags: result.hashtags || [],
            stats: {
                characters: script.length,
                words,
                readTime: `${Math.max(1, Math.floor(words / 3))} sec`,
                engagementScore: 'High'
            },
            creditsUsed: 3,
            creditsRemaining: 7
        };
    }
}

// Singleton instance
let openaiService = null;

export function getOpenAIService() {
    if (!openaiService) {
        openaiService = new OpenAIService();
    }
    return openaiService;
}

export default OpenAIService;
