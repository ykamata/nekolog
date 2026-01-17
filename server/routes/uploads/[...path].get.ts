import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { createError, defineEventHandler } from 'h3';

// Static file handler for /uploads directory
export default defineEventHandler(async (event) => {
  // Get the catch-all path parameter
  const path = event.context.params?.path || '';

  // eslint-disable-next-line no-console
  console.log('📁 Uploads handler - path:', path, 'params:', event.context.params);

  if (!path) {
    throw createError({
      statusCode: 404,
      statusMessage: 'File not found',
    });
  }

  // Construct file path
  const isProduction = process.env.NODE_ENV === 'production';
  const uploadsDir = isProduction
    ? join(process.cwd(), '.output', 'public', 'uploads')
    : join(process.cwd(), 'public', 'uploads');

  const filePath = join(uploadsDir, path);

  // Security: prevent path traversal
  if (!filePath.startsWith(uploadsDir)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
    });
  }

  // Check if file exists
  if (!existsSync(filePath)) {
    throw createError({
      statusCode: 404,
      statusMessage: 'File not found',
    });
  }

  try {
    // Read file
    const fileBuffer = await readFile(filePath);

    // Determine content type from file extension
    const ext = path.split('.').pop()?.toLowerCase();
    const contentTypes: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
    };

    const contentType = contentTypes[ext || ''] || 'application/octet-stream';

    // Set headers
    event.node.res.setHeader('Content-Type', contentType);
    event.node.res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

    return fileBuffer;
  }
  catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Error reading file',
    });
  }
});
