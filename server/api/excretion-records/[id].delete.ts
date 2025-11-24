import { z } from "zod";
import { prisma } from "~/lib/prisma";

const paramsSchema = z.object({
  id: z.coerce.number().positive("Invalid excretion record ID format"),
});

export default defineEventHandler(async (event) => {
  try {
    // Only allow DELETE method
    assertMethod(event, "DELETE");

    // Parse and validate route parameters
    const params = getRouterParams(event);
    const { id } = paramsSchema.parse(params);

    // Check if excretion record exists
    const existingRecord = await prisma.excretionRecord.findUnique({
      where: { id },
      select: {
        id: true,
        type: true,
        recordedAt: true,
        cat: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!existingRecord) {
      throw createError({
        statusCode: 404,
        statusMessage: "指定された排泄記録が見つかりません",
      });
    }

    // Delete excretion record
    await prisma.excretionRecord.delete({
      where: { id },
    });

    return {
      message: "排泄記録が正常に削除されました",
      deletedRecord: {
        id: existingRecord.id,
        catName: existingRecord.cat.name,
        type: existingRecord.type,
        recordedAt: existingRecord.recordedAt,
      },
    };
  } catch (error) {
    // Handle validation errors
    if (error instanceof z.ZodError) {
      throw createError({
        statusCode: 400,
        statusMessage: "無効な排泄記録IDです",
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
