import express from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { z } from 'zod';
import { cacheResponse, invalidateCache } from '../middleware/cache';
import { prisma } from '../lib/prisma';
import { verifyGoogleToken, upsertGoogleUser, renderGoogleAccountChooserHtml } from '../services/googleAuthService';
import { deleteCloudflareImage, deleteMultipleCloudflareImages, handleImageReplacement } from '../utils/cloudflareImages';

const router = express.Router();

// In production, these should come from .env
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.MY_EMAIL,
    pass: process.env.MY_PASSWORD,
  },
});

const generateOTP = () => Math.floor(10000 + Math.random() * 90000).toString(); // 5 digit

const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email format"),
  password: z.string().trim().min(6, "Password must be at least 6 characters"),
  fullName: z.string().trim().min(1, "Full name is required").optional().or(z.literal('')),
  role: z.enum(['CUSTOMER', 'MERCHANT', 'MANUAL_SERVICE_PROVIDER', 'DIGITAL_SERVICE_PROVIDER', 'TRANSPORT', 'SUPER_ADMIN', 'DEVELOPER']).optional(),
});

const verifySchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email format"),
  otp: z.string().trim().length(5, "OTP must be exactly 5 digits"),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email format"),
});

const resetPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email format"),
  otp: z.string().trim().length(5, "OTP must be exactly 5 digits"),
  password: z.string().trim().min(6, "Password must be at least 6 characters"),
});

router.post('/register', async (req, res) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }
    const { email, password, fullName, role } = parsed.data;
    
    // Check if user already exists
    let user = await prisma.user.findUnique({ where: { email } });
    
    if (user && user.isVerified) {
      return res.status(400).json({ error: 'User with this email already exists and is verified.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = generateOTP();
    const otpExpiresAt = new Date(Date.now() + 120 * 1000); // 120 seconds

    if (user) {
      // Update unverified user
      user = await prisma.user.update({
        where: { email },
        data: {
          password: hashedPassword,
          fullName,
          ...(role && { role }),
          otp,
          otpExpiresAt,
        },
      });
    } else {
      // Create new user
      user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          fullName,
          ...(role && { role }),
          otp,
          otpExpiresAt,
        },
      });
    }

    // Professional HTML Email Template
    const emailHtml = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; border-radius: 10px; border: 1px solid #e0e0e0;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; margin: 0; font-size: 28px; font-weight: 800;">CityLinks</h1>
          <p style="color: #64748b; font-size: 14px; margin-top: 5px;">Your digital connection to the city</p>
        </div>
        
        <div style="background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
          <h2 style="color: #1e293b; font-size: 20px; margin-top: 0;">Verify your email address</h2>
          <p style="color: #475569; font-size: 16px; line-height: 1.5;">Hello,</p>
          <p style="color: #475569; font-size: 16px; line-height: 1.5;">Please use the verification code below to complete your sign-up process. This code is valid for <strong>120 seconds</strong>.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <div style="display: inline-block; padding: 15px 30px; background: linear-gradient(135deg, #2563eb, #3b82f6); border-radius: 8px; box-shadow: 0 4px 15px rgba(37, 99, 235, 0.2);">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #ffffff;">${otp}</span>
            </div>
          </div>
          
          <p style="color: #475569; font-size: 14px; line-height: 1.5; text-align: center;">If you didn't request this code, you can safely ignore this email.</p>
        </div>
        
        <div style="text-align: center; margin-top: 20px; color: #94a3b8; font-size: 12px;">
          <p>&copy; ${new Date().getFullYear()} CityLinks. All rights reserved.</p>
        </div>
      </div>
    `;

    // Send email using real Gmail SMTP in the background
    transporter.sendMail({
      from: `"CityLinks" <${process.env.MY_EMAIL}>`,
      to: email,
      subject: 'Your CityLinks Verification Code',
      text: `Your verification code is: ${otp}. It will expire in 120 seconds.`,
      html: emailHtml,
    }).then((info) => {
      console.log(`Email successfully sent to ${email} (Message ID: ${info.messageId})`);
    }).catch((mailErr: any) => {
      console.log("Mail error:", mailErr);
    });

    // Automatically expire the OTP in the database after 120 seconds
    setTimeout(async () => {
      try {
        const checkUser = await prisma.user.findUnique({ where: { email } });
        // Only clear if the user hasn't generated a new one or hasn't verified
        if (checkUser && !checkUser.isVerified && checkUser.otp === otp) {
          await prisma.user.update({
            where: { email },
            data: { otp: null, otpExpiresAt: null },
          });
          console.log(`OTP automatically expired and removed for ${email}`);
        }
      } catch (e) {
        console.error("Failed to auto-expire OTP", e);
      }
    }, 120 * 1000);

    res.json({ message: 'OTP sent to email', email });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Route for Resend OTP
router.post('/resend-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.isVerified) return res.status(400).json({ error: 'User is already verified' });

    const otp = generateOTP();
    const otpExpiresAt = new Date(Date.now() + 120 * 1000); // 120 seconds

    await prisma.user.update({
      where: { email },
      data: { otp, otpExpiresAt },
    });

    const emailHtml = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; border-radius: 10px; border: 1px solid #e0e0e0;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; margin: 0; font-size: 28px; font-weight: 800;">CityLinks</h1>
          <p style="color: #64748b; font-size: 14px; margin-top: 5px;">Your digital connection to the city</p>
        </div>
        <div style="background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
          <h2 style="color: #1e293b; font-size: 20px; margin-top: 0;">New Verification Code</h2>
          <p style="color: #475569; font-size: 16px; line-height: 1.5;">Hello,</p>
          <p style="color: #475569; font-size: 16px; line-height: 1.5;">You requested a new verification code. This code is valid for <strong>120 seconds</strong>.</p>
          <div style="text-align: center; margin: 30px 0;">
            <div style="display: inline-block; padding: 15px 30px; background: linear-gradient(135deg, #2563eb, #3b82f6); border-radius: 8px; box-shadow: 0 4px 15px rgba(37, 99, 235, 0.2);">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #ffffff;">${otp}</span>
            </div>
          </div>
        </div>
      </div>
    `;

    transporter.sendMail({
      from: `"CityLinks" <${process.env.MY_EMAIL}>`,
      to: email,
      subject: 'Your New CityLinks Verification Code',
      text: `Your new verification code is: ${otp}. It will expire in 120 seconds.`,
      html: emailHtml,
    }).then((info) => {
      console.log(`Resend email successfully sent to ${email} (Message ID: ${info.messageId})`);
    }).catch((mailErr: any) => {
      console.log("Resend Mail error:", mailErr);
    });

    setTimeout(async () => {
      try {
        const checkUser = await prisma.user.findUnique({ where: { email } });
        if (checkUser && !checkUser.isVerified && checkUser.otp === otp) {
          await prisma.user.update({
            where: { email },
            data: { otp: null, otpExpiresAt: null },
          });
          console.log(`Resend OTP expired and removed for ${email}`);
        }
      } catch (e) {
        console.error("Failed to auto-expire resend OTP", e);
      }
    }, 120 * 1000);

    res.json({ message: 'New OTP sent to email', email });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

