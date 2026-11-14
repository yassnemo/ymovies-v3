import { type Request, type Response, type NextFunction } from 'express';
import { supabaseAdmin } from './supabaseAdmin';
import { storage } from './storage';

/**
 * Middleware to verify Supabase JWT tokens.
 * Replaces the old Firebase auth middleware.
 *
 * The client sends: Authorization: Bearer <supabase-access-token>
 * We verify it using supabaseAdmin.auth.getUser(token).
 */
export const supabaseAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res
        .status(401)
        .json({ error: 'Unauthorized - No token provided' });
    }

    const token = authHeader.split('Bearer ')[1];
    if (!token) {
      return res
        .status(401)
        .json({ error: 'Unauthorized - Invalid token format' });
    }

    try {
      const {
        data: { user },
        error
      } = await supabaseAdmin.auth.getUser(token);

      if (error || !user) {
        return res.status(401).json({ error: 'Unauthorized - Invalid token' });
      }

      // Attach user info to request in a compatible shape
      // We keep `uid` so existing route handlers (req.user.uid) still work
      req.user = {
        uid: user.id,
        sub: user.id,
        email: user.email || undefined,
        name:
          user.user_metadata?.full_name || user.user_metadata?.first_name || '',
        picture:
          user.user_metadata?.avatar_url || user.user_metadata?.picture || null
      };

      // Automatically upsert user in our database
      try {
        const meta = user.user_metadata || {};
        let firstName = meta.first_name || meta.full_name?.split(' ')[0] || '';
        let lastName = meta.last_name || '';
        if (!lastName && meta.full_name) {
          const parts = meta.full_name.split(' ');
          lastName = parts.slice(1).join(' ');
        }

        await storage.upsertUser({
          id: user.id,
          email: user.email || null,
          firstName: firstName || null,
          lastName: lastName || null,
          profileImageUrl: meta.avatar_url || meta.picture || null
        });
      } catch (dbError) {
        // Don't block the request if user upsert fails
        console.error(`Failed to upsert user ${user.id}:`, dbError);
      }

      next();
    } catch (error) {
      console.error('Error verifying Supabase token:', error);
      return res.status(401).json({ error: 'Unauthorized - Invalid token' });
    }
  } catch (error) {
    console.error('Authentication error:', error);
    return res
      .status(500)
      .json({ error: 'Internal server error during authentication' });
  }
};

// Middleware to check if the user has the admin role (keep for future use)
export const requireAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res
      .status(401)
      .json({ error: 'Unauthorized - User not authenticated' });
  }

  const { admin: isAdmin } = req.user as { admin?: boolean };

  if (!isAdmin) {
    return res.status(403).json({ error: 'Forbidden - Admin access required' });
  }

  next();
};
