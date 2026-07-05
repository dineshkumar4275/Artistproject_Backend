// backend/middleware/upload.js
import multer from 'multer';

// Memory storage
const storage = multer.memoryStorage();

// File filter - Only allow images
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg', 
    'image/jpg', 
    'image/png', 
    'image/gif', 
    'image/webp', 
    'image/bmp', 
    'image/svg+xml'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 10MB
  },
  fileFilter: fileFilter
});

export default upload;