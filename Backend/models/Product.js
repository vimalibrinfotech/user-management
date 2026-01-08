import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true
    },
    description: {
      type: String,
      required: [true, 'Product description is required']
    },
    price: {
      type: Number,
      required: [true, 'Product price is required'],
      min: [0, 'Price cannot be negative']
    },
    priceUSD: {
      type: Number,
      required: [true, 'USD price is required'],
      min: [0, 'Price cannot be negative']
    },
    image: {
      type: String,
      default: null // Cloudinary URL
    },
    category: {
      type: String,
      enum: ['subscription', 'feature', 'service', 'other'],
      default: 'other'
    },
    features: {
      type: [String],
      default: []
    },
    isActive: {
      type: Boolean,
      default: true
    },
    stock: {
      type: Number,
      default: -1 // -1 means unlimited (for digital products)
    }
  },
  {
    timestamps: true
  }
);

const Product = mongoose.model('Product', productSchema);

export default Product;