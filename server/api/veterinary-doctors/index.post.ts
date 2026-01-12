import { z } from 'zod';
import { prisma } from '~/lib/prisma';
import { VeterinaryDoctorInputSchema } from '~/lib/validations/veterinary-visit';
import { requireAuth } from '~/lib/auth-middleware';
import { toLocalISOString } from '~/utils/cat-meal';

export default defineEventHandler(async (event) => {
  try {
    // Only allow POST method
    assertMethod(event, 'POST');

    // 認証チェック
    const user = await requireAuth(event);

    // Parse and validate request body
    const body = await readBody(event);
    const { createdAt, updatedAt, ...restBody } = body;
    const doctorData = VeterinaryDoctorInputSchema.parse(restBody);

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
    // JSTの現在時刻を取得（UTC+9時間）
    const nowJST = new Date(Date.now() + 9 * 60 * 60 * 1000);
    const doctor = await prisma.veterinaryDoctor.create({
      data: {
        name: doctorData.name,
        hospitalId: doctorData.hospitalId || null,
        specialty: doctorData.specialty || null,
        userId: user.userId,
        createdAt: nowJST,
        updatedAt: nowJST,
      },
      include: {
        hospital: {
          select: {
            id: true,
            name: true,
            address: true,
            phone: true,
            createdAt: true,
            updatedAt: true,
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
      doctor: {
        ...doctor,
        createdAt: toLocalISOString(doctor.createdAt),
        updatedAt: toLocalISOString(doctor.updatedAt),
        hospital: doctor.hospital
          ? {
              ...doctor.hospital,
              createdAt: toLocalISOString(doctor.hospital.createdAt),
              updatedAt: toLocalISOString(doctor.hospital.updatedAt),
            }
          : null,
      },
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
