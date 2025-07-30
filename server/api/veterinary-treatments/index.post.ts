import { z } from 'zod';
import { prisma } from '~/lib/prisma';
import { VeterinaryTreatmentInputSchema } from '~/lib/validations/veterinary-visit';

export default defineEventHandler(async (event) => {
  try {
    // Only allow POST method
    assertMethod(event, 'POST');

    // Parse and validate request body
    const body = await readBody(event);
    const treatmentData = VeterinaryTreatmentInputSchema.parse(body);

    // Check if treatment with same name already exists
    const existingTreatment = await prisma.veterinaryTreatment.findFirst({
      where: {
        name: treatmentData.name,
      },
    });

    if (existingTreatment) {
      throw createError({
        statusCode: 409,
        statusMessage: '同じ名前の処方内容が既に登録されています',
      });
    }

    // Create new treatment
    const treatment = await prisma.veterinaryTreatment.create({
      data: {
        name: treatmentData.name,
        category: treatmentData.category || null,
        description: treatmentData.description || null,
      },
      include: {
        _count: {
          select: {
            visitTreatments: true,
          },
        },
      },
    });

    return {
      treatment,
      message: '処方内容が正常に登録されました',
    };
  }
  catch (error) {
    // Handle validation errors
    if (error instanceof z.ZodError) {
      throw createError({
        statusCode: 400,
        statusMessage: '入力データが無効です',
        data: error.errors,
      });
    }

    // Re-throw HTTP errors
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }

    // Handle unexpected errors
    console.error('Error creating veterinary treatment:', error);
    throw createError({
      statusCode: 500,
      statusMessage: '処方内容の作成に失敗しました',
    });
  }
});
