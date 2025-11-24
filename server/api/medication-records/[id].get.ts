import { z } from 'zod';
import { prisma } from '~/lib/prisma';

const paramsSchema = z.object({
  id: z.coerce.number().positive('有効なIDを指定してください'),
});

export default defineEventHandler(async (event) => {
  try {
    // Only allow GET method
    assertMethod(event, 'GET');

    // Parse and validate route parameters
    const params = getRouterParams(event);
    const { id } = paramsSchema.parse(params);

    // Get medication record by ID
    const record = await prisma.medicationRecord.findUnique({
      where: { id },
      include: {
        cat: {
          select: {
            id: true,
            name: true,
          },
        },
        medication: {
          select: {
            id: true,
            name: true,
            type: true,
            dosage: true,
          },
        },
      },
    });

    if (!record) {
      throw createError({
        statusCode: 404,
        statusMessage: '投与記録が見つかりません',
      });
    }

    // Add caching headers for individual record
    setHeader(event, 'Cache-Control', 'public, max-age=300, s-maxage=600');

    return { record };
  }
  catch (error) {
    // Handle validation errors
    if (error instanceof z.ZodError) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid parameters',
        data: error.errors,
      });
    }

    // Re-throw HTTP errors
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }

    // Handle unexpected errors
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error',
    });
  }
});
