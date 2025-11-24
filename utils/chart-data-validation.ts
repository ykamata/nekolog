/**
 * チャートデータの検証とno-data状態の判定ユーティリティ
 * Requirements: 1.4, 3.3 - no-data状態の適切な処理
 */

export interface DataValidationResult {
  hasData: boolean;
  isEmpty: boolean;
  isPartiallyEmpty: boolean;
  dataCount: number;
  dateRange: {
    start: Date | null;
    end: Date | null;
    days: number;
  };
  missingDates: string[];
  suggestions: DataSuggestion[];
  reason: NoDataReason;
}

export interface DataSuggestion {
  type: 'dateRange' | 'catSelection' | 'dataEntry' | 'refresh';
  message: string;
  action?: string;
  priority: 'high' | 'medium' | 'low';
}

export type NoDataReason =
  | 'no_data_at_all'
  | 'no_data_for_period'
  | 'no_data_for_cat'
  | 'no_data_for_cat_and_period'
  | 'data_loading'
  | 'data_error'
  | 'filters_too_restrictive';

/**
 * チャートデータの検証を行う
 */
export function analyzeChartData(
  data: any[],
  options: {
    catId?: number | null;
    dateRange?: {
      start: Date;
      end: Date;
    };
    selectedDays?: number;
    isLoading?: boolean;
    hasError?: boolean;
  } = {},
): DataValidationResult {
  const { catId, dateRange, selectedDays, isLoading, hasError } = options;

  // ローディング中の場合
  if (isLoading) {
    return createValidationResult({
      hasData: false,
      isEmpty: true,
      reason: 'data_loading',
      suggestions: [{
        type: 'refresh',
        message: 'データを読み込み中です...',
        priority: 'low',
      }],
    });
  }

  // エラーがある場合
  if (hasError) {
    return createValidationResult({
      hasData: false,
      isEmpty: true,
      reason: 'data_error',
      suggestions: [{
        type: 'refresh',
        message: 'データの取得でエラーが発生しました。再試行してください。',
        priority: 'high',
      }],
    });
  }

  // データが存在しない場合
  if (!data || !Array.isArray(data) || data.length === 0) {
    const reason = determineNoDataReason(catId, dateRange);
    const suggestions = generateSuggestions(reason, { catId, dateRange, selectedDays });

    return createValidationResult({
      hasData: false,
      isEmpty: true,
      reason,
      suggestions,
    });
  }

  // データが存在する場合の詳細分析
  const dataCount = data.length;
  const dates = extractDatesFromData(data);
  const { start: dataStart, end: dataEnd } = getDataDateRange(dates);

  // 期間内の欠損日を計算
  const missingDates = dateRange ? calculateMissingDates(dateRange, dates) : [];
  const isPartiallyEmpty = missingDates.length > 0;

  // データ密度の計算
  const expectedDays = dateRange
    ? Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24)) + 1
    : selectedDays || 30;
  const dataDensity = dataCount / expectedDays;

  // 提案の生成
  const suggestions: DataSuggestion[] = [];

  if (isPartiallyEmpty && missingDates.length > expectedDays * 0.5) {
    suggestions.push({
      type: 'dateRange',
      message: 'データの欠損が多いため、期間を変更することをお勧めします。',
      priority: 'medium',
    });
  }

  if (dataDensity < 0.3) {
    suggestions.push({
      type: 'dataEntry',
      message: 'より詳細な分析のため、定期的な食事記録をお勧めします。',
      priority: 'low',
    });
  }

  return createValidationResult({
    hasData: true,
    isEmpty: false,
    isPartiallyEmpty,
    dataCount,
    dateRange: {
      start: dataStart,
      end: dataEnd,
      days: dates.length,
    },
    missingDates,
    suggestions,
    reason: 'no_data_at_all', // データがある場合は使用されない
  });
}

/**
 * no-dataの理由を判定
 */
function determineNoDataReason(
  catId?: number | null,
  dateRange?: { start: Date; end: Date },
): NoDataReason {
  const hasCatFilter = catId && catId !== null;
  const hasDateFilter = dateRange !== undefined;

  if (hasCatFilter && hasDateFilter) {
    return 'no_data_for_cat_and_period';
  }
  else if (hasCatFilter) {
    return 'no_data_for_cat';
  }
  else if (hasDateFilter) {
    return 'no_data_for_period';
  }
  else {
    return 'no_data_at_all';
  }
}

/**
 * 提案を生成
 */
