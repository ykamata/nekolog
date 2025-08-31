import { z } from 'zod';
import { prisma } from '~/lib/prisma';
import { VeterinaryDoctorInputSchema } from '~/lib/validations/veterinary-visit';

export default defineEventHandler(async (event) => {
  try {
    // Only allow POST method
    assertMethod(event, 'POST');

    // Parse and validate request body
    const body = await readBody(event);
    const doctorData = VeterinaryDoctorInputSchema.parse(body);

    // Check if hospital exists if hospitalId is provided
    if (doctorData.hospitalId) {
      const hospital = await prisma.veterinaryHospital.findUnique({
        where: { id: doctorData.hospitalId },
      });

      if (!hospital) {
        throw createError({
          statusCode: 404,
          statusMessage: '指定された病院が見つかりません',
        });
      }
    }

    // Check if doctor with same name and hospital already exists
    const existingDoctor = await prisma.veterinaryDoctor.findFirst({
      where: {
        name: doctorData.name,
        hospitalId: doctorData.hospitalId || null,
      },
    });

    if (existingDoctor) {
      throw createError({
        statusCode: 409,
        statusMessage: '同じ病院に同じ名前の先生が既に登録されています',
      });
    }

    // Create new doctor
    const doctor = await prisma.veterinaryDoctor.create({
      data: {
        name: doctorData.name,
        hospitalId: doctorData.hospitalId || null,
        specialty: doctorData.specialty || null,
      },
      include: {
        hospital: {
          select: {
            id: true,
            name: true,
            address: true,
            phone: true,
          },
        },
        _count: {
          select: {
            visits: true,
            appointments: true,
          },
        },
      },
    });

    return {
      doctor,
      message: '先生が正常に登録されました',
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
    console.error('Error creating veterinary doctor:', error);
    throw createError({
      statusCode: 500,
      statusMessage: '先生の作成に失敗しました',
    });
  }
});
