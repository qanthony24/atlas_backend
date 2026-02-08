import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { config } from './config';

export const createQueueConnection = () => new IORedis(config.redisUrl);

export const createImportQueue = (connection: IORedis) => {
    return new Queue('import_voters', { connection });
};
