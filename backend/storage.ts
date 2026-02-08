import { S3Client, CreateBucketCommand, HeadBucketCommand, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { config } from './config';

export const createS3Client = () => {
    return new S3Client({
        endpoint: config.s3Endpoint,
        region: config.s3Region,
        credentials: {
            accessKeyId: config.s3AccessKey,
            secretAccessKey: config.s3SecretKey
        },
        forcePathStyle: config.s3ForcePathStyle
    });
};

export const ensureBucket = async (client: S3Client, bucket: string) => {
    try {
        await client.send(new HeadBucketCommand({ Bucket: bucket }));
    } catch {
        await client.send(new CreateBucketCommand({ Bucket: bucket }));
    }
};

export const putObject = async (client: S3Client, bucket: string, key: string, body: Buffer) => {
    await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body }));
};

export const getObjectBody = async (client: S3Client, bucket: string, key: string): Promise<Buffer> => {
    const response = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    const stream = response.Body;
    if (!stream || typeof (stream as any).on !== 'function') {
        return Buffer.from('');
    }
    const chunks: Buffer[] = [];
    for await (const chunk of stream as any) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
};
