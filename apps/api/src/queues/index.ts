import { Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { env } from '../env.js';

export const connection = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

export const pdfQueue = new Queue('pdf', { connection });
export const llmBatchQueue = new Queue('llm-batch', { connection });

export function startWorkers() {
  new Worker(
    'pdf',
    async (job) => {
      // TODO: render CV PDF, upload to R2, write generated_docs row
      return { ok: true, jobId: job.id };
    },
    { connection },
  );
}