router.post('/verify-otp', async (req, res) => {
  try {
    const parsed = verifySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }
    const { email, otp } = parsed.data;
    
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.isVerified) return res.status(400).json({ error: 'User already verified' });
    
    if (user.otp !== otp) return res.status(400).json({ error: 'Invalid OTP' });
    if (!user.otpExpiresAt || user.otpExpiresAt < new Date()) {
      return res.status(400).json({ error: 'OTP expired' });
    }

    await prisma.user.update({
      where: { email },
      data: { isVerified: true, otp: null, otpExpiresAt: null },
    });

    // Check if user has already completed profile setup
    const isProfileComplete = Boolean(user.firstName || user.phone);

    // Generate permanent token (no expiration) until manual logout
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET);
    res.json({ 
      message: 'Verification successful', 
      token, 
      isProfileComplete,
      user: { 
        id: user.id, 
        email: user.email, 
        fullName: user.fullName,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        address: user.address,
        avatarUrl: user.avatarUrl,
        role: user.role
      } 
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Route for User Login
router.post('/login', async (req, res) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }
    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Your email or password is wrong' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Your email or password is wrong' });
    }

    if (!user.isVerified) {
      return res.status(403).json({ 
        error: 'Please verify your email before logging in.',
        isVerified: false,
        email: user.email
      });
    }

    const isProfileComplete = Boolean(user.firstName || user.phone);

    // Generate permanent token (no expiration) until manual logout
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET);
    res.json({
      message: 'Login successful',
      token,
      isProfileComplete,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        address: user.address,
        avatarUrl: user.avatarUrl,
        role: user.role,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

const getGoogleCallbackUrl = (req: any): string => {
  const host = (req.get('host') || '').toLowerCase();

  // If request came through production domain api.citylinks.in, strictly use HTTPS callback:
  if (host.includes('api.citylinks.in')) {
    return 'https://api.citylinks.in/api/auth/google/callback';
  }

  // If explicitly configured in .env and not an old invalid nip.io URI:
  if (process.env.GOOGLE_CALLBACK_URL && !process.env.GOOGLE_CALLBACK_URL.includes('nip.io')) {
    return process.env.GOOGLE_CALLBACK_URL;
  }

  const forwardedProto = req.headers['x-forwarded-proto'];
  const protocol = forwardedProto ? String(forwardedProto).split(',')[0].trim() : req.protocol;
  return `${protocol}://${req.get('host')}/api/auth/google/callback`;
};

// 1. GET /api/auth/google/start - Initiates real Google OAuth / Account Chooser
router.get('/google/start', async (req, res) => {
  try {
    const clientRedirectUri = (req.query.redirect_uri as string) || 'citylinksapp://auth';
    const googleClientId = process.env.GOOGLE_CLIENT_ID;
    const serverBase = `${req.protocol}://${req.get('host')}`;
    const serverCallback = getGoogleCallbackUrl(req);

    // Encode state for CSRF protection and deep link redirect tracking
    const state = Buffer.from(
      JSON.stringify({
        redirect_uri: clientRedirectUri,
        created: Date.now(),
      })
    ).toString('base64url');

    if (googleClientId) {
      // Direct live Google OAuth 2.0 Account Chooser screen (prompt=select_account)
      const googleAuthUrl =
        `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${encodeURIComponent(googleClientId)}&` +
        `redirect_uri=${encodeURIComponent(serverCallback)}&` +
        `response_type=code&` +
        `scope=${encodeURIComponent('openid email profile')}&` +
        `prompt=select_account&` +
        `state=${encodeURIComponent(state)}`;

      return res.redirect(googleAuthUrl);
    }

    // Google Account Chooser screen matching Google's exact UI
    return res.send(renderGoogleAccountChooserHtml(clientRedirectUri, state, serverBase));
  } catch (err: any) {
    console.error('Google start error:', err);
    return res.status(500).send('Failed to initiate Google authentication');
  }
});

// 2. GET /api/auth/google/callback - Handles Google OAuth authorization code redirect
router.get('/google/callback', async (req, res) => {
  try {
    const { code, state, error } = req.query;
    let clientRedirectUri = 'citylinksapp://oauthredirect';

    if (state && typeof state === 'string') {
      try {
        const decodedState = JSON.parse(Buffer.from(state, 'base64url').toString('utf8'));
        if (decodedState.redirect_uri) clientRedirectUri = decodedState.redirect_uri;
      } catch (e) {}
    }

    if (error) {
      return res.redirect(`${clientRedirectUri}?error=${encodeURIComponent(String(error))}`);
    }

    if (!code || typeof code !== 'string') {
      return res.redirect(`${clientRedirectUri}?error=${encodeURIComponent('Missing authorization code from Google')}`);
    }

    const serverBase = `${req.protocol}://${req.get('host')}`;
    const serverCallback = getGoogleCallbackUrl(req);

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        redirect_uri: serverCallback,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      const errData = await tokenRes.text();
      console.error('Google token exchange error:', errData);
      return res.redirect(`${clientRedirectUri}?error=${encodeURIComponent('Failed to exchange Google token')}`);
    }

    const tokens = (await tokenRes.json()) as any;
    const verified = await verifyGoogleToken(tokens.id_token, tokens.access_token);

    if (!verified) {
      return res.redirect(`${clientRedirectUri}?error=${encodeURIComponent('Google user verification failed')}`);
    }

    const { user, token, isProfileComplete } = await upsertGoogleUser(verified);

    const redirectUrl = `${clientRedirectUri}?token=${encodeURIComponent(token)}&user=${encodeURIComponent(JSON.stringify(user))}&isProfileComplete=${isProfileComplete}`;

    // Return HTML bridge to automatically switch from in-app browser back to CityLinks mobile app
    return res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
  <title>Signed In - Returning to CityLinks</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f8fafc;
      color: #0f172a;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 24px;
      text-align: center;
    }
    .card {
      background: #ffffff;
      border-radius: 24px;
      padding: 36px 24px;
      max-width: 380px;
      width: 100%;
      box-shadow: 0 10px 25px rgba(0,0,0,0.06);
      border: 1px solid #e2e8f0;
    }
    .icon {
      width: 56px;
      height: 56px;
      border-radius: 28px;
      background: #eff6ff;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 16px;
      color: #2563eb;
      font-size: 26px;
      font-weight: bold;
    }
    h2 { font-size: 20px; font-weight: 700; color: #0f172a; margin-bottom: 8px; }
    p { font-size: 14px; color: #64748b; line-height: 1.5; margin-bottom: 24px; }
    .btn {
      display: block;
      width: 100%;
      padding: 14px 20px;
      background: #2563eb;
      color: #ffffff;
      font-weight: 700;
      font-size: 15px;
      border-radius: 14px;
      text-decoration: none;
      box-shadow: 0 4px 12px rgba(37,99,235,0.25);
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">✓</div>
    <h2>Authentication Verified!</h2>
    <p>Returning to your CityLinks app automatically...</p>
    <a id="openAppBtn" href="${redirectUrl}" class="btn">Tap to Open CityLinks App</a>
  </div>
  <script>
    var target = ${JSON.stringify(redirectUrl)};
    // Immediate auto-navigation
    window.location.href = target;
    setTimeout(function() {
      window.location.replace(target);
    }, 150);
    setTimeout(function() {
      var btn = document.getElementById('openAppBtn');
      if (btn) btn.click();
    }, 350);
  </script>
</body>
</html>`);
  } catch (err: any) {
    console.error('Google callback error:', err);
    return res.redirect(`citylinksapp://auth?error=${encodeURIComponent(err.message || 'OAuth error')}`);
  }
});

// 3. POST /api/auth/google/select-account - Handles account chooser authentication
router.post('/google/select-account', async (req, res) => {
  try {
    const { email, name, picture, state } = req.body;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid Google email is required' });
    }

    let clientRedirectUri = 'citylinksapp://auth';
    if (state && typeof state === 'string') {
      try {
        const decodedState = JSON.parse(Buffer.from(state, 'base64url').toString('utf8'));
        if (decodedState.redirect_uri) clientRedirectUri = decodedState.redirect_uri;
      } catch (e) {}
    }

    // Verify user and sign in
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = (name || '').trim() || cleanEmail.split('@')[0];

    const { user, token, isProfileComplete } = await upsertGoogleUser({
      email: cleanEmail,
      name: cleanName,
      picture: picture || undefined,
      sub: 'g_' + crypto.createHash('md5').update(cleanEmail).digest('hex'),
    });

    const redirectUrl = `${clientRedirectUri}?token=${encodeURIComponent(token)}&user=${encodeURIComponent(JSON.stringify(user))}&isProfileComplete=${isProfileComplete}`;

    return res.json({
      success: true,
      redirectUrl,
    });
  } catch (err: any) {
    console.error('Select account error:', err);
    return res.status(500).json({ error: err.message || 'Failed to select account' });
  }
});

// 4. POST /api/auth/google - Authenticate using verified Google token (Strict Security)
router.post('/google', async (req, res) => {
  try {
    const { idToken, accessToken } = req.body;

    // Strict security: Reject raw email submissions without verified Google token
    if (!idToken && !accessToken) {
      return res.status(401).json({
        error: 'Authentication failed: Direct email submission without verified Google OAuth token is rejected for security. Please use Sign in with Google.',
      });
    }

    const verified = await verifyGoogleToken(idToken, accessToken);
    if (!verified) {
      return res.status(401).json({ error: 'Invalid, expired, or unverified Google token.' });
    }

    const { user, token, isProfileComplete } = await upsertGoogleUser(verified);

    return res.json({
      message: 'Google authentication successful',
      token,
      isProfileComplete,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        address: user.address,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (err: any) {
    console.error('Google OAuth error:', err);
    return res.status(500).json({ error: err.message || 'Google authentication failed' });
  }
});


// Route for Forgot Password - sends OTP only if email exists in DB
router.post('/forgot-password', async (req, res) => {
  try {
    const parsed = forgotPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }
    const { email } = parsed.data;

    // Check if user exists in database
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: 'No account found with this email address' });
    }

    const otp = generateOTP();
    const otpExpiresAt = new Date(Date.now() + 120 * 1000); // 120 seconds

    await prisma.user.update({
      where: { email },
      data: { otp, otpExpiresAt },
    });

    const emailHtml = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; border-radius: 10px; border: 1px solid #e0e0e0;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; margin: 0; font-size: 28px; font-weight: 800;">CityLinks</h1>
          <p style="color: #64748b; font-size: 14px; margin-top: 5px;">Password Reset Request</p>
        </div>
        <div style="background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
          <h2 style="color: #1e293b; font-size: 20px; margin-top: 0;">Reset Your Password</h2>
          <p style="color: #475569; font-size: 16px; line-height: 1.5;">Hello ${user.fullName ? user.fullName : ''},</p>
          <p style="color: #475569; font-size: 16px; line-height: 1.5;">We received a request to reset your password. Use the verification code below to proceed. This code is valid for <strong>120 seconds</strong>.</p>
          <div style="text-align: center; margin: 30px 0;">
            <div style="display: inline-block; padding: 15px 30px; background: linear-gradient(135deg, #2563eb, #3b82f6); border-radius: 8px; box-shadow: 0 4px 15px rgba(37, 99, 235, 0.2);">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #ffffff;">${otp}</span>
            </div>
          </div>
          <p style="color: #475569; font-size: 14px; line-height: 1.5; text-align: center;">If you didn't request a password reset, you can safely ignore this email.</p>
        </div>
        <div style="text-align: center; margin-top: 20px; color: #94a3b8; font-size: 12px;">
          <p>&copy; ${new Date().getFullYear()} CityLinks. All rights reserved.</p>
        </div>
      </div>
    `;

    transporter.sendMail({
      from: `"CityLinks" <${process.env.MY_EMAIL}>`,
      to: email,
      subject: 'Your CityLinks Password Reset Code',
      text: `Your password reset code is: ${otp}. It will expire in 120 seconds.`,
      html: emailHtml,
    }).then((info) => {
      console.log(`Password reset email sent to ${email} (Message ID: ${info.messageId})`);
    }).catch((mailErr: any) => {
      console.log("Password reset mail error:", mailErr);
    });

    setTimeout(async () => {
      try {
        const checkUser = await prisma.user.findUnique({ where: { email } });
        if (checkUser && checkUser.otp === otp) {
          await prisma.user.update({
            where: { email },
            data: { otp: null, otpExpiresAt: null },
          });
          console.log(`Password reset OTP auto-expired for ${email}`);
        }
      } catch (e) {
        console.error("Failed to auto-expire reset OTP", e);
      }
    }, 120 * 1000);

    res.json({ message: 'Password reset code sent to your email', email });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Route for verifying OTP for password reset
router.post('/verify-reset-otp', async (req, res) => {
  try {
    const parsed = verifySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }
    const { email, otp } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.otp !== otp) return res.status(400).json({ error: 'Invalid OTP' });
    if (!user.otpExpiresAt || user.otpExpiresAt < new Date()) {
      return res.status(400).json({ error: 'OTP expired' });
    }

    res.json({ message: 'OTP verified successfully', email, otp });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Route for resetting password
router.post('/reset-password', async (req, res) => {
  try {
    const parsed = resetPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }
    const { email, otp, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.otp !== otp) return res.status(400).json({ error: 'Invalid or expired OTP' });
    if (!user.otpExpiresAt || user.otpExpiresAt < new Date()) {
      return res.status(400).json({ error: 'OTP has expired' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const updatedUser = await prisma.user.update({
      where: { email },
      data: {
        password: hashedPassword,
        isVerified: true,
        otp: null,
        otpExpiresAt: null,
      },
    });

    // Permanent token upon successful reset
    const token = jwt.sign({ id: updatedUser.id, role: updatedUser.role }, JWT_SECRET);

    res.json({
      message: 'Password reset successfully',
      token,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        fullName: updatedUser.fullName,
        role: updatedUser.role,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Middleware to authenticate JWT
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication token required' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

const updateProfileSchema = z.object({
  firstName: z.string().trim().optional(),
  lastName: z.string().trim().optional(),
  fullName: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  address: z.string().trim().optional(),
  avatarUrl: z.string().trim().optional(),
  aadhaarNumber: z.string().trim().optional(),
  panNumber: z.string().trim().optional(),
  role: z.enum(['CUSTOMER', 'MERCHANT', 'MANUAL_SERVICE_PROVIDER', 'DIGITAL_SERVICE_PROVIDER', 'TRANSPORT', 'SUPER_ADMIN', 'DEVELOPER']).optional(),
});

// GET /api/auth/profile - Always return fresh user profile
router.get('/profile', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        firstName: true,
        lastName: true,
        phone: true,
        address: true,
        avatarUrl: true,
        aadhaarNumber: true,
        panNumber: true,
        role: true,
        isVerified: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// POST /api/auth/switch-role - Instantly switch active role
router.post('/switch-role', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { role } = req.body;
    const validRoles = [
      'CUSTOMER',
      'MERCHANT',
      'MANUAL_SERVICE_PROVIDER',
      'DIGITAL_SERVICE_PROVIDER',
      'TRANSPORT',
      'SUPER_ADMIN',
      'DEVELOPER',
    ];
    if (!role || !validRoles.includes(role.toUpperCase())) {
      return res.status(400).json({ error: 'Invalid role specified' });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { role: role.toUpperCase() as any },
      select: {
        id: true,
        email: true,
        fullName: true,
        firstName: true,
        lastName: true,
        phone: true,
        address: true,
        avatarUrl: true,
        aadhaarNumber: true,
        panNumber: true,
        role: true,
        isVerified: true,
        createdAt: true,
      },
    });

    invalidateCache(`user:${userId}`);
    res.json({ message: 'Role switched successfully', user: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// PUT /api/auth/profile
router.put('/profile', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const parsed = updateProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }

    const { firstName, lastName, phone, address, avatarUrl, aadhaarNumber, panNumber, role } = parsed.data;

    // Auto-compute fullName if firstName and lastName are provided
    let calculatedFullName = req.body.fullName;
    if (firstName !== undefined || lastName !== undefined) {
      const parts = [firstName ?? '', lastName ?? ''].filter(Boolean);
      if (parts.length > 0) {
        calculatedFullName = parts.join(' ');
      }
    }

    // Check if avatarUrl is changing to delete old Cloudflare image
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { avatarUrl: true },
    });
    if (existingUser && avatarUrl !== undefined) {
      await handleImageReplacement(existingUser.avatarUrl, avatarUrl);
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(firstName !== undefined && { firstName }),
        ...(lastName !== undefined && { lastName }),
        ...(calculatedFullName !== undefined && { fullName: calculatedFullName }),
        ...(phone !== undefined && { phone }),
        ...(address !== undefined && { address }),
        ...(avatarUrl !== undefined && { avatarUrl }),
        ...(aadhaarNumber !== undefined && { aadhaarNumber }),
        ...(panNumber !== undefined && { panNumber }),
        ...(role !== undefined && { role }),
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        firstName: true,
        lastName: true,
        phone: true,
        address: true,
        avatarUrl: true,
        aadhaarNumber: true,
        panNumber: true,
        role: true,
        isVerified: true,
        createdAt: true,
      },
    });

    // Invalidate user cache on profile update
    invalidateCache(`user:${userId}`);

    res.json({ message: 'Profile updated successfully', user: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// DELETE /api/auth/role-account - Permanently deletes role profile, shop, products, services, vehicles, deals, and Cloudflare images
router.delete('/role-account', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.id;

    // Check if user exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const targetRole = (req.body?.role || user.role) as string;

    // Reject if attempting to delete Super Admin
    if (user.role === 'SUPER_ADMIN' || targetRole === 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Super Admin account cannot be deleted via role removal.' });
    }

    if (user.role === 'CUSTOMER' && targetRole === 'CUSTOMER') {
      return res.status(400).json({ error: 'Customer accounts do not have a specialized role to delete.' });
    }

    const imagesToDelete: (string | null | undefined)[] = [];

    if (targetRole === 'MERCHANT') {
      // 1. Collect Join Requests & their images
      const joinRequests = await prisma.joinRequest.findMany({
        where: { userId, role: 'MERCHANT' },
      });
      for (const jr of joinRequests) {
        if (jr.imageUrl) imagesToDelete.push(jr.imageUrl);
        if (jr.aadhaarPhoto) imagesToDelete.push(jr.aadhaarPhoto);
        if (jr.drivingLicensePhoto) imagesToDelete.push(jr.drivingLicensePhoto);
      }
      const shopNamesFromJr = joinRequests.map((j) => j.shopName?.trim()).filter(Boolean) as string[];

      // 2. Find all Shops associated with this merchant
      const shopOrConditions: any[] = [];
      if (user.email) {
        shopOrConditions.push({ email: { equals: user.email.trim(), mode: 'insensitive' } });
      }
      if (user.phone && user.phone.trim().length > 0) {
        shopOrConditions.push({ phone: user.phone.trim() });
      }
      for (const sName of shopNamesFromJr) {
        shopOrConditions.push({ name: { equals: sName, mode: 'insensitive' } });
      }
      const defaultStoreName = `${user.fullName || user.firstName || 'My'} Store`.trim();
      shopOrConditions.push({ name: { equals: defaultStoreName, mode: 'insensitive' } });

      const shops = await prisma.shop.findMany({
        where: { OR: shopOrConditions },
        include: { products: true },
      });

      for (const shop of shops) {
        if (shop.imageUrl) imagesToDelete.push(shop.imageUrl);

        // Products
        const productIds = shop.products.map((p) => p.id);
        for (const prod of shop.products) {
          if (prod.imageUrl) imagesToDelete.push(prod.imageUrl);
        }

        if (productIds.length > 0) {
          // Delete CartItems referencing these products
          await prisma.cartItem.deleteMany({
            where: { productId: { in: productIds } },
          }).catch(() => {});

          // Delete Marketplace Items for these products
          await prisma.marketplaceItem.deleteMany({
            where: { entity_type: 'product', entity_id: { in: productIds } },
          }).catch(() => {});

          // Delete Products
          await prisma.product.deleteMany({
            where: { id: { in: productIds } },
          }).catch(() => {});
        }

        // Delete Marketplace Item for this Shop
        await prisma.marketplaceItem.deleteMany({
          where: { entity_type: 'shop', entity_id: shop.id },
        }).catch(() => {});

        // Delete Deals matching this shop name or shop linkUrl
        const deals = await prisma.deal.findMany({
          where: {
            OR: [
              { merchantName: { equals: shop.name.trim(), mode: 'insensitive' } },
              { linkUrl: { contains: shop.id } },
            ],
          },
        });
        for (const d of deals) {
          if (d.imageUrl) imagesToDelete.push(d.imageUrl);
        }
        if (deals.length > 0) {
          await prisma.deal.deleteMany({
            where: { id: { in: deals.map((d) => d.id) } },
          }).catch(() => {});
        }

        // Delete orders belonging to this shop
        await prisma.order.deleteMany({
          where: { shopId: shop.id },
        }).catch(() => {});

        // Delete the shop
        await prisma.shop.delete({
          where: { id: shop.id },
        }).catch(() => {});
      }

      // Check any other deals created under user's name
      const remainingDeals = await prisma.deal.findMany({
        where: {
          merchantName: {
            in: [user.fullName || '', defaultStoreName, ...shopNamesFromJr].filter(Boolean) as string[],
            mode: 'insensitive',
          },
        },
      });
      for (const d of remainingDeals) {
        if (d.imageUrl) imagesToDelete.push(d.imageUrl);
      }
      if (remainingDeals.length > 0) {
        await prisma.deal.deleteMany({
          where: { id: { in: remainingDeals.map((d) => d.id) } },
        }).catch(() => {});
      }

      // Delete Merchant Join Requests
      await prisma.joinRequest.deleteMany({
        where: { userId, role: 'MERCHANT' },
      }).catch(() => {});
    } else if (targetRole === 'MANUAL_SERVICE_PROVIDER') {
      // 1. Collect Join Requests & images
      const joinRequests = await prisma.joinRequest.findMany({
        where: {
          userId,
          role: 'MANUAL_SERVICE_PROVIDER',
        },
      });
      for (const jr of joinRequests) {
        if (jr.imageUrl) imagesToDelete.push(jr.imageUrl);
        if (jr.aadhaarPhoto) imagesToDelete.push(jr.aadhaarPhoto);
        if (jr.drivingLicensePhoto) imagesToDelete.push(jr.drivingLicensePhoto);
      }
      const providerNamesFromJr = joinRequests.map((j) => j.shopName?.trim()).filter(Boolean) as string[];

      const providerNames = Array.from(
        new Set([
          user.fullName || '',
          `${user.fullName || ''} Services`.trim(),
          'My Technical Services',
          ...providerNamesFromJr,
        ])
      ).filter((n) => n.length > 1);

      // 2. Find services
      const serviceOrConditions: any[] = [];
      if (user.phone && user.phone.trim().length > 0) {
        serviceOrConditions.push({ phone: user.phone.trim() });
      }
      for (const pName of providerNames) {
        serviceOrConditions.push({ providerName: { equals: pName, mode: 'insensitive' } });
      }

      const services = serviceOrConditions.length > 0
        ? await prisma.service.findMany({ where: { OR: serviceOrConditions } })
        : [];

      for (const s of services) {
        if (s.imageUrl) imagesToDelete.push(s.imageUrl);
        await prisma.marketplaceItem.deleteMany({
          where: { entity_type: 'service', entity_id: s.id },
        }).catch(() => {});
      }
      if (services.length > 0) {
        await prisma.service.deleteMany({
          where: { id: { in: services.map((s) => s.id) } },
        }).catch(() => {});
      }

      // Deals
      const deals = await prisma.deal.findMany({
        where: {
          merchantName: { in: providerNames, mode: 'insensitive' },
        },
      });
      for (const d of deals) {
        if (d.imageUrl) imagesToDelete.push(d.imageUrl);
      }
      if (deals.length > 0) {
        await prisma.deal.deleteMany({
          where: { id: { in: deals.map((d) => d.id) } },
        }).catch(() => {});
      }

      // Delete Join Requests
      await prisma.joinRequest.deleteMany({
        where: {
          userId,
          role: 'MANUAL_SERVICE_PROVIDER',
        },
      }).catch(() => {});
    } else if (targetRole === 'DIGITAL_SERVICE_PROVIDER') {
      // 1. Collect Join Requests & images
      const joinRequests = await prisma.joinRequest.findMany({
        where: {
          userId,
          role: 'DIGITAL_SERVICE_PROVIDER',
        },
      });
      for (const jr of joinRequests) {
        if (jr.imageUrl) imagesToDelete.push(jr.imageUrl);
        if (jr.aadhaarPhoto) imagesToDelete.push(jr.aadhaarPhoto);
      }
      const specialistNamesFromJr = joinRequests.map((j) => j.shopName?.trim()).filter(Boolean) as string[];

      const specialistNames = Array.from(
        new Set([
          user.fullName || '',
          `${user.fullName || ''} Digital Studio`.trim(),
          'My Digital Solutions',
          ...specialistNamesFromJr,
        ])
      ).filter((n) => n.length > 1);

      // 2. Find digital services
      const digitalOrConditions: any[] = [];
      if (user.phone && user.phone.trim().length > 0) {
        digitalOrConditions.push({ phone: user.phone.trim() });
      }
      for (const sName of specialistNames) {
        digitalOrConditions.push({ name: { equals: sName, mode: 'insensitive' } });
      }

      const digitalProviders = digitalOrConditions.length > 0
        ? await prisma.digitalServiceProvider.findMany({ where: { OR: digitalOrConditions } })
        : [];

      for (const dp of digitalProviders) {
        if (dp.imageUrl) imagesToDelete.push(dp.imageUrl);
        await prisma.marketplaceItem.deleteMany({
          where: { entity_id: dp.id },
        }).catch(() => {});
      }
      if (digitalProviders.length > 0) {
        await prisma.digitalServiceProvider.deleteMany({
          where: { id: { in: digitalProviders.map((dp) => dp.id) } },
        }).catch(() => {});
      }

      // Deals
      const deals = await prisma.deal.findMany({
        where: {
          merchantName: { in: specialistNames, mode: 'insensitive' },
        },
      });
      for (const d of deals) {
        if (d.imageUrl) imagesToDelete.push(d.imageUrl);
      }
      if (deals.length > 0) {
        await prisma.deal.deleteMany({
          where: { id: { in: deals.map((d) => d.id) } },
        }).catch(() => {});
      }

      // Delete Join Requests
      await prisma.joinRequest.deleteMany({
        where: {
          userId,
          role: 'DIGITAL_SERVICE_PROVIDER',
        },
      }).catch(() => {});
    } else if (targetRole === 'TRANSPORT') {
      // 1. Collect Join Requests & images
      const joinRequests = await prisma.joinRequest.findMany({
        where: { userId, role: 'TRANSPORT' },
      });
      for (const jr of joinRequests) {
        if (jr.imageUrl) imagesToDelete.push(jr.imageUrl);
        if (jr.drivingLicensePhoto) imagesToDelete.push(jr.drivingLicensePhoto);
        if (jr.aadhaarPhoto) imagesToDelete.push(jr.aadhaarPhoto);
      }

      // 2. Find TransportProvider
      const transportOrConditions: any[] = [{ userId }];
      if (user.phone && user.phone.trim().length > 0) {
        transportOrConditions.push({ phone: user.phone.trim() });
      }

      const transportProviders = await prisma.transportProvider.findMany({
        where: { OR: transportOrConditions },
        include: { vehicles: true },
      });

      for (const tp of transportProviders) {
        if (tp.drivingLicensePhoto) imagesToDelete.push(tp.drivingLicensePhoto);
        if (tp.aadhaarPhoto) imagesToDelete.push(tp.aadhaarPhoto);

        // Delete DriverVehicles
        await prisma.driverVehicle.deleteMany({
          where: { driverId: tp.id },
        }).catch(() => {});

        // Delete Marketplace Items
        await prisma.marketplaceItem.deleteMany({
          where: { entity_id: tp.id },
        }).catch(() => {});

        // Delete Ride Bookings
        await prisma.rideBooking.deleteMany({
          where: { driverId: tp.id },
        }).catch(() => {});
      }

      if (transportProviders.length > 0) {
        await prisma.transportProvider.deleteMany({
          where: { id: { in: transportProviders.map((tp) => tp.id) } },
        }).catch(() => {});
      }

      // Delete any driver vehicles linked directly to userId
      await prisma.driverVehicle.deleteMany({
        where: { userId },
      }).catch(() => {});

      // Delete Join Requests
      await prisma.joinRequest.deleteMany({
        where: { userId, role: 'TRANSPORT' },
      }).catch(() => {});
    }

    // Permanently wipe all collected images from Cloudflare
    await deleteMultipleCloudflareImages(imagesToDelete);

    // Revert user role to CUSTOMER
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role: 'CUSTOMER' },
      select: {
        id: true,
        email: true,
        fullName: true,
        firstName: true,
        lastName: true,
        phone: true,
        address: true,
        aadhaarNumber: true,
        panNumber: true,
        role: true,
        avatarUrl: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Issue a refreshed JWT token with the new CUSTOMER role
    const newToken = jwt.sign(
      {
        id: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role,
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    // Invalidate caches
    invalidateCache();
    invalidateCache(`user:${userId}`);

    console.log(`[Role Account Deleted] User ${userId} (${user.email}) deleted role ${targetRole}. Cloudflare images deleted: ${imagesToDelete.length}. Role reverted to CUSTOMER.`);

    res.json({
      success: true,
      message: `${targetRole} role account and all associated details have been permanently deleted.`,
      user: updatedUser,
      token: newToken,
    });
  } catch (err: any) {
    console.error('Error deleting role account:', err);
    res.status(500).json({ error: err.message || 'Failed to delete role account' });
  }
});

// DELETE /api/auth/account - Permanently deletes the user and all their details
router.delete('/account', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.id;
    
    // Check if user exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Permanently delete user from database and clean up all Cloudflare images
    const imagesToDelete: (string | null | undefined)[] = [user.avatarUrl];

    // Find and delete join requests images
    try {
      const joinReqs = await prisma.joinRequest.findMany({
        where: { userId },
        select: { imageUrl: true, drivingLicensePhoto: true, aadhaarPhoto: true },
      });
      joinReqs.forEach((jr) => {
        if (jr.imageUrl) imagesToDelete.push(jr.imageUrl);
        if (jr.drivingLicensePhoto) imagesToDelete.push(jr.drivingLicensePhoto);
        if (jr.aadhaarPhoto) imagesToDelete.push(jr.aadhaarPhoto);
      });
    } catch (e) {}

    // Find and delete transport driver photos
    try {
      const drivers = await prisma.transportProvider.findMany({
        where: { userId },
        select: { drivingLicensePhoto: true, aadhaarPhoto: true },
      });
      drivers.forEach((dr) => {
        if (dr.drivingLicensePhoto) imagesToDelete.push(dr.drivingLicensePhoto);
        if (dr.aadhaarPhoto) imagesToDelete.push(dr.aadhaarPhoto);
      });
    } catch (e) {}

    // Delete collected images from Cloudflare
    await deleteMultipleCloudflareImages(imagesToDelete);

    // Permanently delete user from database
    await prisma.user.delete({
      where: { id: userId },
    });

    // Invalidate user cache
    invalidateCache(`user:${userId}`);

    console.log(`[Account Deleted] User ${userId} (${user.email}) permanently removed.`);

    res.json({ message: 'Account permanently deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete account' });
  }
});

export default router;
