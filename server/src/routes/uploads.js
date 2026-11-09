import { Router } from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { requireCreator } from '../middleware/auth.js';
import { requireViewer } from '../middleware/viewerAuth.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter(req, file, callback) {
    if (/^(image|video|audio)\//.test(file.mimetype)) return callback(null, true);
    return callback(new Error('Upload an image, video, or audio file.'));
  },
});
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter(req, file, callback) {
    if (file.mimetype.startsWith('image/')) return callback(null, true);
    return callback(new Error('Upload an image file for your story cover.'));
  },
});

function isCloudinaryConfigured() {
  return Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
}

function saveToCloudinary(req, res, next, imageOnly = false) {
  if (!isCloudinaryConfigured()) {
    return res.status(503).json({ message: 'Media uploads are not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.' });
  }
  const parseUpload = imageOnly ? imageUpload.single('file') : upload.single('file');
  return parseUpload(req, res, (error) => {
    if (error) {
      const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
      return res.status(status).json({ message: error.message });
    }
    if (!req.file) return res.status(400).json({ message: 'Choose a media file to upload.' });
    const resourceType = imageOnly || req.file.mimetype.startsWith('image/')
      ? 'image'
      : 'video';
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });
    const stream = cloudinary.uploader.upload_stream(
      { resource_type: resourceType, folder: 'creator-studio' },
      (uploadError, result) => {
        if (uploadError) return next(uploadError);
        return res.status(201).json({
          url: result.secure_url,
          resourceType,
          originalName: req.file.originalname,
        });
      }
    );
    stream.end(req.file.buffer);
  });
}

router.post('/', requireCreator, (req, res, next) => {
  return saveToCloudinary(req, res, next);
});

router.post('/viewer', requireViewer, (req, res, next) => {
  return saveToCloudinary(req, res, next, true);
});

export default router;
