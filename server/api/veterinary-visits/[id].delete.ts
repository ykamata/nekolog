import { z } from 'zod';
import { prisma } from '~/lib/prisma';

const paramsSchema = z.object({
  id: z.string().min(1, '有効なIDを指定してください'),
});

export default defineEventHandler(async (event) => {
  try {
    // Only allow DELETE method
    assertMethod(event, 'DELETE');

    // Parse and validate route parameters
    const params = getRouterParams(event);
    const { id } = paramsSchema.parse(params);

    // Check if visit exists
    const existingVisit = await prisma.veterinaryVisit.findUnique({
      where: { id },
      include: {
        cat: {
          select: {
            name: true,
          },
        },
        hospital: {
          select: {
            name: true,
          },
        },
        treatments: {
          include: {
            treatment: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!existingVisit) {
      throw createError({
        statusCode: 404,
        statusMessage: '指定された通院記録が見つかりません',
      });
    }

    // Delete the visit (treatments will be automatically deleted due to cascade)
    await prisma.veterinaryVisit.delete({
      where: { id },
    });

    return {
      message: `${existingVisit.cat.name}の通院記録（${existingVisit.hospital.name}）が正常に削除されました`,
      deletedVisit: {
        id: existingVisit.id,
        catName: existingVisit.cat.name,
        hospitalName: existingVisit.hospital.name,
        visitDate: existingVisit.visitDate,
        cost: existingVisit.cost,
        treatmentCount: existingVisit.treatments.length,
      },
    };
  }
  catch (error) {
    // Handle validation errors
    if (error instanceof z.ZodError) {
      throw createError({
        statusCode: 400,
        statusMessage: 'パラメータが無効です',
        data: error.errors,
      });
    }

    // Re-throw HTTP errors
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }

    // Handle unexpected errors
    console.error('Error deleting veterinary visit:', error);
    throw createError({
      statusCode: 500,
      statusMessage: '通院記録の削除に失敗しました',
    });
  }
});
