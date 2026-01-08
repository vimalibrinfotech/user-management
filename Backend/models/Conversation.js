import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      }
    ],
    
    isGroup: {
      type: Boolean,
      default: false
    },
    
    groupName: {
      type: String,
      trim: true,
      required: function() {
        return this.isGroup;
      }
    },
    
    groupDescription: {
      type: String,
      trim: true
    },
    
    groupIcon: {
      type: String, // Cloudinary URL
      default: null
    },
    
    groupAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: function() {
        return this.isGroup;
      }
    },
    
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message'
    },
    
  },
  {
    timestamps: true
  }
);

// Indexes for better performance
conversationSchema.index({ participants: 1 });
conversationSchema.index({ updatedAt: -1 });    

// Method to check if user is participant
conversationSchema.methods.isParticipant = function(userId) {
  return this.participants.some(
    participant => participant.toString() === userId.toString()
  );
};

// Method to check if user is admin (for group chats)
conversationSchema.methods.isAdmin = function(userId) {
  if (!this.isGroup) return false;
  return this.groupAdmin.toString() === userId.toString();
};

const Conversation = mongoose.model('Conversation', conversationSchema);

export default Conversation;