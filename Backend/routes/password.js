import express from 'express';
import { changePassword, forgotPassword, resetPassword } from '../controllers/passwordController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/change', protect, changePassword);
router.post('/forgot', forgotPassword);
router.post('/reset', resetPassword);

export default router;