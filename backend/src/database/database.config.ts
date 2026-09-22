import { DataSourceOptions } from 'typeorm';
import config from '../config/config';
import { DoneQuestion } from './entities/done_question.entity';
import { LoginKey } from './entities/login_key.entity';
import { Question } from './entities/question.entity';
import { RequestInfo } from './entities/request_info.entity';
import { RequestLog } from './entities/request_log.entity';
import { StarQuestion } from './entities/star_question.entity';
import { Token } from './entities/token.entity';
import { UpdatedQuestion } from './entities/updated_question.entity';
import { User } from './entities/user.entity';
import { UserSetting } from './entities/user_setting.entity';

export const entities = [
  User,
  UserSetting,
  Token,
  LoginKey,
  RequestInfo,
  RequestLog,
  Question,
  DoneQuestion,
  StarQuestion,
  UpdatedQuestion,
];

export const databaseOptions = (): DataSourceOptions => {
  const database = config().database;

  return {
    type: 'postgres',
    host: database.host,
    port: database.port,
    username: database.user,
    password: database.password,
    database: database.name,
    ssl: database.ssl ? { rejectUnauthorized: false } : false,
    entities,
    synchronize: false,
    migrations: [__dirname + '/migrations/*{.js,.ts}'],
    migrationsTableName: 'typeorm_migrations',
  };
};
