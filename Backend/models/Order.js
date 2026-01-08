import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    amount: {
      type: Number,
      required: true
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
      required: true
    },
    status: {
      type: String,
      enum: ['created', 'pending', 'completed', 'failed'],
      default: 'created'
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

const Order = mongoose.model('Order', orderSchema);

export default Order;