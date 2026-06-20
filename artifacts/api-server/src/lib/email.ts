import nodemailer from "nodemailer";

function getTransporter() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return null;
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
}

export async function sendVerificationEmail(
  to: string,
  name: string,
  token: string,
  appUrl: string,
): Promise<void> {
  const transporter = getTransporter();
  if (!transporter) {
    console.warn("[email] GMAIL_USER or GMAIL_APP_PASSWORD not set — skipping verification email");
    return;
  }
  const link = `${appUrl}/verify-email?token=${token}`;
  await transporter.sendMail({
    from: `"Easy Agra" <${process.env.GMAIL_USER}>`,
    to,
    subject: "Verify your Easy Agra account",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px;">
        <h2 style="color:#1a4a3a;margin-bottom:8px;">Welcome to Easy Agra! 🏛️</h2>
        <p style="color:#374151;">Hi <strong>${name}</strong>,</p>
        <p style="color:#374151;">Please verify your email address to activate your account.</p>
        <a href="${link}"
           style="display:inline-block;margin:16px 0;padding:12px 28px;background:#1a4a3a;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">
          Verify Email
        </a>
        <p style="color:#6b7280;font-size:13px;">This link expires in 24 hours. If you didn't create this account, you can ignore this email.</p>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail(
  to: string,
  name: string,
  token: string,
  appUrl: string,
): Promise<void> {
  const transporter = getTransporter();
  if (!transporter) {
    console.warn("[email] GMAIL_USER or GMAIL_APP_PASSWORD not set — skipping password reset email");
    return;
  }
  const link = `${appUrl}/reset-password?token=${token}`;
  await transporter.sendMail({
    from: `"Easy Agra" <${process.env.GMAIL_USER}>`,
    to,
    subject: "Reset your Easy Agra password",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px;">
        <h2 style="color:#1a4a3a;margin-bottom:8px;">Password Reset 🔐</h2>
        <p style="color:#374151;">Hi <strong>${name}</strong>,</p>
        <p style="color:#374151;">We received a request to reset your Easy Agra password. Click the button below to set a new password:</p>
        <a href="${link}"
           style="display:inline-block;margin:16px 0;padding:12px 28px;background:#1a4a3a;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">
          Reset Password
        </a>
        <p style="color:#6b7280;font-size:13px;">This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.</p>
        <p style="color:#6b7280;font-size:13px;">— Team Easy Agra</p>
      </div>
    `,
  });
}

export async function sendWelcomeEmail(to: string, name: string): Promise<void> {
  const transporter = getTransporter();
  if (!transporter) return;
  await transporter.sendMail({
    from: `"Easy Agra" <${process.env.GMAIL_USER}>`,
    to,
    subject: "Welcome to Easy Agra! 🎉",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px;">
        <h2 style="color:#1a4a3a;">Aapka swagat hai Easy Agra mein! 🏛️</h2>
        <p style="color:#374151;">Hi <strong>${name}</strong>,</p>
        <p style="color:#374151;">Your account has been verified. You can now explore hotels, restaurants, spas, and famous places in Agra.</p>
        <p style="color:#374151;">The City of Taj awaits you! 🕌</p>
        <p style="color:#6b7280;font-size:13px;">— Team Easy Agra</p>
      </div>
    `,
  });
}
