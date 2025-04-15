// src/config/config.ts

export default () => {
  const today = new Date();
  const currentYear = today.getFullYear();
  const examDateThisYear = new Date(currentYear, 4, 15);
  const examYear = today > examDateThisYear ? currentYear + 1 : currentYear;

  return {
    port: parseInt(process.env.PORT, 10) || 3000,
    database: {
      type: process.env.DB_TYPE || 'sqlite',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT, 10) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      name: process.env.DB_NAME || 'test',
      sqlitePath: process.env.SQLITE_PATH || './database/sqlite.db',
      requestTimesPerRound: process.env.REQ_TIMES_ROUND || '60',
    },
    exam_info: {
      exam_time: process.env.EXAM_TIME || `${examYear}-05-15`,
      exam_trust: Boolean(process.env.EXAM_TRUST) || false,
    },
    git_info: {
      local_commit: process.env.LOCAL_COMMIT_HASH || null,
      repo_commit: process.env.REPO_COMMIT_HASH || null,
      recent_commit: process.env.RECENT_COMMIT || null,
      local_commit_time: process.env.LOCAL_COMMIT_TIME || null,
      repo_commit_time: process.env.REPO_COMMIT_TIME || null,
    },
  };
};
