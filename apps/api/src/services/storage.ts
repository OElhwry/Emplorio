import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { env } from '../env.js';

export const r2 =
  env.R2_ACCOUNT_ID && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY
    ? new S3Client({
        region: 'auto',
        endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: env.R2_ACCESS_KEY_ID,
          secretAccessKey: env.R2_SECRET_ACCESS_KEY,
        },
      })
    : null;

export async function uploadPdf(key: string, body: Buffer | Uint8Array): Promise<string> {
  if (!r2 || !env.R2_BUCKET) throw new Error('R2 not configured');
  await r2.send(
    new PutObjectCommand({
      Bucket: env.R2_BUCKET,
      Key: key,
      Body: body,
      ContentType: 'application/pdf',
    }),
  );
  return `${env.R2_PUBLIC_URL}/${key}`;
}
