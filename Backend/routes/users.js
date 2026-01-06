import express from 'express';
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser
} from '../controllers/userController.js';
import { protect, admin } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Admin only routes
router.route('/')
  .get(admin, getUsers)
  .post(admin, createUser);

router.route('/:id')
  .get(getUserById)
  .put(updateUser)  // User can update own profile, admin can update any
  .delete(admin, deleteUser);

export default router;