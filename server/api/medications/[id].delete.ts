import { z } from 'zod';
import { prisma } from '~/lib/prisma';

const paramsSchema = z.object({
  id: z.coerce.number().positive('Invalid medication ID format'),
});

const querySchema = z.object({
  cascade: z
    .string()
    .optional()
    .transform(val => val === 'true'),
});

export default defineEventHandler(async (event) => {
  try {
    // Only allow DELETE method
    assertMethod(event, 'DELETE');

    // Parse and validate route parameters
    const params = getRouterParams(event);
    const { id } = paramsSchema.parse(params);

    // Parse query parameters
    const query = getQuery(event);
    const { cascade } = querySchema.parse(query);

    // Check if medication exists
    const existingMedication = await prisma.medication.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            records: true,
            schedules: true,
          },
        },
      },
    });

    if (!existingMedication) {
      throw createError({
        statusCode: 404,
        statusMessage: '指定された薬が見つかりません',
      });
    }

    // Check for related records
    const hasRelatedData
      = existingMedication._count.records > 0
        || existingMedication._count.schedules > 0;

    if (hasRelatedData && !cascade) {
      throw createError({
        statusCode: 409,
        statusMessage:
          'この薬には投与記録またはスケジュールが関連付けられています。削除するには cascade=true パラメータを指定してください。',
        data: {
          relatedRecords: existingMedication._count.records,
          relatedSchedules: existingMedication._count.schedules,
          requiresCascade: true,
        },
      });
    }

    // Delete medication (cascade will automatically delete related records due to onDelete: Restrict/Cascade in schema)
    // Note: We need to manually delete records first due to Restrict constraint
    if (cascade && hasRelatedData) {
      await prisma.$transaction(async (tx) => {
        // Delete reminders first (they reference schedules)
        await tx.medicationReminder.deleteMany({
          where: { medicationId: id },
        });

        // Delete schedules
        await tx.medicationSchedule.deleteMany({
          where: { medicationId: id },
        });

        // Delete records
        await tx.medicationRecord.deleteMany({
          where: { medicationId: id },
        });

        // Finally delete the medication
        await tx.medication.delete({
          where: { id },
        });
      });
    }
    else {
      await prisma.medication.delete({
        where: { id },
      });
    }

    return {
      message: `薬「${existingMedication.name}」が正常に削除されました`,
      deletedRecords: existingMedication._count.records,
      deletedSchedules: existingMedication._count.schedules,
    };
  }
  catch (error) {
    // Handle validation errors
    if (error instanceof z.ZodError) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid parameters',
        data: error.errors,
      });
    }

    // Re-throw HTTP errors
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }

    // Handle unexpected errors
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error',
    });
  }
});
