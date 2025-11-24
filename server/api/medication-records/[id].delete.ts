import { z } from "zod";
import { prisma } from "~/lib/prisma";

const paramsSchema = z.object({
  id: z.coerce.number().positive("有効なIDを指定してください"),
});

export default defineEventHandler(async (event) => {
  try {
    // Only allow DELETE method
    assertMethod(event, "DELETE");

    // Parse and validate route parameters
    const params = getRouterParams(event);
    const { id } = paramsSchema.parse(params);

    // Check if record exists
    const existingRecord = await prisma.medicationRecord.findUnique({
      where: { id },
      select: {
        id: true,
        cat: { select: { name: true } },
        medication: { select: { name: true } },
        administeredAt: true,
      },
    });

    if (!existingRecord) {
      throw createError({
        statusCode: 404,
        statusMessage: "投与記録が見つかりません",
      });
    }

    // Delete medication record
    await prisma.medicationRecord.delete({
      where: { id },
    });

    return {
      message: "投与記録が正常に削除されました",
      deletedRecord: {
        id: existingRecord.id,
        catName: existingRecord.cat.name,
        medicationName: existingRecord.medication.name,
        administeredAt: existingRecord.administeredAt,
      },
    };
  } catch (error) {
    // Handle validation errors
    if (error instanceof z.ZodError) {
      throw createError({
        statusCode: 400,
        statusMessage: "Invalid parameters",
        data: error.errors,
      });
    }

    // Re-throw HTTP errors
    if (error && typeof error === "object" && "statusCode" in error) {
      throw error;
    }

    // Handle unexpected errors
    throw createError({
      statusCode: 500,
      statusMessage: "Internal server error",
    });
  }
});
