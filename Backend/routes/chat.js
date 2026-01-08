import express from 'express';
import {
  createConversation,
  getUserConversations,
  getConversationMessages,
  sendMessage,
  markMessageAsRead,
  deleteMessage,
  searchUsersForChat,
  getUnreadCounts
} from '../controllers/chatController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// All routes are protected (user must be logged in)
router.use(protect);

// User search for chat
router.get('/users', searchUsersForChat);

// Unread counts
router.get('/unread-counts', getUnreadCounts);

// Conversation routes
router.post('/conversations', createConversation);
router.get('/conversations', getUserConversations);
router.get('/conversations/:conversationId/messages', getConversationMessages);

// Message routes
router.post('/messages', sendMessage);
router.patch('/messages/:messageId/read', markMessageAsRead);
router.delete('/messages/:messageId', deleteMessage);

export default router;