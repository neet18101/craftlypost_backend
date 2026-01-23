import express from 'express';
import 'express-async-errors';
import { getSupabaseService } from '../services/supabaseService.js';

const router = express.Router();

// GET /credits - Get user credits
router.get('/', async (req, res) => {
    try {
        const supabaseService = getSupabaseService();
        
        // TODO: Get actual user_id from authentication
        const userId = '00000000-0000-0000-0000-000000000000';
        
        const credits = await supabaseService.getUserCredits(userId);
        
        res.json({
            textCredits: credits.text || 150,
            imageCredits: credits.image || 25,
            videoCredits: credits.video || 10,
            totalCredits: (credits.text || 150) + (credits.image || 25) + (credits.video || 10),
            plan: 'free'
        });
    } catch (error) {
        console.error(`Credits fetch error: ${error.message}`);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch credits'
        });
    }
});

// POST /credits/deduct - Deduct credits
router.post('/deduct', async (req, res) => {
    try {
        const { creditType, amount = 1 } = req.body;
        
        if (!creditType || !['text', 'image', 'video'].includes(creditType)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid credit type. Must be text, image, or video.'
            });
        }
        
        const supabaseService = getSupabaseService();
        
        // TODO: Get actual user_id from authentication
        const userId = '00000000-0000-0000-0000-000000000000';
        
        const success = await supabaseService.deductCredit(userId, creditType);
        
        if (success) {
            const credits = await supabaseService.getUserCredits(userId);
            res.json({
                success: true,
                creditsRemaining: credits[creditType] || 0,
                message: `${amount} ${creditType} credit(s) deducted successfully`
            });
        } else {
            res.status(402).json({
                success: false,
                creditsRemaining: 0,
                message: 'Insufficient credits'
            });
        }
    } catch (error) {
        console.error(`Credits deduction error: ${error.message}`);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to deduct credits'
        });
    }
});

export default router;
