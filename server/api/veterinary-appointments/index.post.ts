import { z } from 'zod';
import { prisma } from '~/lib/prisma';
import { VeterinaryAppointmentInputSchema } from '~/lib/validations/veterinary-visit';

// マスタデータの検索または作成を行うヘルパー関数
async function findOrCreateHospital(name: string) {
  const existing = await prisma.veterinaryHospital.findFirst({
    where: { name },
  });

  if (existing) {
    return existing;
  }

  return await prisma.veterinaryHospital.create({
    data: { name },
  });
}

async function findOrCreateDoctor(name: string, hospitalId: string) {
  const existing = await prisma.veterinaryDoctor.findFirst({
    where: {
      name,
      hospitalId,
    },
  });

  if (existing) {
    return existing;
  }

  return await prisma.veterinaryDoctor.create({
    data: {
      name,
      hospitalId,
    },
  });
}

export default defineEventHandler(async (event) => {
  try {
    // Only allow POST method
    assertMethod(event, 'POST');

    // Parse and validate request body
    const body = await readBody(event);

    // Convert appointmentDate string to Date object if needed
    if (body.appointmentDate && typeof body.appointmentDate === 'string') {
      body.appointmentDate = new Date(body.appointmentDate);
    }

    const appointmentData = VeterinaryAppointmentInputSchema.parse(body);

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
    const hospital = await findOrCreateHospital(appointmentData.hospitalName);

    // Find or create doctor if provided
    let doctor = null;
    if (appointmentData.doctorName && appointmentData.doctorName.trim()) {
      doctor = await findOrCreateDoctor(appointmentData.doctorName.trim(), hospital.id);
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
            specialization: true,
          },
        },
      },
    });

    return {
      appointment,
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
