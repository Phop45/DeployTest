// auth router
const express = require("express");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const authController = require("../controllers/authController");
const router = express.Router();
const { createCanvas } = require('canvas');

// Google OAuth 2.0 strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    authController.googleCallback
  )
);

// Serialize user into session
passport.serializeUser(function (user, done) {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

// Google OAuth authentication route
router.get("/auth/google", passport.authenticate("google", { scope: ["email", "profile"] }));

router.get("/auth/google/callback", (req, res, next) => {
  passport.authenticate("google", (err, user, info) => {
      if (err) return next(err);

      if (!user && info?.googleEmail) {
          return res.render("log/googleRegister", { 
              googleEmail: info.googleEmail,
              googleId: info.googleId,
              profileImage: info.profileImage
          });
      }

      req.logIn(user, (err) => {
          if (err) return next(err);
          return res.redirect("/dashboard");
      });
  })(req, res, next);
});

router.post('/google-register', authController.googleRegister);

// Login
router.get("/login", authController.loginPage);
router.post("/login", authController.login);

// Register
router.post("/user/register", authController.registerUser);
router.get("/register", authController.registerPage);

// Login failure
router.get("/login-failure", authController.loginFailure);

// Logout
router.get("/logout", authController.logout);

router.get('/forgot-password', authController.showForgotPassword);
router.post('/forgot-password', authController.resendOTP);

// Route for OTP verification
router.get('/verify-otp', authController.showVerifyOTP);
router.post('/verify-otp', authController.verifyOTP);
router.post('/resend-otp', authController.resendOTP);

// Routes for reset password
router.get('/reset-password', authController.showResetPassword);
router.post('/reset-password', authController.resetPassword);

router.get('/profile-placeholder', (req, res) => {
  const { initial = 'U', color = '007ACC' } = req.query;
  const canvas = createCanvas(100, 100);
  const ctx = canvas.getContext('2d');

  // Draw background
  ctx.fillStyle = `#${color}`;
  ctx.fillRect(0, 0, 100, 100);

  // Draw text
  ctx.fillStyle = '#FFFFFF'; // Text color
  ctx.font = 'bold 50px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(initial, 50, 50);

  res.setHeader('Content-Type', 'image/png');
  res.send(canvas.toBuffer());
});

module.exports = router;