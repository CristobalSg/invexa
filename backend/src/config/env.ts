import 'dotenv/config';

type NodeEnv = 'development' | 'test' | 'production';

export interface EnvConfig {
  readonly nodeEnv: NodeEnv;
  readonly port: number;
  readonly host: string;
  readonly databaseUrl: string;
  readonly jwtSecret: string;
  readonly jwtExpiresIn: string;
  readonly bcryptSaltRounds: number;
  readonly logLevel: string;
  readonly corsOrigin: string;
  readonly rateLimitMax: number;
  readonly rateLimitTimeWindow: string;
  readonly mailUser: string | undefined;
  readonly mailAppPassword: string | undefined;
  readonly mailTo: string | undefined;
}

const readRequired = (key: string): string => {
  const value = process.env[key];

  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
};

const readNumber = (key: string, fallback: number): number => {
  const rawValue = process.env[key];

  if (!rawValue) {
    return fallback;
  }

  const value = Number(rawValue);

  if (!Number.isFinite(value)) {
    throw new Error(`Environment variable ${key} must be a valid number`);
  }

  return value;
};

const readNodeEnv = (): NodeEnv => {
  const value = process.env.NODE_ENV ?? 'development';

  if (value === 'development' || value === 'test' || value === 'production') {
    return value;
  }

  throw new Error('NODE_ENV must be one of: development, test, production');
};

const readOptional = (key: string): string | undefined => {
  const value = process.env[key]?.trim();
  return value ? value : undefined;
};

export const env: EnvConfig = {
  nodeEnv: readNodeEnv(),
  port: readNumber('PORT', 3001),
  host: process.env.HOST ?? '0.0.0.0',
  databaseUrl: readRequired('DATABASE_URL'),
  jwtSecret: readRequired('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '8h',
  bcryptSaltRounds: readNumber('BCRYPT_SALT_ROUNDS', 12),
  logLevel: process.env.LOG_LEVEL ?? 'info',
  corsOrigin: process.env.CORS_ORIGIN ?? '*',
  rateLimitMax: readNumber('RATE_LIMIT_MAX', 100),
  rateLimitTimeWindow: process.env.RATE_LIMIT_TIME_WINDOW ?? '1 minute',
  mailUser: readOptional('MAIL_USER'),
  mailAppPassword: readOptional('MAIL_APP_PASSWORD'),
  mailTo: readOptional('MAIL_TO'),
};
