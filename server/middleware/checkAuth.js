// check auth middleware
exports.isLoggedIn = async function (req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    } else {
        res.redirect('/login');
    }
};