import { z } from 'zod';
import { prisma } from '~/lib/prisma';

const paramsSchema = z.object({
  id: z.coerce.number().positive('Invalid medication ID format'),
});

export default defineEventHandler(async (event) => {
  try {
    // Only allow GET method
    assertMethod(event, 'GET');

    // Parse and validate route parameters
    const params = getRouterParams(event);
    const { id } = paramsSchema.parse(params);

    // Get medication with related data
    const medication = await prisma.medication.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        type: true,
        description: true,
        dosage: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            records: true,
            schedules: true,
          },
        },
      },
    });

    if (!medication) {
      throw createError({
        statusCode: 404,
        statusMessage: '指定された薬が見つかりません',
      });
    }

    // Add caching headers
    setHeader(event, 'Cache-Control', 'public, max-age=300, s-maxage=600');

    return medication;
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
