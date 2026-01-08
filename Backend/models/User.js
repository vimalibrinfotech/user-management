import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      minlength: [2, 'First name must be at least 2 characters']
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      minlength: [2, 'Last name must be at least 2 characters']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
    },
    password: {
      type: String,
      required: function() {
        // Password required only if not Google auth
        return !this.googleId;
      },
      minlength: [8, 'Password must be at least 8 characters']
    },
    phones: {
      type: [String],
      default: [],
      validate: {
        validator: function(arr) {
          return arr.every(phone => /^[0-9]{10}$/.test(phone));
        },
        message: 'Each phone number must be 10 digits'
      }
    },
    address: {
      type: String,
      default: 'Not provided'
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user'
    },
    profilePhoto: {
      type: String,
      default: null
    },
    // Google OAuth fields
    googleId: {
      type: String,
      unique: true,
      sparse: true // Allows null values, unique only when exists
    },
    authProvider: {
      type: String,
      enum: ['local', 'google'],
      default: 'local'
    },
    // Password Reset Fields
    passwordResetOTP: {
      type: String,
      default: null
    },
    passwordResetExpires: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Hash password before saving (only for local auth)
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  
  // Skip hashing for Google users (they don't have real password)
  if (this.authProvider === 'google') {
    return next();
  }
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);

export default User;