function generateSuggestions(
  reason: NoDataReason,
  options: {
    catId?: number | null;
    dateRange?: { start: Date; end: Date };
    selectedDays?: number;
  },
): DataSuggestion[] {
  const suggestions: DataSuggestion[] = [];

  switch (reason) {
    case 'no_data_at_all':
      suggestions.push(
        {
          type: 'dataEntry',
          message: '食事データを記録して、グラフを表示しましょう。',
          action: 'record_meal',
          priority: 'high',
        },
        {
          type: 'refresh',
          message: 'データを更新して最新の情報を確認してください。',
          priority: 'medium',
        },
      );
      break;

    case 'no_data_for_period':
      suggestions.push(
        {
          type: 'dateRange',
          message: '期間を変更してデータを確認してみてください。',
          priority: 'high',
        },
        {
          type: 'dataEntry',
          message: 'この期間に食事を記録してみましょう。',
          action: 'record_meal',
          priority: 'medium',
        },
      );
      break;

    case 'no_data_for_cat':
      suggestions.push(
        {
          type: 'catSelection',
          message: '他の猫のデータを確認するか、すべての猫を表示してみてください。',
          priority: 'high',
        },
        {
          type: 'dataEntry',
          message: 'この猫の食事データを記録してみましょう。',
          action: 'record_meal',
          priority: 'medium',
        },
      );
      break;

    case 'no_data_for_cat_and_period':
      suggestions.push(
        {
          type: 'dateRange',
          message: '期間を変更してデータを確認してみてください。',
          priority: 'high',
        },
        {
          type: 'catSelection',
          message: '他の猫のデータも確認してみてください。',
          priority: 'high',
        },
        {
          type: 'dataEntry',
          message: 'この猫の食事データを記録してみましょう。',
          action: 'record_meal',
          priority: 'medium',
        },
      );
      break;

    case 'data_loading':
      suggestions.push({
        type: 'refresh',
        message: 'データを読み込み中です。しばらくお待ちください。',
        priority: 'low',
      });
      break;

    case 'data_error':
      suggestions.push({
        type: 'refresh',
        message: 'データの取得に失敗しました。再試行してください。',
        priority: 'high',
      });
      break;

    case 'filters_too_restrictive':
      suggestions.push(
        {
          type: 'dateRange',
          message: 'フィルター条件を緩和してみてください。',
          priority: 'high',
        },
        {
          type: 'catSelection',
          message: 'すべての猫のデータを表示してみてください。',
          priority: 'medium',
        },
      );
      break;
  }

  return suggestions;
}

/**
 * データから日付を抽出
 */
function extractDatesFromData(data: any[]): string[] {
  const dates = new Set<string>();

  data.forEach((item) => {
    if (item.date) {
      dates.add(item.date);
    }
    else if (item.timestamp) {
      const date = new Date(item.timestamp).toISOString().split('T')[0];
      if (date) {
        dates.add(date);
      }
    }
  });

  return Array.from(dates).sort();
}

/**
 * データの日付範囲を取得
 */
function getDataDateRange(dates: string[]): { start: Date | null; end: Date | null } {
  if (dates.length === 0) {
    return { start: null, end: null };
  }

  const sortedDates = dates.sort();
  if (sortedDates.length === 0) {
    const now = new Date();
    return { start: now, end: now };
  }

  return {
    start: new Date(sortedDates[0]!),
    end: new Date(sortedDates[sortedDates.length - 1]!),
  };
}

/**
 * 期間内の欠損日を計算
 */
