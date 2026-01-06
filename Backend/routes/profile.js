import express from 'express';
import { uploadProfilePhoto, deleteProfilePhoto } from '../controllers/profileController.js';
import { protect } from '../middleware/auth.js';
import upload from '../middleware/upload.js';

const router = express.Router();

router.post('/photo', protect, upload.single('photo'), uploadProfilePhoto);
router.delete('/photo', protect, deleteProfilePhoto);

export default router;