import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { z } from 'zod';
import { cacheResponse, invalidateCache } from '../middleware/cache';
import { prisma } from '../lib/prisma';

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
  role: z.enum(['CUSTOMER', 'MERCHANT', 'LABOR', 'TRANSPORT', 'SUPER_ADMIN', 'DEVELOPER']).optional(),
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
        role: user.role,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Internal server error' });
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
  aadhaarNumber: z.string().trim().optional(),
  panNumber: z.string().trim().optional(),
  role: z.enum(['CUSTOMER', 'MERCHANT', 'LABOR', 'TRANSPORT', 'SUPER_ADMIN', 'DEVELOPER']).optional(),
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
    const validRoles = ['CUSTOMER', 'MERCHANT', 'LABOR', 'TRANSPORT', 'SUPER_ADMIN', 'DEVELOPER'];
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

    const { firstName, lastName, phone, address, aadhaarNumber, panNumber, role } = parsed.data;

    // Auto-compute fullName if firstName and lastName are provided
    let calculatedFullName = req.body.fullName;
    if (firstName !== undefined || lastName !== undefined) {
      const parts = [firstName ?? '', lastName ?? ''].filter(Boolean);
      if (parts.length > 0) {
        calculatedFullName = parts.join(' ');
      }
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(firstName !== undefined && { firstName }),
        ...(lastName !== undefined && { lastName }),
        ...(calculatedFullName !== undefined && { fullName: calculatedFullName }),
        ...(phone !== undefined && { phone }),
        ...(address !== undefined && { address }),
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

// DELETE /api/auth/account - Permanently deletes the user and all their details
router.delete('/account', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.id;
    
    // Check if user exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

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
