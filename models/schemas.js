import { z } from 'zod';

// ============================================
// ENUMS
// ============================================
export const Platform = z.enum([
    'instagram',
    'linkedin',
    'twitter',
    'facebook',
    'tiktok',
    'youtube'
]);

export const Tone = z.enum([
    'professional',
    'casual',
    'humorous',
    'inspirational',
    'educational',
    'promotional'
]);

export const Goal = z.enum([
    'engagement',
    'awareness',
    'conversion',
    'traffic',
    'education',
    'entertainment'
]);

// ============================================
// TEXT POST GENERATION
// ============================================
export const TextPostRequest = z.object({
    topic: z.string().min(3).max(500),
    platform: Platform,
    tone: Tone,
    goal: Goal,
    includeHashtags: z.boolean().default(true),
    includeCTA: z.boolean().default(true),
    includeEmojis: z.boolean().default(true)
});

export const ContentStats = z.object({
    characters: z.number(),
    words: z.number(),
    readTime: z.string(),
    engagementScore: z.string()
});

export const TextPostResponse = z.object({
    success: z.boolean().default(true),
    caption: z.string(),
    hashtags: z.array(z.string()),
    cta: z.string(),
    stats: ContentStats,
    creditsUsed: z.number().default(1),
    creditsRemaining: z.number()
});

// ============================================
// IMAGE POST GENERATION
// ============================================
export const ImagePostRequest = z.object({
    topic: z.string().min(3).max(500),
    platform: Platform,
    tone: Tone,
    goal: Goal,
    includeHashtags: z.boolean().default(true),
    includeCTA: z.boolean().default(true),
    includeEmojis: z.boolean().default(true)
});

export const ImagePostResponse = z.object({
    success: z.boolean().default(true),
    caption: z.string(),
    hashtags: z.array(z.string()),
    cta: z.string(),
    imagePrompt: z.string(),
    stats: ContentStats,
    creditsUsed: z.number().default(2),
    creditsRemaining: z.number()
});

// ============================================
// VIDEO SCRIPT GENERATION
// ============================================
export const VideoScriptRequest = z.object({
    topic: z.string().min(3).max(500),
    platform: Platform,
    tone: Tone,
    goal: Goal,
    duration: z.string().default('30s')
});

export const VideoScriptResponse = z.object({
    success: z.boolean().default(true),
    hook: z.string(),
    script: z.string(),
    cta: z.string(),
    hashtags: z.array(z.string()),
    stats: ContentStats,
    creditsUsed: z.number().default(3),
    creditsRemaining: z.number()
});

// ============================================
// UGC ADS GENERATION
// ============================================
export const UGCAdsStats = z.object({
    estimatedReach: z.string(),
    engagementRate: z.string(),
    recommendedBudget: z.string(),
    bestTimeToPost: z.string()
});

export const UGCAdRequest = z.object({
    productName: z.string().min(2).max(200),
    productDescription: z.string().min(10).max(1000),
    adType: z.string(),
    imageFormat: z.string(),
    visualStyle: z.string(),
    mood: z.string(),
    targetAudience: z.string().optional(),
    additionalDetails: z.string().optional(),
    uploadedImages: z.array(z.string()).optional()
});

export const UGCAdResponse = z.object({
    success: z.boolean().default(true),
    imagePrompt: z.string(),
    caption: z.string(),
    hashtags: z.array(z.string()),
    cta: z.string(),
    stats: UGCAdsStats,
    creditsUsed: z.number().default(2),
    creditsRemaining: z.number(),
    generatedImageUrl: z.string().optional()
});

// ============================================
// CREDITS
// ============================================
export const CreditsResponse = z.object({
    textCredits: z.number(),
    imageCredits: z.number(),
    videoCredits: z.number(),
    totalCredits: z.number(),
    plan: z.string().default('free')
});

export const DeductCreditsRequest = z.object({
    creditType: z.string(),
    amount: z.number().default(1)
});

export const DeductCreditsResponse = z.object({
    success: z.boolean(),
    creditsRemaining: z.number(),
    message: z.string()
});

// ============================================
// CONTENT HISTORY
// ============================================
export const SaveContentRequest = z.object({
    contentType: z.string(),
    platform: z.string(),
    topic: z.string(),
    tone: z.string(),
    goal: z.string(),
    caption: z.string(),
    hashtags: z.array(z.string()).default([]),
    cta: z.string().default(''),
    stats: ContentStats
});

export const SaveContentResponse = z.object({
    success: z.boolean().default(true),
    id: z.string(),
    message: z.string().default('Content saved to history successfully')
});

export const ContentHistoryItem = z.object({
    id: z.string(),
    contentType: z.string(),
    platform: z.string(),
    topic: z.string(),
    caption: z.string(),
    hashtags: z.array(z.string()),
    cta: z.string(),
    createdAt: z.string()
});

export const ContentHistoryResponse = z.object({
    items: z.array(ContentHistoryItem)
});

// ============================================
// ERROR RESPONSE
// ============================================
export const ErrorResponse = z.object({
    success: z.boolean().default(false),
    error: z.string(),
    code: z.string().optional()
});
