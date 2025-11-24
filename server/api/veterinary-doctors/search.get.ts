import { z } from "zod";
import { prisma } from "~/lib/prisma";
import { requireAuth } from "~/lib/auth-middleware";

const searchQuerySchema = z.object({
  name: z.string().min(1, "検索クエリは必須です"),
  hospitalId: z.coerce.number().positive().optional(),
});

export default defineEventHandler(async (event) => {
  try {
    // 認証チェック
    const user = await requireAuth(event);

    // クエリパラメータを取得して検証
    const rawQuery = getQuery(event);
    const { name, hospitalId } = searchQuerySchema.parse(rawQuery);

    // 先生を検索（名前または専門分野での部分一致）
    const doctors = await prisma.veterinaryDoctor.findMany({
      where: {
        userId: user.userId,
        ...(hospitalId && { hospitalId }),
        OR: [
          {
            name: {
              contains: name,
            },
          },
          {
            specialty: {
              contains: name,
            },
          },
        ],
      },
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
        specialty: true,
        hospitalId: true,
        hospital: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return { doctors };
  } catch (error) {
    // Zodバリデーションエラーの場合
    if (error instanceof z.ZodError) {
      throw createError({
        statusCode: 400,
        statusMessage: "検索クエリが無効です",
        data: {
          validationErrors: error.errors,
        },
      });
    }

    // Re-throw HTTP errors
    if (error && typeof error === "object" && "statusCode" in error) {
      throw error;
    }

    console.error("Failed to search veterinary doctors:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "先生の検索に失敗しました",
    });
  }
});
