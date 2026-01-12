import { z } from 'zod';
import { prisma } from '~/lib/prisma';
import { VeterinaryAppointmentInputSchema } from '~/lib/validations/veterinary-visit';
import { requireAuth } from '~/lib/auth-middleware';
import { toLocalISOString } from '~/utils/cat-meal';

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

async function findOrCreateDoctor(name: string, hospitalId: number, userId: number) {
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
    // Only allow POST method
    assertMethod(event, 'POST');

    // 認証チェック
    const user = await requireAuth(event);

    // Parse and validate request body
    const body = await readBody(event);
    const { createdAt, updatedAt, ...restBody } = body;

    // Zodスキーマが文字列をJSTのDateオブジェクトに変換するため、
    // ここでの明示的な変換は不要
    const appointmentData = VeterinaryAppointmentInputSchema.parse(restBody);

    // JSTの日時を明示的に計算（UTC + 9時間）
    const nowJST = new Date(Date.now() + 9 * 60 * 60 * 1000);

    // Check if cat exists
    const cat = await prisma.cat.findUnique({
      where: { id: appointmentData.catId },
    });

    if (!cat) {
      throw createError({
        statusCode: 404,
        statusMessage: '指定された猫が見つかりません',
      });
    }

    // Find or create hospital
    const hospital = await findOrCreateHospital(appointmentData.hospitalName, user.userId);

    // Find or create doctor if provided
    let doctor = null;
    if (appointmentData.doctorName && appointmentData.doctorName.trim()) {
      doctor = await findOrCreateDoctor(appointmentData.doctorName.trim(), hospital.id, user.userId);
    }

    // Create veterinary appointment
    const appointment = await prisma.veterinaryAppointment.create({
      data: {
        catId: appointmentData.catId,
        appointmentDate: appointmentData.appointmentDate,
        hospitalId: hospital.id,
        doctorId: doctor?.id,
        plannedTreatments: appointmentData.plannedTreatments || null,
        notes: appointmentData.notes || null,
        status: 'SCHEDULED',
        createdAt: nowJST,
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
        ...appointment,
        appointmentDate: toLocalISOString(appointment.appointmentDate),
        createdAt: toLocalISOString(appointment.createdAt),
        updatedAt: toLocalISOString(appointment.updatedAt),
        // cat, hospital, doctor are already selected with specific fields only
        // No date transformation needed as they don't include date fields in the select
      },
      message: '予約が正常に作成されました',
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
    console.error('Error creating veterinary appointment:', error);
    throw createError({
      statusCode: 500,
      statusMessage: '予約の作成に失敗しました',
    });
  }
});
