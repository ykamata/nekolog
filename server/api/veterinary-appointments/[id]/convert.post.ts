import { z } from 'zod';
import { prisma } from '~/lib/prisma';
import { ConvertAppointmentToVisitSchema } from '~/lib/validations/veterinary-visit';
import { toLocalISOString } from '~/utils/cat-meal';

const paramsSchema = z.object({
  id: z.coerce.number().positive('有効なIDを指定してください'),
});

// マスタデータの検索または作成を行うヘルパー関数
async function findOrCreateTreatments(treatmentNames: string[]) {
  const treatments = [];

  for (const name of treatmentNames) {
    let treatment = await prisma.veterinaryTreatment.findFirst({
      where: { name },
    });

    if (!treatment) {
      treatment = await prisma.veterinaryTreatment.create({
        data: { name },
      });
    }

    treatments.push(treatment);
  }

  return treatments;
}

export default defineEventHandler(async (event) => {
  try {
    // Only allow POST method
    assertMethod(event, 'POST');

    // Parse and validate route parameters
    const params = getRouterParams(event);
    const { id } = paramsSchema.parse(params);

    // Parse and validate request body
    const body = await readBody(event);
    const { createdAt, updatedAt, ...restBody } = body;
    const conversionData = ConvertAppointmentToVisitSchema.parse({
      ...restBody,
      appointmentId: id,
    });

    // Check if appointment exists and is in SCHEDULED status
    const existingAppointment = await prisma.veterinaryAppointment.findUnique({
      where: { id },
      include: {
        cat: true,
        hospital: true,
        doctor: true,
      },
    });

    if (!existingAppointment) {
      throw createError({
        statusCode: 404,
        statusMessage: '指定された予約が見つかりません',
      });
    }

    if (existingAppointment.status !== 'SCHEDULED') {
      throw createError({
        statusCode: 400,
        statusMessage: 'この予約は既に処理済みです',
      });
    }

    // Prepare visit data from appointment and conversion data
    const visitDate
      = conversionData.actualVisitDate || existingAppointment.appointmentDate;
    const cost = conversionData.actualCost || 0;
    const notes = conversionData.actualNotes || existingAppointment.notes;
    const hasBloodTest = conversionData.hasBloodTest || false;

    // Handle treatments
    let treatments: any[] = [];
    if (
      conversionData.actualTreatments
      && conversionData.actualTreatments.length > 0
    ) {
      treatments = await findOrCreateTreatments(
        conversionData.actualTreatments,
      );
    }
    else if (existingAppointment.plannedTreatments) {
      // If no actual treatments provided, use planned treatments as a single treatment
      treatments = await findOrCreateTreatments([
        existingAppointment.plannedTreatments,
      ]);
    }

    // Create visit and update appointment status in a transaction
    // JSTの日時を明示的に計算（UTC + 9時間）
    const nowJST = new Date(Date.now() + 9 * 60 * 60 * 1000);
    const result = await prisma.$transaction(async (tx) => {
      // Create veterinary visit
      const visit = await tx.veterinaryVisit.create({
        data: {
          catId: existingAppointment.catId,
          visitDate,
          hospitalId: existingAppointment.hospitalId,
          doctorId: existingAppointment.doctorId,
          cost,
          notes: notes || null,
          hasBloodTest,
          createdAt: nowJST,
          updatedAt: nowJST,
          treatments: {
            create: treatments.map(treatment => ({
              treatmentId: treatment.id,
            })),
          },
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
          treatments: {
            include: {
              treatment: {
                select: {
                  id: true,
                  name: true,
                  category: true,
                  description: true,
                },
              },
            },
          },
        },
      });

      // Update appointment status to COMPLETED
      const updatedAppointment = await tx.veterinaryAppointment.update({
        where: { id },
        data: {
          status: 'COMPLETED',
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

      return { visit, appointment: updatedAppointment };
    });

    // Transform the visit data to flatten treatments and convert dates
    const transformedVisit = {
      ...result.visit,
      visitDate: toLocalISOString(result.visit.visitDate),
      createdAt: toLocalISOString(result.visit.createdAt),
      updatedAt: toLocalISOString(result.visit.updatedAt),
      // cat, hospital, doctor are already selected with specific fields only
      // No date transformation needed as they don't include date fields in the select
      treatments: result.visit.treatments.map(vt => vt.treatment),
    };

    return {
      visit: transformedVisit,
      appointment: {
        ...result.appointment,
        appointmentDate: toLocalISOString(result.appointment.appointmentDate),
        createdAt: toLocalISOString(result.appointment.createdAt),
        updatedAt: toLocalISOString(result.appointment.updatedAt),
        // cat, hospital, doctor are already selected with specific fields only
        // No date transformation needed as they don't include date fields in the select
      },
      message: '予約が通院記録に正常に変換されました',
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
    console.error('Error converting appointment to visit:', error);
    throw createError({
      statusCode: 500,
      statusMessage: '予約の変換に失敗しました',
    });
  }
});
