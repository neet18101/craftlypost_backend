import { getSupabaseService } from '../services/supabaseService.js';

/**
 * Authentication middleware
 * Verifies Supabase JWT token and attaches user to request
 * Sets req.user to null if no valid token (allows anonymous access)
 */
export async function authenticateUser(req, res, next) {
    try {
        const supabaseService = getSupabaseService();
        
        // If Supabase not configured, allow anonymous access
        if (!supabaseService.isConfigured()) {
            req.user = null;
            return next();
        }

        // Extract token from Authorization header
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            // No token provided - allow anonymous access
            req.user = null;
            return next();
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix

        // Verify token using Supabase client
        const { data, error } = await supabaseService.client.auth.getUser(token);

        if (error || !data.user) {
            console.warn(`Auth token verification failed: ${error?.message || 'Invalid token'}`);
            req.user = null;
            return next();
        }

        // Attach verified user to request
        req.user = data.user;
        console.log(`✓ Authenticated user: ${data.user.email || data.user.id}`);
        next();

    } catch (error) {
        console.error(`Auth middleware error: ${error.message}`);
        req.user = null;
        next();
    }
}

/**
 * Require authentication middleware
 * Returns 401 if user is not authenticated
 */
export function requireAuth(req, res, next) {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            error: 'Authentication required. Please log in.'
        });
    }
    next();
}
