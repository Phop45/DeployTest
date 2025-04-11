const User = require('../models/User'); 

// check auth middleware
exports.isLoggedIn = async function (req, res, next) {
    try {
        // Allow unauthenticated access for specific API endpoints or testing scenarios
        const isApiRequest = req.originalUrl.startsWith('/api') || req.headers.accept?.includes('application/json');
        const isTestRequest = req.headers['x-test-mode'] === 'true'; // Allow test mode for all environments

        if (req.isAuthenticated() || isTestRequest) {
            // Check if the user is online
            const user = req.user; // Assuming req.user is populated by your auth strategy
            if (user) {
                const isOnline = await User.findById(user._id).select('isOnline'); // Adjust to your schema
                if (!isOnline) {
                    // Mark the user as online if necessary
                    user.isOnline = true;
                    await user.save();
                }
            }
            return next();
        } else {
            if (isApiRequest || isTestRequest) {
                // For API or test requests, return a 401 Unauthorized response
                return res.status(401).json({ message: 'Unauthorized: Please log in to access this resource.' });
            } else {
                // For non-API requests, redirect to the login page
                return res.redirect('/login');
            }
        }
    } catch (error) {
        console.error('Error in isLoggedIn middleware:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};