import Razorpay from 'razorpay';
import Stripe from 'stripe';
import crypto from 'crypto';
import Order from '../models/Order.js';

// Initialize payment gateways
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// @desc    Create Razorpay order
// @route   POST /api/payment/razorpay/create-order
// @access  Private

export const createRazorpayOrder = async (req, res) => {
  try {
    const { amount, productId } = req.body;  // ← productId add kiya

    // Get product details
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Validation
    if (!amount || amount < 1) {
      return res.status(400).json({
        success: false,
        message: 'Invalid amount'
      });
    }

    // Create order in Razorpay
    const options = {
      amount: amount * 100,
      currency: 'INR',
      receipt: `receipt_${Date.now()}`
    };

    const razorpayOrder = await razorpay.orders.create(options);

    // Save order in database
    const order = await Order.create({
      userId: req.user._id,
      amount,
      currency: 'INR',
      paymentGateway: 'razorpay',
      paymentId: 'pending',
      orderId: razorpayOrder.id,
      status: 'created',
      productName: product.name,  // ← Dynamic
      productDescription: product.description,  // ← Dynamic
      receipt: options.receipt
    });

    res.status(200).json({
      success: true,
      order: {
        id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        key: process.env.RAZORPAY_KEY_ID
      },
      dbOrderId: order._id
    });
  } catch (error) {
    console.error('Razorpay order creation error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


// @desc    Verify Razorpay payment
// @route   POST /api/payment/razorpay/verify
// @access  Private
export const verifyRazorpayPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, dbOrderId } = req.body;

    // Create signature
    const sign = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(sign.toString())
      .digest('hex');

    // Verify signature
    if (razorpay_signature === expectedSign) {
      // Update order status
      await Order.findByIdAndUpdate(dbOrderId, {
        status: 'completed',
        paymentId: razorpay_payment_id
      });

      return res.status(200).json({
        success: true,
        message: 'Payment verified successfully'
      });
    } else {
      // Update order as failed
      await Order.findByIdAndUpdate(dbOrderId, {
        status: 'failed'
      });

      return res.status(400).json({
        success: false,
        message: 'Invalid signature'
      });
    }
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create Stripe checkout session
// @route   POST /api/payment/stripe/create-checkout
// @access  Private
export const createStripeCheckout = async (req, res) => {
  try {
    const { amount, productName, productDescription } = req.body;

    // Validation
    if (!amount || amount < 1) {
      return res.status(400).json({
        success: false,
        message: 'Invalid amount'
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
              name: productName,
              description: productDescription
            },
            unit_amount: amount * 100 // Convert to cents
          },
          quantity: 1
        }
      ],
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/payment/cancel`,
      metadata: {
        userId: req.user._id.toString()
      }
    });

    // Save order in database
    const order = await Order.create({
      userId: req.user._id,
      amount,
      currency: 'USD',
      paymentGateway: 'stripe',
      paymentId: session.id,
      orderId: session.id,
      status: 'pending',
      productName,
      productDescription
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
      message: error.message
    });
  }
};

// @desc    Verify Stripe payment
// @route   POST /api/payment/stripe/verify
// @access  Private
export const verifyStripePayment = async (req, res) => {
  try {
    const { sessionId } = req.body;

    // Retrieve session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status === 'paid') {
      // Update order status
      await Order.findOneAndUpdate(
        { paymentId: sessionId },
        { status: 'completed' }
      );

      return res.status(200).json({
        success: true,
        message: 'Payment verified successfully'
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
      message: error.message
    });
  }
};

// @desc    Get user orders
// @route   GET /api/payment/orders
// @access  Private
export const getUserOrders = async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user._id })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      orders
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};