import { z } from 'zod';
import { prisma } from '~/lib/prisma';
import { VeterinaryVisitUpdateSchema } from '~/lib/validations/veterinary-visit';
import { requireAuth } from '~/lib/auth-middleware';

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

  return await prisma.veterinaryHospital.create({
    data: {
      name,
      user: { connect: { id: userId } },
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

  return await prisma.veterinaryDoctor.create({
    data: {
      name,
      hospitalId,
      userId,
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
    // Only allow PUT method
    assertMethod(event, 'PUT');

    // 認証チェック
    const user = await requireAuth(event);

    // Parse and validate route parameters
    const params = getRouterParams(event);
    const { id } = paramsSchema.parse(params);

    // Parse and validate request body
    const body = await readBody(event);
    const updateData = VeterinaryVisitUpdateSchema.parse(body);

    // Check if visit exists
    const existingVisit = await prisma.veterinaryVisit.findUnique({
      where: { id },
      include: {
        treatments: true,
      },
    });

    if (!existingVisit) {
      throw createError({
        statusCode: 404,
        statusMessage: '指定された通院記録が見つかりません',
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
    const visitUpdateData: any = {};

    if (updateData.catId !== undefined) {
      visitUpdateData.catId = updateData.catId;
    }

    if (updateData.visitDate !== undefined) {
      visitUpdateData.visitDate = updateData.visitDate;
    }

    if (updateData.cost !== undefined) {
      visitUpdateData.cost = updateData.cost;
    }

    if (updateData.notes !== undefined) {
      visitUpdateData.notes = updateData.notes || null;
    }

    if (updateData.hasBloodTest !== undefined) {
      visitUpdateData.hasBloodTest = updateData.hasBloodTest;
    }

    // Handle hospital update
    if (updateData.hospitalName) {
      const hospital = await findOrCreateHospital(
        updateData.hospitalName,
        user.userId,
      );
      visitUpdateData.hospitalId = hospital.id;
    }

    // Handle doctor update
    if (updateData.doctorName !== undefined) {
      if (updateData.doctorName && updateData.doctorName.trim()) {
        // Get hospital ID (either from update data or existing visit)
        const hospitalId
          = visitUpdateData.hospitalId || existingVisit.hospitalId;
        const doctor = await findOrCreateDoctor(
          updateData.doctorName.trim(),
          hospitalId,
          user.userId,
        );
        visitUpdateData.doctorId = doctor.id;
      }
      else {
        visitUpdateData.doctorId = null;
      }
    }

    // Handle treatments update
    let treatmentsToUpdate = null;
    if (updateData.treatments) {
      treatmentsToUpdate = await findOrCreateTreatments(updateData.treatments);
    }

    // Update visit in a transaction
    const updatedVisit = await prisma.$transaction(async (tx) => {
      // Update the visit
      const visit = await tx.veterinaryVisit.update({
        where: { id },
        data: visitUpdateData,
      });

      // Update treatments if provided
      if (treatmentsToUpdate) {
        // Delete existing treatment relationships
        await tx.veterinaryVisitTreatment.deleteMany({
          where: { visitId: id },
        });

        // Create new treatment relationships
        await tx.veterinaryVisitTreatment.createMany({
          data: treatmentsToUpdate.map(treatment => ({
            visitId: id,
            treatmentId: treatment.id,
          })),
        });
      }

      // Return the updated visit with all related data
      return await tx.veterinaryVisit.findUnique({
        where: { id },
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
    });

    // Transform the data to flatten treatments
    const transformedVisit = {
      ...updatedVisit,
      treatments: updatedVisit!.treatments.map(vt => vt.treatment),
    };

    return {
      visit: transformedVisit,
      message: '通院記録が正常に更新されました',
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
    console.error('Error updating veterinary visit:', error);
    throw createError({
      statusCode: 500,
      statusMessage: '通院記録の更新に失敗しました',
    });
  }
});
