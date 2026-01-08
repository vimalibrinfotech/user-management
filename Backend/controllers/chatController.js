import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import User from '../models/User.js';

// @desc    Search users for chat (excluding current user)
// @route   GET /api/chat/users
// @access  Private
export const searchUsersForChat = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const { search } = req.query;

    // Build query
    let query = { _id: { $ne: currentUserId } };

    // Add search filter if provided
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Get users with limited fields (security)
    const users = await User.find(query)
      .select('firstName lastName email profilePhoto')
      .limit(50); // Limit results to prevent overload

    res.status(200).json({
      success: true,
      users
    });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create a new conversation (one-to-one or group)
// @route   POST /api/chat/conversations
// @access  Private
export const createConversation = async (req, res) => {
  try {
    const { participantIds, isGroup, groupName, groupDescription } = req.body;
    const currentUserId = req.user._id;

    // Debug log
    console.log('Request body:', req.body);
    console.log('ParticipantIds type:', typeof participantIds, participantIds);

    // Validation
    if (!participantIds || participantIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Participant IDs are required'
      });
    }

    // Ensure participantIds is an array
    const participantIdsArray = Array.isArray(participantIds) ? participantIds : [participantIds];

    // Add current user to participants if not already included
    const allParticipants = [...new Set([currentUserId.toString(), ...participantIdsArray])];

    console.log('All participants:', allParticipants);

    // For one-to-one chat, check if conversation already exists
    if (!isGroup && allParticipants.length === 2) {
      const existingConversation = await Conversation.findOne({
        isGroup: false,
        participants: { $all: allParticipants, $size: 2 }
      }).populate('participants', 'firstName lastName email profilePhoto');

      if (existingConversation) {
        return res.status(200).json({
          success: true,
          message: 'Conversation already exists',
          conversation: existingConversation
        });
      }
    }

    // Group chat validation
    if (isGroup) {
      if (!groupName || groupName.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Group name is required (min 2 characters)'
        });
      }

      if (allParticipants.length < 3) {
        return res.status(400).json({
          success: false,
          message: 'Group must have at least 3 participants'
        });
      }
    }

    // Create conversation
    const conversation = await Conversation.create({
      participants: allParticipants,
      isGroup: isGroup || false,
      groupName: isGroup ? groupName : undefined,
      groupDescription: isGroup ? groupDescription : undefined,
      groupAdmin: isGroup ? currentUserId : undefined
    });

    // Populate participants
    await conversation.populate('participants', 'firstName lastName email profilePhoto');

    // Get Socket.IO instance
    const io = req.app.get('io');

    // Notify all participants about new conversation
    allParticipants.forEach(participantId => {
      if (participantId !== currentUserId.toString()) {
        io.to(participantId).emit('conversation:new', conversation);
      }
    });

    res.status(201).json({
      success: true,
      message: 'Conversation created successfully',
      conversation
    });
  } catch (error) {
    console.error('Create conversation error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all conversations for logged-in user
// @route   GET /api/chat/conversations
// @access  Private
export const getUserConversations = async (req, res) => {
  try {
    const userId = req.user._id;

    const conversations = await Conversation.find({
      participants: userId
    })
      .populate('participants', 'firstName lastName email profilePhoto')
      .populate('lastMessage')
      .sort({ updatedAt: -1 });

    res.status(200).json({
      success: true,
      conversations
    });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get messages for a specific conversation
// @route   GET /api/chat/conversations/:conversationId/messages
// @access  Private
export const getConversationMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;
    const { page = 1, limit = 50 } = req.query;

    // Check if user is participant
    const conversation = await Conversation.findById(conversationId);
    
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    if (!conversation.isParticipant(userId)) {
      return res.status(403).json({
        success: false,
        message: 'You are not a participant of this conversation'
      });
    }

    // Get messages with pagination
    const messages = await Message.find({
      conversationId,
      deletedFor: { $ne: userId } // Exclude messages deleted by this user
    })
      .populate('sender', 'firstName lastName profilePhoto')
      .populate('replyTo')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await Message.countDocuments({
      conversationId,
      deletedFor: { $ne: userId }
    });

    res.status(200).json({
      success: true,
      messages: messages.reverse(), // Send oldest first
      totalPages: Math.ceil(count / limit),
      currentPage: page
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Send a message
// @route   POST /api/chat/messages
// @access  Private
export const sendMessage = async (req, res) => {
  try {
    const { conversationId, content, messageType, replyTo } = req.body;
    const senderId = req.user._id;

    // Validation
    if (!conversationId || !content) {
      return res.status(400).json({
        success: false,
        message: 'Conversation ID and content are required'
      });
    }

    // Check if conversation exists and user is participant
    const conversation = await Conversation.findById(conversationId);
    
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    if (!conversation.isParticipant(senderId)) {
      return res.status(403).json({
        success: false,
        message: 'You are not a participant of this conversation'
      });
    }

    // Create message
    const message = await Message.create({
      conversationId,
      sender: senderId,
      content,
      messageType: messageType || 'text',
      replyTo: replyTo || null
    });

    // Populate sender info
    await message.populate('sender', 'firstName lastName profilePhoto');
    if (replyTo) {
      await message.populate('replyTo');
    }

    // Update conversation's lastMessage and updatedAt
    conversation.lastMessage = message._id;
    conversation.updatedAt = new Date();
    await conversation.save();

    // Get Socket.IO instance
    const io = req.app.get('io');

    // Emit message to all participants in the conversation
    conversation.participants.forEach(participantId => {
      io.to(participantId.toString()).emit('message:new', {
        conversationId,
        message
      });
    });

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: message
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Mark message as read
// @route   PATCH /api/chat/messages/:messageId/read
// @access  Private
export const markMessageAsRead = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Don't mark own messages as read
    if (message.sender.toString() === userId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot mark your own message as read'
      });
    }

    // Use the schema method
    message.markAsRead(userId);
    await message.save();

    // Notify sender via Socket.IO
    const io = req.app.get('io');
    io.to(message.sender.toString()).emit('message:read', {
      messageId: message._id,
      conversationId: message.conversationId,
      readBy: userId
    });

    res.status(200).json({
      success: true,
      message: 'Message marked as read'
    });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get unread message counts for all conversations
// @route   GET /api/chat/unread-counts
// @access  Private
export const getUnreadCounts = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get all user's conversations
    const conversations = await Conversation.find({
      participants: userId
    }).select('_id');

    const conversationIds = conversations.map(c => c._id);

    // Aggregate unread counts per conversation
    const unreadCounts = await Message.aggregate([
      {
        $match: {
          conversationId: { $in: conversationIds },
          sender: { $ne: userId },
          'readBy.user': { $ne: userId }
        }
      },
      {
        $group: {
          _id: '$conversationId',
          count: { $sum: 1 }
        }
      }
    ]);

    // Convert to object for easy lookup
    const countsMap = {};
    unreadCounts.forEach(item => {
      countsMap[item._id.toString()] = item.count;
    });

    res.status(200).json({
      success: true,
      unreadCounts: countsMap
    });
  } catch (error) {
    console.error('Get unread counts error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
// @route   DELETE /api/chat/messages/:messageId
// @access  Private
export const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Add user to deletedFor array
    if (!message.deletedFor.includes(userId)) {
      message.deletedFor.push(userId);
      await message.save();
    }

    res.status(200).json({
      success: true,
      message: 'Message deleted successfully'
    });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};