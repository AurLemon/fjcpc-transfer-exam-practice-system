// src/config/config.ts

const parseBoolean = (value: string | undefined, fallback: boolean) => {
  if (value === undefined) {
    return fallback;
  }

  return value.trim().toLowerCase() === 'true';
};

const resolveEstimatedExamTime = (value: string | undefined): string => {
  const normalizedValue = value?.trim() || '05-15';
  const match = normalizedValue.match(/^(?:\d{4}-)?(\d{2})-(\d{2})$/);

  if (!match) {
    throw new Error(
      'EXAM_TIME must use MM-DD for estimated dates, for example 05-15.',
    );
  }

  const month = Number(match[1]);
  const day = Number(match[2]);
  const today = new Date();
  const todayAtStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  let year = today.getFullYear();
  let candidate = new Date(year, month - 1, day);

  if (candidate.getMonth() !== month - 1 || candidate.getDate() !== day) {
    throw new Error('EXAM_TIME must contain a valid calendar date.');
  }

  if (candidate < todayAtStart) {
    year += 1;
    candidate = new Date(year, month - 1, day);
  }

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

let registrationEnabled = process.env.REGISTRATION_ENABLED !== 'false';

export const isRegistrationEnabled = (): boolean => registrationEnabled;

export const setRegistrationEnabled = (enabled: boolean): boolean => {
  registrationEnabled = enabled;
  return registrationEnabled;
};

export default () => {
  const examTimeIsConfirmed = parseBoolean(process.env.EXAM_TRUST, false);
  const configuredExamTime = process.env.EXAM_TIME?.trim() || '05-15';

  const examTime = examTimeIsConfirmed
    ? configuredExamTime
    : resolveEstimatedExamTime(configuredExamTime);

  if (examTimeIsConfirmed && !/^\d{4}-\d{2}-\d{2}$/.test(configuredExamTime)) {
    throw new Error('EXAM_TIME must use YYYY-MM-DD when EXAM_TRUST=true.');
  }

  return {
    port: parseInt(process.env.PORT, 10) || 3000,
    database: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT, 10) || 5432,
      user: process.env.DB_USER || 'fjcpc-teps',
      password: process.env.DB_PASSWORD || '',
      name: process.env.DB_NAME || 'fjcpc-teps',
      ssl: parseBoolean(process.env.DB_SSL, false),
      requestTimesPerRound: process.env.REQ_TIMES_ROUND || '60',
    },
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT, 10) || 6379,
      password: process.env.REDIS_PASSWORD || '',
    },
    jwt: {
      secret: process.env.JWT_SECRET || '',
    },
    registration: {
      enabled: parseBoolean(process.env.REGISTRATION_ENABLED, true),
    },
    exam_info: {
      exam_time: examTime,
      exam_trust: examTimeIsConfirmed,
    },
  };
};
