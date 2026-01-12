import { z } from 'zod';
import { prisma } from '~/lib/prisma';
import { VeterinaryVisitInputSchema } from '~/lib/validations/veterinary-visit';
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

  const now = new Date();
  return await prisma.veterinaryHospital.create({
    data: {
      name,
      user: { connect: { id: userId } },
      createdAt: now,
      updatedAt: now,
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

  const now = new Date();
  return await prisma.veterinaryDoctor.create({
    data: {
      name,
      hospitalId,
      userId,
      createdAt: now,
      updatedAt: now,
    },
  });
}

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

    // 認証チェック
    const user = await requireAuth(event);

    // Parse and validate request body
    const body = await readBody(event);
    const { createdAt, updatedAt, ...restBody } = body;
    const visitData = VeterinaryVisitInputSchema.parse(restBody);

    // Check if cat exists
    const cat = await prisma.cat.findUnique({
      where: { id: visitData.catId },
    });

    if (!cat) {
      throw createError({
        statusCode: 404,
        statusMessage: '指定された猫が見つかりません',
      });
    }

    // Find or create hospital
    const hospital = await findOrCreateHospital(visitData.hospitalName, user.userId);

    // Find or create doctor if provided
    let doctor = null;
    if (visitData.doctorName && visitData.doctorName.trim()) {
      doctor = await findOrCreateDoctor(visitData.doctorName.trim(), hospital.id, user.userId);
    }

    // Find or create treatments
    const treatments = await findOrCreateTreatments(visitData.treatments);

    // Create veterinary visit with treatments
    const now = new Date();
    const visit = await prisma.veterinaryVisit.create({
      data: {
        catId: visitData.catId,
        visitDate: visitData.visitDate,
        hospitalId: hospital.id,
        doctorId: doctor?.id,
        cost: visitData.cost,
        notes: visitData.notes || null,
        hasBloodTest: visitData.hasBloodTest,
        createdAt: now,
        updatedAt: now,
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

    // Transform the data to flatten treatments and convert dates
    const transformedVisit = {
      ...visit,
      visitDate: toLocalISOString(visit.visitDate),
      createdAt: toLocalISOString(visit.createdAt),
      updatedAt: toLocalISOString(visit.updatedAt),
      // cat, hospital, doctor are already selected with specific fields only
      // No date transformation needed as they don't include date fields in the select
      treatments: visit.treatments.map(vt => vt.treatment),
    };

    return {
      visit: transformedVisit,
      message: '通院記録が正常に作成されました',
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
    console.error('Error creating veterinary visit:', error);
    throw createError({
      statusCode: 500,
      statusMessage: '通院記録の作成に失敗しました',
    });
  }
});
