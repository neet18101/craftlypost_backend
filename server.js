import express from 'express';
import cors from 'cors';
import 'express-async-errors';
import { getSettings } from './config/index.js';
import contentRoutes from './routes/content.js';
import creditsRoutes from './routes/credits.js';
import dashboardRoutes from './routes/dashboard.js';
import errorHandler from './middleware/errorHandler.js';

// Initialize settings
const settings = getSettings();

// Create Express app
const app = express();

// Middleware
app.use(express.json({ limit: '50mb' })); // Increased limit for base64 images
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Configure CORS - Allow all origins for development
app.use(cors({
    origin: '*',
    credentials: false,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['*']
}));

// Health check endpoints
app.get('/', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'CraftlyPost API',
        version: '1.0.0'
    });
});

app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        openaiConfigured: !!settings.openaiApiKey,
        supabaseConfigured: !!(settings.supabaseUrl && settings.supabaseKey)
    });
});

// API Routes
app.use('/content', contentRoutes);
app.use('/credits', creditsRoutes);
app.use('/dashboard', dashboardRoutes);

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
const PORT = settings.port;
const HOST = settings.host;

app.listen(PORT, HOST, () => {
    console.log('='.repeat(60));
    console.log(`🚀 CraftlyPost API Server`);
    console.log('='.repeat(60));
    console.log(`📍 Server running on http://${HOST}:${PORT}`);
    console.log(`📚 API Docs: http://${HOST}:${PORT}/`);
    console.log(`🏥 Health Check: http://${HOST}:${PORT}/health`);
    console.log('='.repeat(60));
    console.log('🔧 Configuration:');
    console.log(`   • OpenAI: ${settings.openaiApiKey ? '✓ Configured' : '✗ Not configured'}`);
    console.log(`   • Gemini: ${settings.googleApiKey ? '✓ Configured' : '✗ Not configured'}`);
    console.log(`   • Groq: ${settings.groqApiKey ? '✓ Configured' : '✗ Not configured'}`);
    console.log(`   • Supabase: ${settings.supabaseUrl && settings.supabaseKey ? '✓ Configured' : '✗ Not configured'}`);
    console.log('='.repeat(60));
    console.log('Ready to generate content! 🎨');
    console.log('='.repeat(60));
});

export default app;
