import User from '../models/User.js';
import cloudinary from '../config/cloudinary.js';

// @desc    Upload profile photo
// @route   POST /api/profile/photo
// @access  Private
export const uploadProfilePhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an image'
      });
    }

    // Upload to Cloudinary
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'user-management/profiles',
          transformation: [
            { width: 400, height: 400, crop: 'fill', gravity: 'face' },
            { quality: 'auto' }
          ]
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );

      uploadStream.end(req.file.buffer);
    });

    // Update user profile photo
    const user = await User.findById(req.user._id);
    
    // Delete old photo from Cloudinary if exists
    if (user.profilePhoto) {
      const publicId = user.profilePhoto.split('/').pop().split('.')[0];
      await cloudinary.uploader.destroy(`user-management/profiles/${publicId}`);
    }

    user.profilePhoto = result.secure_url;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile photo uploaded successfully',
      photoUrl: result.secure_url
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete profile photo
// @route   DELETE /api/profile/photo
// @access  Private
export const deleteProfilePhoto = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user.profilePhoto) {
      return res.status(400).json({
        success: false,
        message: 'No profile photo to delete'
      });
    }

    // Delete from Cloudinary
    const publicId = user.profilePhoto.split('/').pop().split('.')[0];
    await cloudinary.uploader.destroy(`user-management/profiles/${publicId}`);

    user.profilePhoto = null;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile photo deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};