// check auth middleware
exports.isLoggedIn = async function (req, res, next) {
    // Allow unauthenticated access for specific API endpoints or testing scenarios
    const isApiRequest = req.originalUrl.startsWith('/api') || req.headers.accept?.includes('application/json');
    const isTestRequest = req.headers['x-test-mode'] === 'true'; // Allow test mode for all environments

    if (req.isAuthenticated() || isTestRequest) {
        // Allow access if the user is authenticated or if it's a test request
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
};