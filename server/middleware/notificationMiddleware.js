const Notification = require('../models/Noti'); 

const getNotifications = async (req, res, next) => {
    try {
      if (req.user) {
        const notifications = await Notification.find({
          'userGroup.user': req.user._id, // Fetch notifications for the logged-in user
        }).sort({ createdAt: -1 }).limit(10); // Sort by latest and limit to 10
  
        const unreadCount = notifications.filter(notification => 
          notification.userGroup.some(group => 
            group.user.toString() === req.user._id.toString() && group.status === 'unread'
          )
        ).length;
  
        // Add notifications and unread count to res.locals
        res.locals.notifications = notifications;
        res.locals.unreadCount = unreadCount;
      }
      next(); // Proceed to the next middleware or route handler
    } catch (err) {
      console.error('Error fetching notifications:', err);
      next(); // Proceed even if there's an error
    }
  };

module.exports = getNotifications;