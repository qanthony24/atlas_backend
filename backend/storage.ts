import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { config } from "./config";

export function createS3Client() {
  if (!process.env.S3_ACCESS_KEY_ID || !process.env.S3_SECRET_ACCESS_KEY) {
    throw new Error("Missing S3 credentials");
  }

  return new S3Client({
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION || "auto",
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    },
  });
}

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
