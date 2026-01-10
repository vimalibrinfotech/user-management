import Razorpay from 'razorpay';
import Stripe from 'stripe';
import crypto from 'crypto';
import mongoose from 'mongoose';
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

    const { amount, productId, idempotencyKey } = req.body;

    // Validation
    if (!productId) {
      return res.status(400).json({
        success: false,
        message: 'Product ID is required'
      });
    }

    // Check for duplicate order with idempotency key
    if (idempotencyKey) {
      const existingOrder = await Order.findOne({
        userId: req.user._id,
        receipt: idempotencyKey,
        status: { $in: ['created', 'pending', 'completed'] }
      });

      if (existingOrder) {
        console.info('Returning existing order for idempotency key:', {
          orderId: existingOrder.orderId,
          userId: req.user._id
        });

        return res.status(200).json({
          success: true,
          order: {
            id: existingOrder.orderId,
            amount: existingOrder.amount * 100,
            currency: existingOrder.currency,
            key: process.env.RAZORPAY_KEY_ID
          },
          dbOrderId: existingOrder._id,
          fromCache: true
        });
      }
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
    const receiptId = idempotencyKey || `rcpt_${Date.now().toString().slice(-10)}`;
    const options = {
      amount: amount * 100, // Convert to paise
      currency: 'INR',
      receipt: receiptId
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
      receipt: receiptId
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
    // ISSUE 4 FIX: Don't log sensitive data
    console.error('Razorpay order creation error:', {
      message: error.message,
      code: error.error?.code,
      reason: error.error?.reason
    });
    
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
  // ISSUE 2 FIX: Use MongoDB session for transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, dbOrderId } = req.body;

    // Validation
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !dbOrderId) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Missing required payment details'
      });
    }

    // Check if order exists
    const order = await Order.findById(dbOrderId).session(session);
    if (!order) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if order already processed
    if (order.status === 'completed') {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Order already processed'
      });
    }

    // Verify user authorization
    if (order.userId.toString() !== req.user._id.toString()) {
      await session.abortTransaction();
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
      await order.save({ session });

      // Atomic stock decrement with transaction
      if (order.productId && order.productId.toString() !== 'undefined') {
        const product = await Product.findOneAndUpdate(
          { 
            _id: order.productId,
            $or: [
              { stock: -1 }, // Unlimited stock
              { stock: { $gt: 0 } } // Stock available
            ]
          },
          { 
            $inc: { stock: -1 } // Atomic decrement
          },
          { 
            new: true,
            session 
          }
        );

        if (!product) {
          // Stock was depleted during payment
          console.warn('Stock depleted during payment processing:', {
            productId: order.productId,
            orderId: order.orderId
          });
        } else if (product.stock === 0) {
          // Auto-deactivate when stock hits zero
          product.isActive = false;
          await product.save({ session });
        }
      }

      // Commit transaction
      await session.commitTransaction();

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
      await order.save({ session });
      
      await session.commitTransaction();

      return res.status(400).json({
        success: false,
        message: 'Invalid payment signature'
      });
    }
  } catch (error) {
    await session.abortTransaction();
    
    // Don't log sensitive data
    console.error('Payment verification error:', {
      message: error.message,
      orderId: req.body.dbOrderId
    });
    
    res.status(500).json({
      success: false,
      message: 'Payment verification failed'
    });
  } finally {
    session.endSession();
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

    const { amount, productId, idempotencyKey } = req.body;

    // Validation
    if (!productId) {
      return res.status(400).json({
        success: false,
        message: 'Product ID is required'
      });
    }

    //  Check for duplicate order
    if (idempotencyKey) {
      const existingOrder = await Order.findOne({
        userId: req.user._id,
        receipt: idempotencyKey,
        status: { $in: ['pending', 'completed'] }
      });

      if (existingOrder && existingOrder.paymentId) {
        console.info('Returning existing Stripe session:', {
          sessionId: existingOrder.paymentId,
          userId: req.user._id
        });

        return res.status(200).json({
          success: true,
          sessionId: existingOrder.paymentId,
          url: `${process.env.FRONTEND_URL}/payment/success?session_id=${existingOrder.paymentId}`,
          dbOrderId: existingOrder._id,
          fromCache: true
        });
      }
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
      productDescription: product.description,
      receipt: idempotencyKey || `stripe_${Date.now()}`
    });

    res.status(200).json({
      success: true,
      sessionId: session.id,
      url: session.url,
      dbOrderId: order._id
    });
  } catch (error) {
    // Don't log sensitive data
    console.error('Stripe checkout error:', {
      message: error.message,
      type: error.type
    });
    
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
  // Use MongoDB session for transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (!stripe) {
      await session.abortTransaction();
      return res.status(503).json({
        success: false,
        message: 'Stripe payment gateway is not configured'
      });
    }

    const { sessionId } = req.body;

    if (!sessionId) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Session ID is required'
      });
    }

    // Retrieve session from Stripe
    const stripeSession = await stripe.checkout.sessions.retrieve(sessionId);

    if (stripeSession.payment_status === 'paid') {
      // Find and update order
      const order = await Order.findOne({ paymentId: sessionId }).session(session);
      
      if (!order) {
        await session.abortTransaction();
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      // Check if already processed
      if (order.status === 'completed') {
        await session.abortTransaction();
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
      await order.save({ session });

      // Atomic stock decrement with transaction
      if (order.productId) {
        const product = await Product.findOneAndUpdate(
          { 
            _id: order.productId,
            $or: [
              { stock: -1 }, // Unlimited stock
              { stock: { $gt: 0 } } // Stock available
            ]
          },
          { 
            $inc: { stock: -1 } // Atomic decrement
          },
          { 
            new: true,
            session 
          }
        );

        if (!product) {
          console.warn('Stock depleted during Stripe payment:', {
            productId: order.productId,
            orderId: order.orderId
          });
        } else if (product.stock === 0) {
          product.isActive = false;
          await product.save({ session });
        }
      }

      // Commit transaction
      await session.commitTransaction();

      return res.status(200).json({
        success: true,
        message: 'Payment verified successfully',
        order: {
          orderId: order.orderId,
          productName: order.productName
        }
      });
    } else {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Payment not completed'
      });
    }
  } catch (error) {
    await session.abortTransaction();
    
    // Don't log sensitive data
    console.error('Stripe verification error:', {
      message: error.message,
      type: error.type
    });
    
    res.status(500).json({
      success: false,
      message: 'Payment verification failed'
    });
  } finally {
    session.endSession();
  }
};

