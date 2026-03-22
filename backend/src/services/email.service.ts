import { Resend } from 'resend';
import config from '../config/env';

/** Resend throws if constructed with an empty key — only create when a key exists. */
let resendClient: Resend | null = null;

function getResend(): Resend | null {
  if (!config.RESEND_API_KEY?.trim()) {
    return null;
  }
  if (!resendClient) {
    resendClient = new Resend(config.RESEND_API_KEY);
  }
  return resendClient;
}

function logSkippedEmail(kind: string, devHint?: string): void {
  console.warn(
    `[email] Skipped ${kind}: set RESEND_API_KEY in backend/.env to send real email.`
  );
  if (config.NODE_ENV === 'development' && devHint) {
    console.info(devHint);
  }
}

export const sendVerificationEmail = async (
  email: string,
  token: string
): Promise<void> => {
  const verificationUrl = `${config.FRONTEND_URL}/verify-email?token=${token}`;

  const resend = getResend();
  if (!resend) {
    logSkippedEmail('verification email', `Verification URL (dev): ${verificationUrl}`);
    return;
  }

  try {
    await resend.emails.send({
      from: `${config.EMAIL_FROM_NAME} <${config.EMAIL_FROM}>`,
      to: email,
      subject: 'Verify Your Email - JiffyJobs',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome to JiffyJobs!</h2>
          <p>Please verify your email address by clicking the button below:</p>
          <a href="${verificationUrl}" 
             style="display: inline-block; padding: 12px 24px; background-color: #0ea5e9; 
                    color: white; text-decoration: none; border-radius: 6px; margin: 20px 0;">
            Verify Email
          </a>
          <p>Or copy and paste this link into your browser:</p>
          <p style="color: #666; font-size: 14px;">${verificationUrl}</p>
          <p style="color: #999; font-size: 12px; margin-top: 30px;">
            This link will expire in 24 hours. If you didn't create an account, please ignore this email.
          </p>
        </div>
      `,
    });
  } catch (error) {
    console.error('Error sending verification email:', error);
    // In development, log the verification URL
    if (config.NODE_ENV === 'development') {
      console.log('Verification URL:', verificationUrl);
    }
  }
};

export const sendPasswordResetEmail = async (
  email: string,
  token: string
): Promise<void> => {
  const resetUrl = `${config.FRONTEND_URL}/reset-password?token=${token}`;

  const resend = getResend();
  if (!resend) {
    logSkippedEmail('password reset email', `Password reset URL (dev): ${resetUrl}`);
    return;
  }

  try {
    await resend.emails.send({
      from: `${config.EMAIL_FROM_NAME} <${config.EMAIL_FROM}>`,
      to: email,
      subject: 'Reset Your Password - JiffyJobs',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Password Reset Request</h2>
          <p>We received a request to reset your password. Click the button below to proceed:</p>
          <a href="${resetUrl}" 
             style="display: inline-block; padding: 12px 24px; background-color: #0ea5e9; 
                    color: white; text-decoration: none; border-radius: 6px; margin: 20px 0;">
            Reset Password
          </a>
          <p>Or copy and paste this link into your browser:</p>
          <p style="color: #666; font-size: 14px;">${resetUrl}</p>
          <p style="color: #999; font-size: 12px; margin-top: 30px;">
            This link will expire in 1 hour. If you didn't request a password reset, please ignore this email.
          </p>
        </div>
      `,
    });
  } catch (error) {
    console.error('Error sending password reset email:', error);
    if (config.NODE_ENV === 'development') {
      console.log('Password reset URL:', resetUrl);
    }
  }
};

/**
 * Send a notification email
 * Used for in-app notifications that should also be sent via email
 */
