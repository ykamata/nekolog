import { z } from "zod";
import { prisma } from "~/lib/prisma";

const paramsSchema = z.object({
  id: z.coerce.number().positive("有効なフードIDを指定してください"),
});

const querySchema = z.object({
  force: z
    .string()
    .transform((val) => val === "true")
    .optional()
    .default("false"),
});

export default defineEventHandler(async (event) => {
  try {
    // Only allow DELETE method
    assertMethod(event, "DELETE");

    // Parse and validate route parameters
    const params = getRouterParams(event);
    const { id } = paramsSchema.parse(params);

    // Parse query parameters
    const query = getQuery(event);
    const { force } = querySchema.parse(query);

    // Check if food exists
    const existingFood = await prisma.food.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            meals: true,
          },
        },
      },
    });

    if (!existingFood) {
      throw createError({
        statusCode: 404,
        statusMessage: "指定されたフードが見つかりません",
      });
    }

    // Check if food has associated meal records
    if (existingFood._count.meals > 0 && !force) {
      throw createError({
        statusCode: 409,
        statusMessage:
          "このフードには関連する食事記録があります。削除するには force=true パラメータを指定してください。",
        data: {
          mealCount: existingFood._count.meals,
          requiresForce: true,
        },
      });
    }

    // Delete food (this will fail if there are meal records due to foreign key constraint)
    // The database constraint will prevent deletion if there are related meal records
    try {
      await prisma.food.delete({
        where: { id },
      });
    } catch (dbError: any) {
      if (dbError.code === "P2003") {
        throw createError({
          statusCode: 409,
          statusMessage:
            "このフードには関連する食事記録があるため削除できません。先に関連する食事記録を削除してください。",
        });
      }
      throw dbError;
    }

    return {
      message: "フードが正常に削除されました",
      deletedFood: {
        id: existingFood.id,
        name: existingFood.name,
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
