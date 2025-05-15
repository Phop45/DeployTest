// upload middleware
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const cloudinary = require('../config/cloudinaryConfig');

// Directories for uploads
const fileUploadDir = 'public/uploads/';

// Ensure directories exist
if (!fs.existsSync(fileUploadDir)) {
    fs.mkdirSync(fileUploadDir, { recursive: true });
}

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

// ✅ Create Multer Instance
const uploadFiles = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            // Ensure upload directory exists
            if (!fs.existsSync(fileUploadDir)) {
                fs.mkdirSync(fileUploadDir, { recursive: true });
            }
            cb(null, fileUploadDir); 
        },
        filename: (req, file, cb) => {
            const timestamp = Date.now();
            // Preserve the original filename exactly as uploaded
            const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
            const safeFilename = `${timestamp}-${originalName}`;
            cb(null, safeFilename);
        }
    }),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'image/jpeg', 'image/png', 'application/pdf',
            'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'application/zip', 'application/octet-stream'
        ];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type.'));
        }
    }
}).fields([
    { name: 'taskAttachments', maxCount: 10 },
    { name: 'userSubmission', maxCount: 10 }
]);

// ✅ Create Multer Instance for Comments
const uploadCommentFiles = multer({
    storage: multer.memoryStorage(), // Store in memory for potential processing
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'image/jpeg', 'image/png', 'application/pdf',
            'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'application/zip'
        ];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type for comments. Only images, PDFs, and office documents are allowed.'));
        }
    }
}).array('commentFileUpload', 5); // Max 5 files per comment

// Middleware for processing comment attachments
const processCommentAttachments = async (req, res, next) => {
    if (!req.files || req.files.length === 0) {
        req.attachments = [];
        return next();
    }

    const commentFileDir = path.join('public', 'commentFiles'); // Directory for comment files

    // Ensure the directory exists
    if (!fs.existsSync(commentFileDir)) {
        fs.mkdirSync(commentFileDir, { recursive: true });
    }

    try {
        // Process each file
        req.attachments = await Promise.all(req.files.map(async (file) => {
            const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
            const fileName = `${uniqueSuffix}-${file.originalname}`; // More unique file name
            const filePath = path.join(commentFileDir, fileName);

            // Compress image if it's over 5MB
            if (file.size > 5 * 1024 * 1024 && file.mimetype.startsWith('image/')) {
                // Resize image using sharp
                const compressedImageBuffer = await sharp(file.buffer)
                    .resize(800) // Resize to 800px width (adjust as needed)
                    .jpeg({ quality: 80 }) // Compress JPEG with 80% quality
                    .toBuffer();

                // Write the compressed image to the file system
                await fs.promises.writeFile(filePath, compressedImageBuffer);

            } else if (file.size > 5 * 1024 * 1024) {
                // If it's a non-image file and over 5MB, compress using zlib
                const compressedBuffer = await new Promise((resolve, reject) => {
                    zlib.gzip(file.buffer, (err, compressed) => {
                        if (err) reject(err);
                        resolve(compressed);
                    });
                });

                // Save the compressed file
                await fs.promises.writeFile(filePath, compressedBuffer);
            } else {
                // If it's not over 5MB, save the file as-is
                await fs.promises.writeFile(filePath, file.buffer);
            }

            // Log the file metadata
            const attachmentData = {
                path: filePath,
                originalName: file.originalname,
                fileSize: file.size, // Original file size
                fileType: file.mimetype,
            };
            return attachmentData;
        }));

        next();
    } catch (error) {
        next(error);
    }
};


module.exports = {
    uploadCovers,
    compressAndUploadImage,
    uploadFiles,
    uploadCommentFiles,
    processCommentAttachments
};