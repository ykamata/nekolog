/**
 * チャート分析用のZodバリデーションスキーマ
 */

import { z } from "zod";

// チャートタイプの定義
export const ChartTypeSchema = z.enum(["line", "bar", "stacked-bar"], {
  errorMap: () => ({
    message:
      "チャートタイプはline、bar、stacked-barのいずれかを選択してください",
  }),
});

// 日付範囲バリデーション
export const DateRangeQuerySchema = z.object({
  startDate: z
    .string()
    .optional()
    .transform((str) => {
      if (!str) return undefined;
      try {
        const decodedStr = decodeURIComponent(str);
        const date = new Date(decodedStr);
        if (isNaN(date.getTime())) {
          throw new Error("Invalid date format");
        }
        return date;
      } catch (error) {
        throw new Error(`Invalid startDate format: ${str}`);
      }
    }),
  endDate: z
    .string()
    .optional()
    .transform((str) => {
      if (!str) return undefined;
      try {
        const decodedStr = decodeURIComponent(str);
        const date = new Date(decodedStr);
        if (isNaN(date.getTime())) {
          throw new Error("Invalid date format");
        }
        return date;
      } catch (error) {
        throw new Error(`Invalid endDate format: ${str}`);
      }
    }),
});

// チャート分析APIのクエリパラメータスキーマ
export const ChartAnalyticsQuerySchema = z
  .object({
    catId: z.coerce.number().int().positive().optional(),

    startDate: z
      .string()
      .optional()
      .transform((str) => {
        if (!str) return undefined;
        try {
          const decodedStr = decodeURIComponent(str);
          const date = new Date(decodedStr);
          if (isNaN(date.getTime())) {
            throw new Error("Invalid date format");
          }
          return date;
        } catch (error) {
          throw new Error(`開始日の形式が正しくありません: ${str}`);
        }
      }),

    endDate: z
      .string()
      .optional()
      .transform((str) => {
        if (!str) return undefined;
        try {
          const decodedStr = decodeURIComponent(str);
          const date = new Date(decodedStr);
          if (isNaN(date.getTime())) {
            throw new Error("Invalid date format");
          }
          return date;
        } catch (error) {
          throw new Error(`終了日の形式が正しくありません: ${str}`);
        }
      }),

    days: z
      .string()
      .optional()
      .default("30")
      .transform((str) => {
        const num = Number(str);
        if (isNaN(num) || num <= 0 || num > 365) {
          throw new Error("日数は1から365の間で指定してください");
        }
        return num;
      }),

    chartType: ChartTypeSchema.optional().default("line"),

    includeEmptyDates: z
      .string()
      .optional()
      .default("true")
      .transform((str) => str === "true"),

    maxDataPoints: z
      .string()
      .optional()
      .default("200")
      .transform((str) => {
        const num = Number(str);
        if (isNaN(num) || num <= 0 || num > 1000) {
          throw new Error(
            "最大データポイント数は1から1000の間で指定してください"
          );
        }
        return num;
      }),
  })
  .refine(
    (data) => {
      // 開始日と終了日の両方が指定されている場合の妥当性チェック
      if (data.startDate && data.endDate) {
        if (data.startDate > data.endDate) {
          return false;
        }

        const daysDiff = Math.ceil(
          (data.endDate.getTime() - data.startDate.getTime()) /
            (1000 * 60 * 60 * 24)
        );
        if (daysDiff > 365) {
          return false;
        }
      }
      return true;
    },
    {
      message:
        "開始日は終了日より前で、かつ日付範囲は365日以内で指定してください",
      path: ["endDate"],
    }
  );

// レスポンス用のスキーマ
export const ChartDataPointSchema = z.object({
  date: z.string(),
  catId: z.number(),
  catName: z.string(),
  totalCalories: z.number(),
  dryFoodCalories: z.number(),
  wetFoodCalories: z.number(),
  mealCount: z.number(),
});

export const ChartDatasetSchema = z.object({
  label: z.string(),
  data: z.array(z.number()),
  backgroundColor: z.string().optional(),
  borderColor: z.string().optional(),
  type: z.enum(["line", "bar"]).optional(),
});

export const ProcessedChartDataSchema = z.object({
  labels: z.array(z.string()),
  datasets: z.array(ChartDatasetSchema),
  isEmpty: z.boolean(),
  dateRange: z.object({
    start: z.date(),
    end: z.date(),
  }),
});

export const FoodTypeStatsSchema = z.object({
  totalDryCalories: z.number(),
  totalWetCalories: z.number(),
  dryFoodPercentage: z.number(),
  wetFoodPercentage: z.number(),
  averageDailyCalories: z.number(),
});

export const ChartAnalyticsResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    chartData: ProcessedChartDataSchema,
    dataPoints: z.array(ChartDataPointSchema),
    stats: FoodTypeStatsSchema,
    summary: z.object({
      totalMeals: z.number(),
      totalCalories: z.number(),
      averageCaloriesPerMeal: z.number(),
      dateRange: z.object({
        startDate: z.date(),
        endDate: z.date(),
      }),
      catCount: z.number(),
    }),
    performance: z.object({
      recordCount: z.number(),
      processedRecords: z.number(),
      processingTime: z.number(),
      samplingApplied: z.boolean(),
      samplingInfo: z
        .object({
          originalCount: z.number(),
          sampledCount: z.number(),
        })
        .optional(),
    }),
  }),
  error: z.string().optional(),
});

// 型エクスポート
export type ChartAnalyticsQuery = z.infer<typeof ChartAnalyticsQuerySchema>;
export type ChartDataPoint = z.infer<typeof ChartDataPointSchema>;
export type ChartDataset = z.infer<typeof ChartDatasetSchema>;
export type ProcessedChartData = z.infer<typeof ProcessedChartDataSchema>;
export type FoodTypeStats = z.infer<typeof FoodTypeStatsSchema>;
export type ChartAnalyticsResponse = z.infer<
  typeof ChartAnalyticsResponseSchema
>;
export type ChartType = z.infer<typeof ChartTypeSchema>;
