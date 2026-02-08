import { createApp } from './app';
import { config } from './config';
import { getPool, runSchema } from './db';
import { createQueueConnection, createImportQueue } from './queue';
import { createS3Client, ensureBucket } from './storage';

declare const require: any;
declare const module: any;

const start = async () => {
    const pool = getPool();
    await runSchema(pool);

    const connection = createQueueConnection();
    const importQueue = createImportQueue(connection);
    const s3Client = createS3Client();
    await ensureBucket(s3Client, config.s3Bucket);

    const app = createApp({ pool, importQueue, s3Client });

    app.listen(config.port, () => {
        console.log(`VoterField Backend running on port ${config.port}`);
    });
};

if (require.main === module) {
    start().catch(err => {
        console.error('Server failed to start', err);
        process.exit(1);
    });
}