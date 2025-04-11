const express = require('express');
const router = express.Router();
const notiController = require('../controllers/notiController');
const Notification = require('../models/Noti');
const { isLoggedIn } = require('../middleware/checkAuth');

router.get('/notifications', isLoggedIn, notiController.getNotifications);
router.delete('/notifications/clear-non-invitation', isLoggedIn, notiController.clearNonInvitationNotifications);
router.delete('/notifications/:id', isLoggedIn, notiController.deleteNotification);
router.post('/notifications/resend/:id', isLoggedIn, notiController.resendInvitation);
router.delete('/notifications/cancel/:id', isLoggedIn, notiController.cancelInvitation);

router.put('/notification/accept/:id', isLoggedIn, notiController.acceptInvitation);
router.put('/notification/reject/:id', isLoggedIn, notiController.rejectInvitation);

router.get('/notifications/unread', async (req, res) => {
    try {
        const notifications = await Notification.find({
            'userGroup.user': req.user._id,
        });

        const unreadCount = notifications.filter(notification =>
            notification.userGroup.some(group =>
                group.user.toString() === req.user._id.toString() && group.status === 'unread'
            )
        ).length;

        res.json({ unreadCount });
    } catch (err) {
        console.error('Error fetching unread notifications:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

router.put('/notifications/:id/toggleRead', async (req, res) => {
    try {
        const notificationId = req.params.id;
        const userId = req.user._id;

        // Find the notification
        const notification = await Notification.findById(notificationId);
        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }

        // Toggle the status for the specific user in the userGroup
        const userGroup = notification.userGroup.find(group => group.user.toString() === userId.toString());
        if (userGroup) {
            if (userGroup.status === 'unread') {
                userGroup.status = 'read';
                userGroup.readAt = new Date();
            } else {
                userGroup.status = 'unread';
                userGroup.readAt = null;
            }
        }

        await notification.save();

        // Calculate the updated unread count
        const unreadCount = await Notification.countDocuments({
            'userGroup.user': userId,
            'userGroup.status': 'unread',
        });

        // Emit the updated unread count to the user's notification room
        const io = req.app.get('io'); // Get the Socket.IO instance
        io.to(userId.toString()).emit('updateUnreadCount', unreadCount);

        res.json({ success: true, status: userGroup.status });
    } catch (err) {
        console.error('Error toggling notification status:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

module.exports = router;