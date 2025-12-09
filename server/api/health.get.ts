/**
 * Health Check API Endpoint
 *
 * This endpoint is used by Docker health checks and monitoring systems
 * to verify that the application is running correctly.
 */

import { prisma } from '~/lib/prisma';

export default defineEventHandler(async (event) => {
  try {
    // Check database connectivity
    await prisma.$queryRaw`SELECT 1`;

    // Return success response
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'nekolog',
      database: 'connected',
    };
  } catch (error) {
    // Database connection failed
    setResponseStatus(event, 503);
    return {
      status: 'error',
      timestamp: new Date().toISOString(),
      service: 'nekolog',
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
});
