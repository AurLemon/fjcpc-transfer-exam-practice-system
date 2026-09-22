import * as dotenv from 'dotenv';
import { resolve } from 'node:path';
import { DataSource } from 'typeorm';
import { databaseOptions } from './database.config';

dotenv.config({ path: resolve(process.cwd(), '../.env') });
dotenv.config({ path: resolve(process.cwd(), '.env'), override: false });

export default new DataSource(databaseOptions());
