import { z } from 'zod';
import { prisma } from '~/lib/prisma';
import { VeterinaryHospitalInputSchema } from '~/lib/validations/veterinary-visit';

export default defineEventHandler(async (event) => {
  try {
    // Only allow POST method
    assertMethod(event, 'POST');

    // Parse and validate request body
    const body = await readBody(event);
    const hospitalData = VeterinaryHospitalInputSchema.parse(body);

    // Check if hospital with same name already exists
    const existingHospital = await prisma.veterinaryHospital.findFirst({
      where: {
        name: hospitalData.name,
      },
    });

    if (existingHospital) {
      throw createError({
        statusCode: 409,
        statusMessage: '同じ名前の病院が既に登録されています',
      });
    }

    // Create new hospital
    const hospital = await prisma.veterinaryHospital.create({
      data: {
        name: hospitalData.name,
        address: hospitalData.address || null,
        phone: hospitalData.phone || null,
      },
      include: {
        _count: {
          select: {
            visits: true,
            appointments: true,
            doctors: true,
          },
        },
      },
    });

    return {
      hospital,
      message: '病院が正常に登録されました',
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
    console.error('Error creating veterinary hospital:', error);
    throw createError({
      statusCode: 500,
      statusMessage: '病院の作成に失敗しました',
    });
  }
});
