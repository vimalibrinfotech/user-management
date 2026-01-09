import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true // Add index for faster queries
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      default: null // Optional - for tracking which product was purchased
    },
    amount: {
      type: Number,
      required: true,
      min: [0, 'Amount cannot be negative']
    },
    currency: {
      type: String,
      default: 'INR',
      enum: ['INR', 'USD', 'EUR']
    },
    paymentGateway: {
      type: String,
      required: true,
      enum: ['razorpay', 'stripe']
    },
    paymentId: {
      type: String,
      required: true
    },
    orderId: {
      type: String,
      required: true,
      unique: true // Ensure order IDs are unique
    },
    status: {
      type: String,
      enum: ['created', 'pending', 'completed', 'failed'],
      default: 'created',
      index: true // Add index for status filtering
    },
    productName: {
      type: String,
      required: true
    },
    productDescription: {
      type: String
    },
    receipt: {
      type: String
    }
  },
  {
    timestamps: true
  }
);

// Compound index for efficient queries
orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });

const Order = mongoose.model('Order', orderSchema);

export default Order;