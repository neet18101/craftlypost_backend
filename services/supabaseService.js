import { createClient } from '@supabase/supabase-js';
import { getSettings } from '../config/index.js';

class SupabaseService {
    constructor() {
        const settings = getSettings();
        this.client = null;

        if (settings.supabaseUrl && settings.supabaseKey) {
            try {
                this.client = createClient(settings.supabaseUrl, settings.supabaseKey);
                console.log('✓ Supabase client initialized');
            } catch (e) {
                console.error(`✗ Supabase init failed: ${e.message}`);
            }
        } else {
            console.warn('⚠️  Supabase not configured - database features disabled');
        }
    }

    isConfigured() {
        return this.client !== null;
    }

    async getUserCredits(userId) {
        if (!this.isConfigured()) {
            // Return default credits if Supabase not configured
            return { text: 150, image: 25, video: 10, total: 185 };
        }

        try {
            const { data, error } = await this.client
                .from('user_credits')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (error && error.code !== 'PGRST116') {
                throw error;
            }

            if (data) {
                return data;
            } else {
                // Create default credits for new user
                const defaultCredits = {
                    user_id: userId,
                    text: 150,
                    image: 25,
                    video: 10
                };

                await this.client
                    .from('user_credits')
                    .insert(defaultCredits);

                return { ...defaultCredits, total: 185 };
            }
        } catch (e) {
            console.error(`Supabase error: ${e.message}`);
            return { text: 150, image: 25, video: 10, total: 185 };
        }
    }

    async deductCredit(userId, creditType) {
        if (!this.isConfigured()) {
            return true; // Skip credit deduction if not configured
        }

        try {
            // Get current credits
            const { data, error } = await this.client
                .from('user_credits')
                .select(creditType)
                .eq('user_id', userId)
                .single();

            if (error) throw error;

            if (data && (data[creditType] || 0) > 0) {
                const newValue = data[creditType] - 1;
                await this.client
                    .from('user_credits')
                    .update({ [creditType]: newValue })
                    .eq('user_id', userId);
                return true;
            }
            return false;
        } catch (e) {
            console.error(`Supabase error: ${e.message}`);
            return true; // Allow operation to continue
        }
    }

    async saveGeneratedContent(userId, content) {
        if (!this.isConfigured()) {
            return true;
        }

        try {
            await this.client.from('content_history').insert({
                user_id: userId,
                platform: content.platform,
                content_type: content.contentType,
                caption: content.caption,
                hashtags: content.hashtags,
                cta: content.cta
            });
            return true;
        } catch (e) {
            console.error(`Supabase error: ${e.message}`);
            return false;
        }
    }

    async uploadImageToStorage(imageBase64, filename, bucket = 'ugc-ads') {
        console.log(`📤 Starting image upload process...`);
        console.log(`   Bucket: ${bucket}`);
        console.log(`   Filename: ${filename}`);
        
        if (!this.isConfigured()) {
            throw new Error('Supabase is not configured');
        }

        try {
            console.log(`   Removing data URI prefix...`);
            // Remove data URI prefix if present
            let base64Data = imageBase64;
            if (imageBase64.startsWith('data:')) {
                base64Data = imageBase64.split(',')[1];
            }

            console.log(`   Converting base64 to buffer... (${base64Data.length} characters)`);
            // Decode base64 to bytes
            const imageBuffer = Buffer.from(base64Data, 'base64');
            console.log(`   Buffer created: ${imageBuffer.length} bytes`);

            // Generate unique filename with timestamp
            const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];
            const randomId = Math.random().toString(36).substring(2, 10);
            const uniqueFilename = `${timestamp}_${randomId}_${filename}`;
            console.log(`   Unique filename: ${uniqueFilename}`);

            // Upload to Supabase Storage
            console.log(`   Uploading to Supabase storage...`);
            const { data, error } = await this.client.storage
                .from(bucket)
                .upload(uniqueFilename, imageBuffer, {
                    contentType: 'image/png',
                    upsert: false
                });

            if (error) {
                console.error(`   ❌ Upload error: ${JSON.stringify(error)}`);
                throw error;
            }
            
            console.log(`   ✓ Upload successful! Data: ${JSON.stringify(data)}`);

            // Get public URL
            console.log(`   Getting public URL...`);
            const { data: urlData } = this.client.storage
                .from(bucket)
                .getPublicUrl(uniqueFilename);

            console.log(`✅ Image uploaded successfully: ${urlData.publicUrl}`);
            return urlData.publicUrl;

        } catch (e) {
            console.error(`❌ CRITICAL ERROR in uploadImageToStorage:`);
            console.error(`   Message: ${e.message}`);
            console.error(`   Stack: ${e.stack}`);
            // DON'T return base64 - throw the error so we can see what's wrong!
            throw new Error(`Supabase upload failed: ${e.message}`);
        }
    }
}

// Singleton instance
let supabaseService = null;

export function getSupabaseService() {
    if (!supabaseService) {
        supabaseService = new SupabaseService();
    }
    return supabaseService;
}

export default SupabaseService;
