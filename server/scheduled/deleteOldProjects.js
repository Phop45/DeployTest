const cron = require('node-cron');
const Spaces = require('../models/Space');
const cloudinary = require('cloudinary').v2;

// Schedule the task to run daily at midnight
cron.schedule('0 0 * * *', async () => {
    try {
        console.log('Running scheduled task to delete old projects...');

        // Find projects marked as deleted for more than 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const oldProjects = await Spaces.find({
            deleted: true,
            deletedAt: { $lte: sevenDaysAgo },
        });

        for (const project of oldProjects) {
            // Delete the project cover from Cloudinary if it exists
            if (project.projectCover && !project.projectCover.includes('defultBackground.jpg')) {
                const publicId = project.projectCover.split('/').pop().split('.')[0]; // Extract public ID
                try {
                    await cloudinary.uploader.destroy(`projectCovers/${publicId}`);
                    console.log(`Deleted project cover from Cloudinary: ${project.projectCover}`);
                } catch (error) {
                    console.error(`Error deleting project cover from Cloudinary: ${error.message}`);
                }
            }

            // Permanently delete the project from the database
            await Spaces.findByIdAndDelete(project._id);
            console.log(`Permanently deleted project: ${project.projectName}`);
        }
    } catch (error) {
        console.error('Error running scheduled task to delete old projects:', error);
    }
});