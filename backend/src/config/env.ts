import dotenv from 'dotenv';

dotenv.config();

interface EnvConfig {
  NODE_ENV: string;
  PORT: number;
  API_URL: string;
  FRONTEND_URL: string;
  DATABASE_URL: string;
  JWT_SECRET: string;
  JWT_EXPIRE: string;
  RESEND_API_KEY: string;
  EMAIL_FROM: string;
  EMAIL_FROM_NAME: string;
  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX_REQUESTS: number;
  COOKIE_SECRET: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_PUBLISHABLE_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  PLATFORM_FEE_PERCENTAGE: number;
  AUTO_RELEASE_HOURS: number;
}

/**
 * Reads env vars. Empty-string defaults mean "optional in development".
 * Note: `!''` is true in JS, so we must not use `!defaultValue` to detect "no default".
 */
const getEnvVar = (key: string, defaultValue: string): string => {
  const raw = process.env[key];
  const hasExplicitValue = raw !== undefined && raw !== '';

  if (hasExplicitValue) {
    return raw as string;
  }

  if (defaultValue !== '') {
    return defaultValue;
  }

  // defaultValue === '' → treat as optional locally; require in production
  const nodeEnv = process.env.NODE_ENV || 'development';
  if (nodeEnv === 'production') {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return '';
};

const config: EnvConfig = {
  NODE_ENV: getEnvVar('NODE_ENV', 'development'),
  PORT: parseInt(getEnvVar('PORT', '5001'), 10),
  API_URL: getEnvVar('API_URL', 'http://localhost:5001'),
  FRONTEND_URL: getEnvVar('FRONTEND_URL', 'http://localhost:5173'),
  DATABASE_URL: getEnvVar('DATABASE_URL', ''),
  JWT_SECRET: getEnvVar('JWT_SECRET', 'fallback_secret_key_for_development_only'),
  JWT_EXPIRE: getEnvVar('JWT_EXPIRE', '7d'),
  RESEND_API_KEY: getEnvVar('RESEND_API_KEY', ''),
  EMAIL_FROM: getEnvVar('EMAIL_FROM', 'noreply@jiffyjobs.com'),
  EMAIL_FROM_NAME: getEnvVar('EMAIL_FROM_NAME', 'JiffyJobs'),
  RATE_LIMIT_WINDOW_MS: parseInt(getEnvVar('RATE_LIMIT_WINDOW_MS', '900000'), 10),
  RATE_LIMIT_MAX_REQUESTS: parseInt(getEnvVar('RATE_LIMIT_MAX_REQUESTS', '100'), 10),
  COOKIE_SECRET: getEnvVar('COOKIE_SECRET', 'fallback_cookie_secret_for_development'),
  STRIPE_SECRET_KEY: getEnvVar('STRIPE_SECRET_KEY', ''),
  STRIPE_PUBLISHABLE_KEY: getEnvVar('STRIPE_PUBLISHABLE_KEY', ''),
  STRIPE_WEBHOOK_SECRET: getEnvVar('STRIPE_WEBHOOK_SECRET', ''),
  PLATFORM_FEE_PERCENTAGE: parseFloat(getEnvVar('PLATFORM_FEE_PERCENTAGE', '5.0')),
  AUTO_RELEASE_HOURS: parseInt(getEnvVar('AUTO_RELEASE_HOURS', '48'), 10),
};

export default config;