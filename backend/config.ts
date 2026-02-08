export const config = {
    port: Number(process.env.PORT || 3000),
    jwtSecret: process.env.JWT_SECRET || 'dev_secret',
    internalToken: process.env.INTERNAL_ADMIN_TOKEN || 'internal_dev_token',
    databaseUrl: process.env.DATABASE_URL,
    dbHost: process.env.DB_HOST || 'localhost',
    dbPort: Number(process.env.DB_PORT || 5432),
    dbUser: process.env.DB_USER || 'postgres',
    dbPassword: process.env.DB_PASSWORD || 'postgres',
    dbName: process.env.DB_NAME || 'voterfield',
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
    s3Endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
    s3Region: process.env.S3_REGION || 'us-east-1',
    s3AccessKey: process.env.S3_ACCESS_KEY || 'minioadmin',
    s3SecretKey: process.env.S3_SECRET_KEY || 'minioadmin',
    s3Bucket: process.env.S3_BUCKET || 'voterfield',
    s3ForcePathStyle: process.env.S3_FORCE_PATH_STYLE !== 'false'
};
