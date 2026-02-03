const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const passport = require('passport');
const router = express.Router();
const { User } = require('../database/db');
const { generateToken } = require('../middleware/auth');
const { registerValidation, loginValidation, handleValidationErrors } = require('../middleware/validation');
const { sendResetPasswordEmail } = require('../services/emailService');

// Register new user
router.post('/register', registerValidation, handleValidationErrors, async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        // Check if user already exists
        const existingUser = await User.findOne({
            $or: [{ username }, { email }]
        });
        
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: 'Username or email already exists'
            });
        }
        
        // Hash password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        // Create new user
        const user = new User({
            username,
            email,
            password: hashedPassword
        });
        
        await user.save();
        
        // Generate token
        const token = generateToken({
            id: user._id,
            username: user.username,
            email: user.email
        });
        
        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: {
                id: user._id,
                username: user.username,
                email: user.email,
                token
            }
        });
        
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Error registering user'
        });
    }
});

// Login user
router.post('/login', loginValidation, handleValidationErrors, async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // Find user
        const user = await User.findOne({ username });
        
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid username or password'
            });
        }
        
        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);
        
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: 'Invalid username or password'
            });
        }
        
        // Generate token
        const token = generateToken({
            id: user._id,
            username: user.username,
            email: user.email
        });
        
        res.json({
            success: true,
            message: 'Login successful',
            data: {
                id: user._id,
                username: user.username,
                email: user.email,
                token
            }
        });
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Error logging in'
        });
    }
});

// Get current user profile
router.get('/profile', async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'No token provided'
            });
        }
        
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_fallback_secret_key');
        
        const user = await User.findById(decoded.id).select('-password');
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        res.json({
            success: true,
            data: {
                id: user._id,
                username: user.username,
                email: user.email,
                authProvider: user.authProvider,
                created_at: user.createdAt
            }
        });
        
    } catch (error) {
        res.status(401).json({
            success: false,
            message: 'Invalid token'
        });
    }
});

// Google OAuth Routes (only if configured)
router.get('/google', (req, res) => {
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_ID !== 'your_google_client_id') {
        passport.authenticate('google', { 
            scope: ['profile', 'email'],
            prompt: 'select_account'
        })(req, res);
    } else {
        res.status(503).json({
            success: false,
            message: 'Google OAuth is not configured'
        });
    }
});

router.get('/google/callback',
    (req, res, next) => {
        if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_ID !== 'your_google_client_id') {
            passport.authenticate('google', { session: false, failureRedirect: '/?error=google_auth_failed' })(req, res, next);
        } else {
            res.redirect('/?error=google_not_configured');
        }
    },
    async (req, res) => {
        try {
            const token = generateToken({
                id: req.user._id,
                username: req.user.username,
                email: req.user.email
            });
            
            // Redirect to frontend with token
            res.redirect(`/?token=${token}&user=${encodeURIComponent(JSON.stringify({
                id: req.user._id,
                username: req.user.username,
                email: req.user.email
            }))}`);
        } catch (error) {
            res.redirect('/?error=auth_failed');
        }
    }
);

// Forgot Password
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }
        
        const user = await User.findOne({ email });
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'No account found with this email'
            });
        }
        
        if (user.authProvider === 'google') {
            return res.status(400).json({
                success: false,
                message: 'This account uses Google authentication. Please sign in with Google.'
            });
        }
        
        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
        
        user.resetPasswordToken = resetTokenHash;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
        await user.save();
        
        // Send email
        const emailSent = await sendResetPasswordEmail(email, resetToken);
        
        if (emailSent) {
            res.json({
                success: true,
                message: 'Password reset email sent. Check your inbox.'
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Failed to send reset email. Please try again.'
            });
        }
        
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({
            success: false,
            message: 'Error processing request'
        });
    }
});

// Reset Password
router.post('/reset-password', async (req, res) => {
    try {
        const { token, password } = req.body;
        
        if (!token || !password) {
            return res.status(400).json({
                success: false,
                message: 'Token and password are required'
            });
        }
        
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters'
            });
        }
        
        // Hash token and find user
        const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');
        const user = await User.findOne({
            resetPasswordToken: resetTokenHash,
            resetPasswordExpires: { $gt: Date.now() }
        });
        
        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired reset token'
            });
        }
        
        // Update password
        const saltRounds = 10;
        user.password = await bcrypt.hash(password, saltRounds);
        user.resetPasswordToken = null;
        user.resetPasswordExpires = null;
        await user.save();
        
        res.json({
            success: true,
            message: 'Password reset successful. Please login with your new password.'
        });
        
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({
            success: false,
            message: 'Error resetting password'
        });
    }
});

// Verify Reset Token
router.get('/verify-reset-token', async (req, res) => {
    try {
        const { token } = req.query;
        
        if (!token) {
            return res.status(400).json({
                success: false,
                message: 'Token is required'
            });
        }
        
        const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');
        const user = await User.findOne({
            resetPasswordToken: resetTokenHash,
            resetPasswordExpires: { $gt: Date.now() }
        });
        
        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired token'
            });
        }
        
        res.json({
            success: true,
            message: 'Token is valid'
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error verifying token'
        });
    }
});

module.exports = router;