// Stripe webhook handler
// @desc    Handle Stripe webhooks
// @route   POST /api/payment/stripe/webhook
// @access  Public (but verified with signature)
export const handleStripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('Stripe webhook secret not configured');
    return res.status(500).send('Webhook secret not configured');
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      webhookSecret
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', {
      message: err.message
    });
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        
        // Update order
        const order = await Order.findOne({ paymentId: session.id });
        
        if (order && order.status !== 'completed') {
          const mongoSession = await mongoose.startSession();
          mongoSession.startTransaction();

          try {
            order.status = 'completed';
            await order.save({ session: mongoSession });

            // Update stock atomically
            if (order.productId) {
              const product = await Product.findOneAndUpdate(
                { 
                  _id: order.productId,
                  $or: [{ stock: -1 }, { stock: { $gt: 0 } }]
                },
                { $inc: { stock: -1 } },
                { new: true, session: mongoSession }
              );

              if (product && product.stock === 0) {
                product.isActive = false;
                await product.save({ session: mongoSession });
              }
            }

            await mongoSession.commitTransaction();
            mongoSession.endSession();

            console.info('Webhook processed successfully:', {
              orderId: order.orderId,
              sessionId: session.id
            });
          } catch (error) {
            await mongoSession.abortTransaction();
            mongoSession.endSession();
            throw error;
          }
        }
        break;

      case 'checkout.session.expired':
        const expiredSession = event.data.object;
        await Order.findOneAndUpdate(
          { paymentId: expiredSession.id },
          { status: 'failed' }
        );
        break;

      default:
        console.log(`Unhandled webhook event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', {
      message: error.message,
      eventType: event.type
    });
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};

// @desc    Get user orders
// @route   GET /api/payment/orders
// @access  Private
export const getUserOrders = async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user._id })
      .populate('productId', 'name image category price priceUSD')
      .sort({ createdAt: -1 })
      .lean(); // Use lean() for better performance

    // Ensure all required fields are present
    const ordersWithData = orders.map(order => ({
      ...order,
      amount: order.amount || 0,
      currency: order.currency || 'INR',
      productName: order.productName || 'Unknown Product',
      status: order.status || 'unknown'
    }));

    res.status(200).json({
      success: true,
      count: ordersWithData.length,
      orders: ordersWithData
    });
  } catch (error) {
    // Don't log sensitive data
    console.error('Get orders error:', {
      message: error.message
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders'
    });
  }
};