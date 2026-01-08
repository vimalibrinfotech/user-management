import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true // For faster queries
    },
    
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    
    content: {
      type: String,
      required: true,
      trim: true
    },
    
    messageType: {
      type: String,
      enum: ['text', 'image', 'file'],
      default: 'text'
    },
    
    // For file/image messages
    fileUrl: {
      type: String,
      default: null
    },
    
    fileName: {
      type: String,
      default: null
    },
    
    fileSize: {
      type: Number,
      default: null
    },
    
    // Read receipts
    readBy: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        readAt: {
          type: Date,
          default: Date.now
        }
      }
    ],
    
    // Soft delete (for "delete for me" feature)
    deletedFor: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    
    // Reply to message (for threading)
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Indexes for performance
messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ sender: 1 });

// Method to mark message as read by user
messageSchema.methods.markAsRead = function(userId) {
  const alreadyRead = this.readBy.some(
    item => item.user.toString() === userId.toString()
  );
  
  if (!alreadyRead) {
    this.readBy.push({
      user: userId,
      readAt: new Date()
    });
  }
};

// Method to check if message is read by specific user
messageSchema.methods.isReadBy = function(userId) {
  return this.readBy.some(
    item => item.user.toString() === userId.toString()
  );
};

const Message = mongoose.model('Message', messageSchema);

export default Message; 