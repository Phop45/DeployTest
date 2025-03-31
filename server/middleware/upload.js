// upload middleware
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinaryConfig');

// Directories for uploads
const fileUploadDir = 'public/uploads/';

// Ensure directories exist
if (!fs.existsSync(fileUploadDir)) {
    fs.mkdirSync(fileUploadDir, { recursive: true });
}

// ✅ Configure Cloudinary Storage
const coverStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'projectCovers', // Cloudinary folder
        format: async (req, file) => file.mimetype.split('/')[1], // Get file format
        allowed_formats: ['jpg', 'jpeg', 'png'],
    },
});

// ✅ Define Multer Instance
const uploadCovers = multer({
    storage: multer.memoryStorage(), // Store files in memory so Sharp can process them
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only JPG, JPEG, and PNG are allowed.'));
        }
    },
});

// ✅ Middleware for compressing images before upload
const compressAndUploadImage = async (req, res, next) => {
    if (!req.file) {
        console.error('No file uploaded.');
        return next(); // Skip processing if no file
    }

    try {
        const maxSize = 100 * 1024; // 100KB in bytes

        if (!req.file.buffer) {
            console.error('File buffer is missing.');
            return next(new Error('Invalid file input'));
        }

        // Resize and compress the image
        const format = req.file.mimetype.split('/')[1]; // Get file format (jpg, png)
        let compressedImageBuffer;

        // Resize image to fit within 600x400 for all formats
        const resizedImage = sharp(req.file.buffer).resize({ width: 600, height: 400, fit: 'inside' });

        if (format === 'png') {
            // ✅ Optimize PNG using lossless compression
            compressedImageBuffer = await resizedImage
                .png({ compressionLevel: 9 }) // Max compression for PNG
                .toBuffer();
        } else {
            // ✅ Optimize JPEG using lossy compression (for jpg and jpeg)
            compressedImageBuffer = await resizedImage
                .jpeg({ quality: 50, mozjpeg: true }) // Compress JPEG with 50% quality
                .toBuffer();
        }

        // Check the compressed image size
        const compressedSize = compressedImageBuffer.length;

        // If the compressed size is still above the 100KB limit, we may need further compression
        if (compressedSize > maxSize) {
            compressedImageBuffer = await sharp(compressedImageBuffer)
                .jpeg({ quality: 40, mozjpeg: true }) // Further reduce quality if needed
                .toBuffer();
        }

        // ✅ Upload to Cloudinary using the optimized buffer
        cloudinary.uploader.upload_stream(
            { folder: 'projectCovers', resource_type: 'image' },
            (error, result) => {
                if (error) {
                    console.error('Cloudinary Upload Error:', error);
                    return next(error);
                }
                req.file.path = result.secure_url; // Store Cloudinary URL in req.file
                next();
            }
        ).end(compressedImageBuffer); // Upload the optimized buffer

    } catch (error) {
        console.error('Error in compressing/uploading image:', error);
        next(error);
    }
};




// ✅ Define Storage for Local Uploads
const fileStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

// ✅ File Filter
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only images and PDFs are allowed.'));
    }
};

// ✅ Create Multer Instance
const uploadFiles = multer({
    storage: fileStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter
});

module.exports = {
    uploadCovers,
    compressAndUploadImage,
    uploadFiles,
};