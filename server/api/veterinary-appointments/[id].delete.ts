import { z } from 'zod';
import { prisma } from '~/lib/prisma';

const paramsSchema = z.object({
  id: z.coerce.number().positive('有効なIDを指定してください'),
});

export default defineEventHandler(async (event) => {
  try {
    // Only allow DELETE method
    assertMethod(event, 'DELETE');

    // Parse and validate route parameters
    const params = getRouterParams(event);
    const { id } = paramsSchema.parse(params);

    // Check if appointment exists
    const existingAppointment = await prisma.veterinaryAppointment.findUnique({
      where: { id },
      include: {
        cat: {
          select: {
            name: true,
          },
        },
        hospital: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!existingAppointment) {
      throw createError({
        statusCode: 404,
        statusMessage: '指定された予約が見つかりません',
      });
    }

    // Delete the appointment
    await prisma.veterinaryAppointment.delete({
      where: { id },
    });

    return {
      message: `${existingAppointment.cat.name}の予約（${existingAppointment.hospital.name}）が正常に削除されました`,
      deletedAppointment: {
        id: existingAppointment.id,
        catName: existingAppointment.cat.name,
        hospitalName: existingAppointment.hospital.name,
        appointmentDate: existingAppointment.appointmentDate,
        status: existingAppointment.status,
      },
    };
  }
  catch (error) {
    // Handle validation errors
    if (error instanceof z.ZodError) {
      throw createError({
        statusCode: 400,
        statusMessage: 'パラメータが無効です',
        data: error.errors,
      });
    }

    // Re-throw HTTP errors
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }

    // Handle unexpected errors
    console.error('Error deleting veterinary appointment:', error);
    throw createError({
      statusCode: 500,
      statusMessage: '予約の削除に失敗しました',
    });
  }
});
