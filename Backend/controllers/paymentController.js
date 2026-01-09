import Razorpay from 'razorpay';
import Stripe from 'stripe';
import crypto from 'crypto';
import Order from '../models/Order.js';
import Product from '../models/Product.js';

// Initialize payment gateways with validation
let razorpay;

// Validate and initialize Razorpay
if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  console.warn('⚠️  Razorpay credentials not found in environment variables');
  console.warn('⚠️  Razorpay payments will be disabled');
  console.warn('⚠️  Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to .env file');
} else {
  try {
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });
    console.log('✅ Razorpay initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize Razorpay:', error.message);
  }
}

// Initialize Stripe
const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

if (!stripe) {
  console.warn('⚠️  Stripe credentials not found in environment variables');
}

// @desc    Create Razorpay order
// @route   POST /api/payment/razorpay/create-order
// @access  Private
export const createRazorpayOrder = async (req, res) => {
  try {
    // Check if Razorpay is initialized
    if (!razorpay) {
      return res.status(503).json({
        success: false,
        message: 'Razorpay payment gateway is not configured. Please use Stripe or contact administrator.'
      });
    }

    const { amount, productId } = req.body;

    // Validation
    if (!productId) {
      return res.status(400).json({
        success: false,
        message: 'Product ID is required'
      });
    }

    // Get product details
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Validate amount matches product price
    if (amount !== product.price) {
      return res.status(400).json({
        success: false,
        message: 'Invalid amount'
      });
    }

    // Check product availability
    if (!product.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Product is not available'
      });
    }

    if (product.stock === 0) {
      return res.status(400).json({
        success: false,
        message: 'Product is out of stock'
      });
    }

    // Create order in Razorpay
    const options = {
      amount: amount * 100, // Convert to paise
      currency: 'INR',
      receipt: `receipt_${Date.now()}_${req.user._id}`
    };

    const razorpayOrder = await razorpay.orders.create(options);

    // Save order in database
    const order = await Order.create({
      userId: req.user._id,
      productId: product._id,
      amount,
      currency: 'INR',
      paymentGateway: 'razorpay',
      paymentId: 'pending',
      orderId: razorpayOrder.id,
      status: 'created',
      productName: product.name,
      productDescription: product.description,
      receipt: options.receipt
    });

    res.status(200).json({
      success: true,
      order: {
        id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        key: process.env.RAZORPAY_KEY_ID // Public key - safe to expose to client
      },
      dbOrderId: order._id
    });
  } catch (error) {
    console.error('Razorpay order creation error:', error);
    res.status(500).json({
      success: false,
      message: error.error?.description || error.message || 'Failed to create order'
    });
  }
};

// @desc    Verify Razorpay payment
// @route   POST /api/payment/razorpay/verify
// @access  Private
export const verifyRazorpayPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, dbOrderId } = req.body;

    // Validation
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !dbOrderId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required payment details'
      });
    }

    // Check if order exists
    const order = await Order.findById(dbOrderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if order already processed
    if (order.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Order already processed'
      });
    }

    // Verify user authorization
    if (order.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to order'
      });
    }

    // Create signature for verification
    const sign = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(sign.toString())
      .digest('hex');

    // Verify signature
    if (razorpay_signature === expectedSign) {
      // Update order status
      order.status = 'completed';
      order.paymentId = razorpay_payment_id;
      await order.save();

      // Update product stock if applicable
      if (order.productId) {
        const product = await Product.findById(order.productId);
        if (product && product.stock !== -1) {
          product.stock -= 1;
          if (product.stock === 0) {
            product.isActive = false; // Auto-deactivate when out of stock
          }
          await product.save();
        }
      }

      return res.status(200).json({
        success: true,
        message: 'Payment verified successfully',
        order: {
          orderId: order.orderId,
          productName: order.productName
        }
      });
    } else {
      // Invalid signature - mark as failed
      order.status = 'failed';
      await order.save();

      return res.status(400).json({
        success: false,
        message: 'Invalid payment signature'
      });
    }
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Payment verification failed'
    });
  }
};

// @desc    Create Stripe checkout session
// @route   POST /api/payment/stripe/create-checkout
// @access  Private
export const createStripeCheckout = async (req, res) => {
  try {
    // Check if Stripe is initialized
    if (!stripe) {
      return res.status(503).json({
        success: false,
        message: 'Stripe payment gateway is not configured. Please use Razorpay or contact administrator.'
      });
    }

    const { amount, productId } = req.body;

    // Validation
    if (!productId) {
      return res.status(400).json({
        success: false,
        message: 'Product ID is required'
      });
    }

    // Get and validate product
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Verify amount matches product price
    if (amount !== product.priceUSD) {
      return res.status(400).json({
        success: false,
        message: 'Invalid amount'
      });
    }

    // Check product availability
    if (!product.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Product is not available'
      });
    }

    if (product.stock === 0) {
      return res.status(400).json({
        success: false,
        message: 'Product is out of stock'
      });
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: product.name,
              description: product.description,
              images: product.image ? [product.image] : []
            },
            unit_amount: Math.round(product.priceUSD * 100) // Convert to cents
          },
          quantity: 1
        }
      ],
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/payment/cancel`,
      metadata: {
        userId: req.user._id.toString(),
        productId: product._id.toString()
      }
    });

    // Save order in database
    const order = await Order.create({
      userId: req.user._id,
      productId: product._id,
      amount: product.priceUSD,
      currency: 'USD',
      paymentGateway: 'stripe',
      paymentId: session.id,
      orderId: session.id,
      status: 'pending',
      productName: product.name,
      productDescription: product.description
    });

    res.status(200).json({
      success: true,
      sessionId: session.id,
      url: session.url,
      dbOrderId: order._id
    });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create checkout session'
    });
  }
};

// @desc    Verify Stripe payment
// @route   POST /api/payment/stripe/verify
// @access  Private
export const verifyStripePayment = async (req, res) => {
  try {
    if (!stripe) {
      return res.status(503).json({
        success: false,
        message: 'Stripe payment gateway is not configured'
      });
    }

    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: 'Session ID is required'
      });
    }

    // Retrieve session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status === 'paid') {
      // Find and update order
      const order = await Order.findOne({ paymentId: sessionId });
      
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      // Check if already processed
      if (order.status === 'completed') {
        return res.status(200).json({
          success: true,
          message: 'Payment already verified',
          order: {
            orderId: order.orderId,
            productName: order.productName
          }
        });
      }

      // Update order status
      order.status = 'completed';
      await order.save();

      // Update product stock if applicable
      if (order.productId) {
        const product = await Product.findById(order.productId);
        if (product && product.stock !== -1) {
          product.stock -= 1;
          if (product.stock === 0) {
            product.isActive = false;
          }
          await product.save();
        }
      }

      return res.status(200).json({
        success: true,
        message: 'Payment verified successfully',
        order: {
          orderId: order.orderId,
          productName: order.productName
        }
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Payment not completed'
      });
    }
  } catch (error) {
    console.error('Stripe verification error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Payment verification failed'
    });
  }
};

// @desc    Get user orders
// @route   GET /api/payment/orders
// @access  Private
export const getUserOrders = async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user._id })
      .populate('productId', 'name image category')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      orders
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch orders'
    });
  }
};

