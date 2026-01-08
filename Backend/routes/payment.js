import express from 'express';
import {
  createRazorpayOrder,
  verifyRazorpayPayment,
  createStripeCheckout,
  verifyStripePayment,
  getUserOrders
} from '../controllers/paymentController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Razorpay routes
router.post('/razorpay/create-order', protect, createRazorpayOrder);
router.post('/razorpay/verify', protect, verifyRazorpayPayment);

// Stripe routes
router.post('/stripe/create-checkout', protect, createStripeCheckout);
router.post('/stripe/verify', protect, verifyStripePayment);

// Common routes
router.get('/orders', protect, getUserOrders);

export default router;