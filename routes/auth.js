const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { google } = require('googleapis');

const router = express.Router();

// Initialize OAuth2 client (requires env vars to be set)
const getOAuth2Client = () => {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
};

// 1. Redirect to Google Consent Screen
router.get('/google', (req, res) => {
  try {
    const oauth2Client = getOAuth2Client();
    const scopes = [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/calendar.events'
    ];

    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline', // Required to get a refresh token
      prompt: 'consent', // Force consent screen to guarantee refresh token on signup
      scope: scopes
    });

    // In a real app with a separate frontend, you'd send this URL back 
    // or redirect directly if it's a server-side rendered app.
    // For our API, we'll return the URL so the frontend can redirect the user.
    res.json({ url });
  } catch (error) {
    console.error('Error generating Google Auth URL:', error);
    res.status(500).json({ error: 'Failed to generate auth URL' });
  }
});

// 2. Handle Google Callback
router.get('/google/callback', async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) {
      return res.status(400).json({ error: 'Authorization code missing' });
    }

    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Get user profile information
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    
    const { id: googleId, email, name } = userInfo.data;

    // Find or create user
    let user = await User.findOne({ email });

    if (!user) {
      // Create new user if they don't exist
      user = new User({
        email,
        name,
        googleId,
        role: 'player', // Default role
        sport: 'football' // Default sport, can be updated later
      });
    }

    // Update tokens (always update access token, only update refresh token if a new one is provided)
    user.googleAccessToken = tokens.access_token;
    if (tokens.refresh_token) {
      user.googleRefreshToken = tokens.refresh_token;
    }
    
    await user.save();

    // Generate our app's JWT for session management
    const appToken = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });

    // Redirect back to frontend with the token (adjust URL to match your frontend setup)
    const userStr = JSON.stringify({ id: user._id, name: user.name, role: user.role, sport: user.sport });
    const redirectUrl = `/?token=${appToken}&user=${encodeURIComponent(userStr)}`;
    
    res.redirect(redirectUrl);

  } catch (error) {
    console.error('Google OAuth Callback Error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Keep existing routes for testing/fallback if needed, or remove them entirely
// Since the plan said "Switch to Google-Only", I've replaced them. If needed, 
// you can restore standard login for admin purposes.

module.exports = router;