function calculateMissingDates(
  dateRange: { start: Date; end: Date },
  existingDates: string[],
): string[] {
  const missingDates: string[] = [];
  const existingDateSet = new Set(existingDates);

  const currentDate = new Date(dateRange.start);
  const endDate = new Date(dateRange.end);

  while (currentDate <= endDate) {
    const dateString = currentDate.toISOString().split('T')[0];
    if (dateString && !existingDateSet.has(dateString)) {
      missingDates.push(dateString);
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return missingDates;
}

/**
 * 検証結果オブジェクトを作成
 */
function createValidationResult(
  partial: Partial<DataValidationResult>,
): DataValidationResult {
  return {
    hasData: false,
    isEmpty: true,
    isPartiallyEmpty: false,
    dataCount: 0,
    dateRange: {
      start: null,
      end: null,
      days: 0,
    },
    missingDates: [],
    suggestions: [],
    reason: 'no_data_at_all',
    ...partial,
  };
}

/**
 * ユーザーフレンドリーなno-dataメッセージを生成
 */
export function generateNoDataMessage(
  reason: NoDataReason,
  options: {
    catId?: string | null;
    dateRange?: { start: Date; end: Date };
    catName?: string;
  } = {},
): string {
  const { catId, dateRange, catName } = options;

  switch (reason) {
    case 'no_data_at_all':
      return 'まだ食事データが記録されていません。最初の食事を記録してグラフを表示しましょう。';

    case 'no_data_for_period':
      if (dateRange) {
        const startDate = dateRange.start.toLocaleDateString('ja-JP');
        const endDate = dateRange.end.toLocaleDateString('ja-JP');
        return `選択した期間（${startDate} 〜 ${endDate}）に食事データが見つかりませんでした。`;
      }
      return '選択した期間に食事データが見つかりませんでした。';

    case 'no_data_for_cat':
      const displayName = catName || (catId ? `猫ID: ${catId}` : '選択した猫');
      return `${displayName}の食事データが見つかりませんでした。`;

    case 'no_data_for_cat_and_period':
      const catDisplay = catName || (catId ? `猫ID: ${catId}` : '選択した猫');
      if (dateRange) {
        const startDate = dateRange.start.toLocaleDateString('ja-JP');
        const endDate = dateRange.end.toLocaleDateString('ja-JP');
        return `${catDisplay}の選択した期間（${startDate} 〜 ${endDate}）に食事データが見つかりませんでした。`;
      }
      return `${catDisplay}の選択した期間に食事データが見つかりませんでした。`;

    case 'data_loading':
      return 'データを読み込み中です...';

    case 'data_error':
      return 'データの取得中にエラーが発生しました。';

    case 'filters_too_restrictive':
      return 'フィルター条件が厳しすぎるため、データが見つかりませんでした。';

    default:
      return 'データがありません。';
  }
}

/**
 * エッジケースの検出と処理
 */
export function detectEdgeCases(
  data: any[],
  options: {
    dateRange?: { start: Date; end: Date };
    expectedMinimumRecords?: number;
  } = {},
): {
    hasEdgeCases: boolean;
    cases: Array<{
      type: 'future_dates' | 'old_dates' | 'duplicate_dates' | 'invalid_dates' | 'sparse_data';
      message: string;
      severity: 'low' | 'medium' | 'high';
      affectedCount: number;
    }>;
  } {
  const cases: any[] = [];
  const { dateRange, expectedMinimumRecords = 7 } = options;

  if (!data || data.length === 0) {
    return { hasEdgeCases: false, cases: [] };
  }

  const now = new Date();
  const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  const dates = extractDatesFromData(data);
  const dateSet = new Set<string>();
  let duplicateCount = 0;
  let futureCount = 0;
  let oldCount = 0;
  let invalidCount = 0;

  // 日付の検証
  dates.forEach((dateStr) => {
    const date = new Date(dateStr);

    // 無効な日付
    if (isNaN(date.getTime())) {
      invalidCount++;
      return;
    }

    // 重複日付
    if (dateSet.has(dateStr)) {
      duplicateCount++;
    }
    else {
      dateSet.add(dateStr);
    }

    // 未来の日付
    if (date > now) {
      futureCount++;
    }

    // 古すぎる日付
    if (date < oneYearAgo) {
      oldCount++;
    }
  });

  // エッジケースの追加
  if (futureCount > 0) {
    cases.push({
      type: 'future_dates',
      message: `${futureCount}件の未来の日付が含まれています。`,
      severity: 'medium',
      affectedCount: futureCount,
    });
  }

  if (oldCount > 0) {
    cases.push({
      type: 'old_dates',
      message: `${oldCount}件の1年以上前の古いデータが含まれています。`,
      severity: 'low',
      affectedCount: oldCount,
    });
  }

  if (duplicateCount > 0) {
    cases.push({
      type: 'duplicate_dates',
      message: `${duplicateCount}件の重複した日付が含まれています。`,
      severity: 'medium',
      affectedCount: duplicateCount,
    });
  }

  if (invalidCount > 0) {
    cases.push({
      type: 'invalid_dates',
      message: `${invalidCount}件の無効な日付が含まれています。`,
      severity: 'high',
      affectedCount: invalidCount,
    });
  }

  // データの密度チェック
  if (dateRange && data.length < expectedMinimumRecords) {
    const expectedDays = Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    if (data.length < expectedDays * 0.3) {
      cases.push({
        type: 'sparse_data',
        message: `データが疎らです（期待値の${Math.round((data.length / expectedDays) * 100)}%）。`,
        severity: 'low',
        affectedCount: expectedDays - data.length,
      });
    }
  }

  return {
    hasEdgeCases: cases.length > 0,
    cases,
  };
}
