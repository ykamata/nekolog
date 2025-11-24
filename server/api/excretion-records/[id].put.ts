import { z } from "zod";
import { prisma } from "~/lib/prisma";
import { ExcretionRecordUpdateSchema } from "~/lib/validations/excretion";

const paramsSchema = z.object({
  id: z.coerce.number().positive("Invalid excretion record ID format"),
});

export default defineEventHandler(async (event) => {
  try {
    // Only allow PUT method
    assertMethod(event, "PUT");

    // Parse and validate route parameters
    const params = getRouterParams(event);
    const { id } = paramsSchema.parse(params);

    // Parse and validate request body
    const body = await readBody(event);
    const updateData = ExcretionRecordUpdateSchema.parse(body);

    // Check if excretion record exists
    const existingRecord = await prisma.excretionRecord.findUnique({
      where: { id },
      select: { id: true, catId: true },
    });

    if (!existingRecord) {
      throw createError({
        statusCode: 404,
        statusMessage: "指定された排泄記録が見つかりません",
      });
    }

    // If catId is being updated, verify the cat exists
    if (updateData.catId) {
      const cat = await prisma.cat.findUnique({
        where: { id: updateData.catId },
        select: { id: true },
      });

      if (!cat) {
        throw createError({
          statusCode: 404,
          statusMessage: "指定された猫が見つかりません",
        });
      }
    }

    // Prepare update data with proper typing
    const finalUpdateData: {
      catId?: string;
      type?: "URINE" | "FECES";
      recordedAt?: Date;
      notes?: string;
    } = {};

    if (updateData.catId) finalUpdateData.catId = updateData.catId;
    if (updateData.type)
      finalUpdateData.type = updateData.type as "URINE" | "FECES";
    if (updateData.recordedAt)
      finalUpdateData.recordedAt = updateData.recordedAt;
    if (updateData.notes !== undefined)
      finalUpdateData.notes = updateData.notes;

    // Update excretion record
    const excretionRecord = await prisma.excretionRecord.update({
      where: { id },
      data: finalUpdateData,
      include: {
        cat: {
          select: {
            id: true,
            name: true,
            photoUrl: true,
          },
        },
      },
    });

    return {
      record: excretionRecord,
      message: "排泄記録が正常に更新されました",
    };
  } catch (error) {
    // Handle validation errors
    if (error instanceof z.ZodError) {
      throw createError({
        statusCode: 400,
        statusMessage: "入力データが無効です",
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
