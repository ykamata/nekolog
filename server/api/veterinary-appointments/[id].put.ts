import { z } from 'zod';
import { prisma } from '~/lib/prisma';
import { VeterinaryAppointmentUpdateSchema } from '~/lib/validations/veterinary-visit';
import { requireAuth } from '~/lib/auth-middleware';
import { toLocalISOString } from '~/utils/cat-meal';

const paramsSchema = z.object({
  id: z.coerce.number().positive('有効なIDを指定してください'),
});

// マスタデータの検索または作成を行うヘルパー関数
async function findOrCreateHospital(name: string, userId: number) {
  const existing = await prisma.veterinaryHospital.findFirst({
    where: { name, userId },
  });

  if (existing) {
    return existing;
  }

  const nowJST = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return await prisma.veterinaryHospital.create({
    data: {
      name,
      user: { connect: { id: userId } },
      createdAt: nowJST,
      updatedAt: nowJST,
    },
  });
}

async function findOrCreateDoctor(
  name: string,
  hospitalId: number,
  userId: number,
) {
  const existing = await prisma.veterinaryDoctor.findFirst({
    where: {
      name,
      hospitalId,
      userId,
    },
  });

  if (existing) {
    return existing;
  }

  const nowJST = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return await prisma.veterinaryDoctor.create({
    data: {
      name,
      hospitalId,
      userId,
      createdAt: nowJST,
      updatedAt: nowJST,
    },
  });
}

export default defineEventHandler(async (event) => {
  try {
    // Only allow PUT method
    assertMethod(event, 'PUT');

    // 認証チェック
    const user = await requireAuth(event);

    // Parse and validate route parameters
    const params = getRouterParams(event);
    const { id } = paramsSchema.parse(params);

    // Parse and validate request body
    const body = await readBody(event);
    const { createdAt, updatedAt, ...restBody } = body;

    // Zodスキーマが文字列をJSTのDateオブジェクトに変換するため、
    // ここでの明示的な変換は不要
    const updateData = VeterinaryAppointmentUpdateSchema.parse(restBody);

    // JSTの日時を明示的に計算（UTC + 9時間）
    const nowJST = new Date(Date.now() + 9 * 60 * 60 * 1000);

    // Check if appointment exists
    const existingAppointment = await prisma.veterinaryAppointment.findUnique({
      where: { id },
    });

    if (!existingAppointment) {
      throw createError({
        statusCode: 404,
        statusMessage: '指定された予約が見つかりません',
      });
    }

    // Check if cat exists if catId is being updated
    if (updateData.catId) {
      const cat = await prisma.cat.findUnique({
        where: { id: updateData.catId },
      });

      if (!cat) {
        throw createError({
          statusCode: 404,
          statusMessage: '指定された猫が見つかりません',
        });
      }
    }

    // Prepare update data
    const appointmentUpdateData: any = {};

    if (updateData.catId !== undefined) {
      appointmentUpdateData.catId = updateData.catId;
    }

    if (updateData.appointmentDate !== undefined) {
      appointmentUpdateData.appointmentDate = updateData.appointmentDate;
    }

    if (updateData.plannedTreatments !== undefined) {
      appointmentUpdateData.plannedTreatments
        = updateData.plannedTreatments || null;
    }

    if (updateData.notes !== undefined) {
      appointmentUpdateData.notes = updateData.notes || null;
    }

    if (updateData.status !== undefined) {
      appointmentUpdateData.status = updateData.status;
    }

    // Handle hospital update
    if (updateData.hospitalName) {
      const hospital = await findOrCreateHospital(
        updateData.hospitalName,
        user.userId,
      );
      appointmentUpdateData.hospitalId = hospital.id;
    }

    // Handle doctor update
    if (updateData.doctorName !== undefined) {
      if (updateData.doctorName && updateData.doctorName.trim()) {
        // Get hospital ID (either from update data or existing appointment)
        const hospitalId
          = appointmentUpdateData.hospitalId || existingAppointment.hospitalId;
        const doctor = await findOrCreateDoctor(
          updateData.doctorName.trim(),
          hospitalId,
          user.userId,
        );
        appointmentUpdateData.doctorId = doctor.id;
      }
      else {
        appointmentUpdateData.doctorId = null;
      }
    }

    // Update appointment
    const updatedAppointment = await prisma.veterinaryAppointment.update({
      where: { id },
      data: {
        ...appointmentUpdateData,
        updatedAt: nowJST,
      },
      include: {
        cat: {
          select: {
            id: true,
            name: true,
          },
        },
        hospital: {
          select: {
            id: true,
            name: true,
            address: true,
            phone: true,
          },
        },
        doctor: {
          select: {
            id: true,
            name: true,
            specialty: true,
          },
        },
      },
    });

    return {
      appointment: {
        ...updatedAppointment,
        appointmentDate: toLocalISOString(updatedAppointment.appointmentDate),
        createdAt: toLocalISOString(updatedAppointment.createdAt),
        updatedAt: toLocalISOString(updatedAppointment.updatedAt),
        // cat, hospital, doctor are already selected with specific fields only
        // No date transformation needed as they don't include date fields in the select
      },
      message: '予約が正常に更新されました',
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
    console.error('Error updating veterinary appointment:', error);
    throw createError({
      statusCode: 500,
      statusMessage: '予約の更新に失敗しました',
    });
  }
});
