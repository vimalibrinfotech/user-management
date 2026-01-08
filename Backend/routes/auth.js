import express from 'express';
import { register, login, logout, getProfile } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import passport from '../config/passport.js';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Regular auth routes
router.post('/register', register);
router.post('/login', login);
router.post('/logout', protect, logout);
router.get('/profile', protect, getProfile);

// Google OAuth routes
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email']
  })
);

router.get(
  '/google/callback',
  passport.authenticate('google', { 
    session: false,
    failureRedirect: `${process.env.FRONTEND_URL}/login?error=google_auth_failed`
  }),
  (req, res) => {
    try {
      // Generate JWT token
      const token = jwt.sign(
        { id: req.user._id },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      // Set cookie
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000
      });

      // Redirect to frontend
      res.redirect(`${process.env.FRONTEND_URL}/profile?auth=success`);
    } catch (error) {
      console.error('Callback error:', error);
      res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`);
    }
  }
);

export default router;