export const sendNotificationEmail = async (
  email: string,
  userName: string,
  title: string,
  message: string,
  actionUrl?: string
): Promise<void> => {
  const notificationUrl = actionUrl || `${config.FRONTEND_URL}/notifications`;

  const resend = getResend();
  if (!resend) {
    logSkippedEmail('notification email', `Notification URL (dev): ${notificationUrl}`);
    return;
  }

  try {
    await resend.emails.send({
      from: `${config.EMAIL_FROM_NAME} <${config.EMAIL_FROM}>`,
      to: email,
      subject: `${title} - JiffyJobs`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>${title}</h2>
          <p>Hi ${userName},</p>
          <p>${message}</p>
          ${actionUrl ? `
          <a href="${actionUrl}" 
             style="display: inline-block; padding: 12px 24px; background-color: #0ea5e9; 
                    color: white; text-decoration: none; border-radius: 6px; margin: 20px 0;">
            View Details
          </a>
          <p>Or copy and paste this link into your browser:</p>
          <p style="color: #666; font-size: 14px;">${actionUrl}</p>
          ` : ''}
          <p style="color: #999; font-size: 12px; margin-top: 30px;">
            You're receiving this email because you have notifications enabled on JiffyJobs.
          </p>
        </div>
      `,
    });
  } catch (error) {
    console.error('Error sending notification email:', error);
    if (config.NODE_ENV === 'development') {
      console.log('Notification URL:', notificationUrl);
    }
  }
};

export const sendPaymentConfirmation = async (
  email: string,
  data: { contractId: string; amount: number; taskTitle: string }
): Promise<void> => {
  const contractUrl = `${config.FRONTEND_URL}/contracts/${data.contractId}`;

  const resend = getResend();
  if (!resend) {
    logSkippedEmail('payment confirmation email');
    return;
  }

  try {
    await resend.emails.send({
      from: `${config.EMAIL_FROM_NAME} <${config.EMAIL_FROM}>`,
      to: email,
      subject: 'Payment Confirmed - JiffyJobs',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Payment Confirmed</h2>
          <p>Your payment of $${data.amount.toFixed(2)} has been successfully processed.</p>
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 6px; margin: 20px 0;">
            <p><strong>Task:</strong> ${data.taskTitle}</p>
            <p><strong>Amount:</strong> $${data.amount.toFixed(2)}</p>
            <p><strong>Contract ID:</strong> ${data.contractId}</p>
          </div>
          <p>Funds are now held in escrow and will be released to the helper upon task completion.</p>
          <a href="${contractUrl}" 
             style="display: inline-block; padding: 12px 24px; background-color: #0ea5e9; 
                    color: white; text-decoration: none; border-radius: 6px; margin: 20px 0;">
            View Contract
          </a>
        </div>
      `,
    });
  } catch (error) {
    console.error('Error sending payment confirmation email:', error);
  }
};

export const sendPayoutNotification = async (
  email: string,
  data: { contractId: string; amount: number; taskTitle: string }
): Promise<void> => {
  const contractUrl = `${config.FRONTEND_URL}/contracts/${data.contractId}`;

  const resend = getResend();
  if (!resend) {
    logSkippedEmail('payout notification email');
    return;
  }

  try {
    await resend.emails.send({
      from: `${config.EMAIL_FROM_NAME} <${config.EMAIL_FROM}>`,
      to: email,
      subject: 'Payout Released - JiffyJobs',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Payout Released</h2>
          <p>Your payout of $${data.amount.toFixed(2)} has been successfully transferred to your account.</p>
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 6px; margin: 20px 0;">
            <p><strong>Task:</strong> ${data.taskTitle}</p>
            <p><strong>Amount:</strong> $${data.amount.toFixed(2)}</p>
            <p><strong>Contract ID:</strong> ${data.contractId}</p>
          </div>
          <p>Funds should appear in your connected account within 1-2 business days.</p>
          <a href="${contractUrl}" 
             style="display: inline-block; padding: 12px 24px; background-color: #0ea5e9; 
                    color: white; text-decoration: none; border-radius: 6px; margin: 20px 0;">
            View Contract
          </a>
        </div>
      `,
    });
  } catch (error) {
    console.error('Error sending payout notification email:', error);
  }
};

export const sendRefundNotification = async (
  email: string,
  data: { contractId: string; amount: number; taskTitle: string; isPartial: boolean }
): Promise<void> => {
  const contractUrl = `${config.FRONTEND_URL}/contracts/${data.contractId}`;

  const resend = getResend();
  if (!resend) {
    logSkippedEmail('refund notification email');
    return;
  }

  try {
    await resend.emails.send({
      from: `${config.EMAIL_FROM_NAME} <${config.EMAIL_FROM}>`,
      to: email,
      subject: `${data.isPartial ? 'Partial ' : ''}Refund Processed - JiffyJobs`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Refund Processed</h2>
          <p>A ${data.isPartial ? 'partial ' : ''}refund of $${data.amount.toFixed(2)} has been processed for the following contract:</p>
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 6px; margin: 20px 0;">
            <p><strong>Task:</strong> ${data.taskTitle}</p>
            <p><strong>Refund Amount:</strong> $${data.amount.toFixed(2)}</p>
            <p><strong>Contract ID:</strong> ${data.contractId}</p>
          </div>
          <p>The refund will appear in your account within 5-10 business days.</p>
          <a href="${contractUrl}" 
             style="display: inline-block; padding: 12px 24px; background-color: #0ea5e9; 
                    color: white; text-decoration: none; border-radius: 6px; margin: 20px 0;">
            View Contract
          </a>
        </div>
      `,
    });
  } catch (error) {
    console.error('Error sending refund notification email:', error);
  }
};