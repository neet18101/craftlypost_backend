import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

class Settings {
    constructor() {
        // Server settings
        this.host = process.env.HOST || '0.0.0.0';
        this.port = parseInt(process.env.PORT || '8000', 10);
        this.debug = process.env.DEBUG === 'true' || process.env.NODE_ENV !== 'production';
        
        // API Keys
        this.openaiApiKey = process.env.OPENAI_API_KEY || '';
        this.googleApiKey = process.env.GOOGLE_API_KEY || '';
        this.groqApiKey = process.env.GROQ_API_KEY || '';
        this.huggingfaceApiKey = process.env.HUGGINGFACE_API_KEY || '';
        
        // Supabase
        this.supabaseUrl = process.env.SUPABASE_URL || '';
        this.supabaseKey = process.env.SUPABASE_KEY || '';
        
        // Validate critical settings
        this.validate();
    }
    
    validate() {
        // At least one AI provider must be configured
        const hasAIProvider = this.openaiApiKey || this.googleApiKey || this.groqApiKey;
        if (!hasAIProvider) {
            console.warn('⚠️  No AI provider configured. Set OPENAI_API_KEY, GOOGLE_API_KEY, or GROQ_API_KEY');
        }
        
        // Supabase is optional but recommended
        if (!this.supabaseUrl || !this.supabaseKey) {
            console.warn('⚠️  Supabase not configured. Database features will be disabled.');
        }
    }
}

// Singleton instance
let settings = null;

export function getSettings() {
    if (!settings) {
        settings = new Settings();
    }
    return settings;
}

export default getSettings;
