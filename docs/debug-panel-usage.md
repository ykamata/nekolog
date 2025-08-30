# デバッグパネル使用ガイド

## 概要

デバッグパネルは開発環境でのみ表示される機能で、Chart.jsの動作状況、APIコール、エラー診断を監視できます。

## 機能一覧

### 1. Chart.jsデバッグパネル (`ChartDebugPanel`)

Chart.jsインスタンスの状態とパフォーマンスを監視します。

#### 表示情報

- **Chart.jsインスタンス状態**: 初期化状況、タイプ、データポイント数
- **パフォーマンスメトリクス**: 初期化時間、レンダリング時間、メモリ使用量
- **Chart.js設定**: 現在の設定内容（JSON形式）
- **システム情報**: ブラウザ、画面サイズ、デバイスタイプ

#### 操作

- **更新**: デバッグ情報を最新状態に更新
- **エクスポート**: デバッグ情報をJSONファイルとしてダウンロード
- **クリア**: デバッグ情報をリセット

### 2. API監視パネル (`ApiMonitorPanel`)

APIコールの詳細を追跡・監視します。

#### 表示情報

- **統計情報**: 総コール数、成功/失敗数、平均応答時間、キャッシュヒット率
- **進行中のコール**: 現在実行中のAPIリクエスト
- **最近のコール**: 最新20件のAPIコール履歴（詳細情報付き）

#### 操作

- **監視開始/停止**: API監視の有効/無効切り替え
- **履歴クリア**: APIコール履歴をクリア
- **エクスポート**: API監視データをJSONファイルとしてダウンロード

### 3. エラー診断パネル (`ErrorDiagnosticsPanel`)

エラーの分類、診断、トラブルシューティングガイドを提供します。

#### 表示情報

- **エラー統計**: 総エラー数、重要度別分類、解決状況
- **重要なエラー**: 未解決の重要エラー一覧
- **最近のエラー**: エラー履歴（提案・トラブルシューティング付き）
- **システム診断**: ブラウザ情報、メモリ使用量など

#### 操作

- **解決済みマーク**: エラーを解決済みとしてマーク
- **ログクリア**: エラーログをクリア
- **エクスポート**: エラー診断データをダウンロード
- **診断実行**: システム診断情報を更新

## 使用方法

### 基本的な使用方法

```vue
<template>
  <div>
    <!-- 既存のチャートコンポーネント -->
    <MealChart :cat-id="catId" />
    
    <!-- デバッグパネルを追加 -->
    <DebugPanel
      :chart-instance="chartInstance"
      :chart-debug-info="debugInfo"
      @refresh-chart-debug="refreshDebug"
      @export-chart-debug="exportDebug"
      @clear-chart-debug="clearDebug"
    />
  </div>
</template>

<script setup lang="ts">
const { debugInfo, refreshDebugInfo, exportDebugInfo, clearDebugInfo } = useChartDebug()
const chartInstance = ref(null)

const refreshDebug = () => refreshDebugInfo()
const exportDebug = () => exportDebugInfo()
const clearDebug = () => clearDebugInfo()
</script>
```

### Composableの使用

#### useChartDebug

```typescript
const {
  debugInfo,           // デバッグ情報
  isDebugMode,         // デバッグモード判定
  updateChartInstance, // Chart.jsインスタンス更新
  debugChartInit,      // Chart.js初期化のデバッグラッパー
  debugDataProcess,    // データ処理のデバッグラッパー
  debugChartRender     // レンダリングのデバッグラッパー
} = useChartDebug()
```

#### useApiMonitor

```typescript
const {
  recentApiCalls,      // 最近のAPIコール
  stats,               // 統計情報
  isMonitoring,        // 監視状態
  monitoredFetch,      // 監視機能付き$fetch
  monitoredUseFetch    // 監視機能付きuseFetch
} = useApiMonitor()
```

#### useErrorDiagnostics

```typescript
const {
  errorStats,          // エラー統計
  recentErrors,        // 最近のエラー
  criticalErrors,      // 重要なエラー
  logError,            // エラーログ記録
  getTroubleshootingGuide // トラブルシューティングガイド取得
} = useErrorDiagnostics()
```

### Chart.jsとの統合例

```typescript
// Chart.js初期化時
const initializeChart = async () => {
  return await debugChartInit(async () => {
    const chart = new Chart(canvas, config)
    return chart
  })
}

// データ処理時
const processData = (rawData: any) => {
  return debugDataProcess(() => {
    // データ変換ロジック
    return transformedData
  })
}

// レンダリング時
const renderChart = () => {
  debugChartRender(() => {
    chart.update()
  })
}
```

### API監視の統合例

```typescript
// 監視機能付きAPIコール
const fetchMealData = async (catId: string) => {
  return await monitoredFetch(`/api/meals/${catId}`)
}

// useFetchでの監視
const { data, error } = monitoredUseFetch('/api/analytics/meals', {
  query: { catId, dateRange }
})
```

### エラーハンドリングの統合例

```typescript
// エラーログ記録
try {
  await initializeChart()
} catch (error) {
  logError(error, {
    component: 'MealChart',
    catId: props.catId,
    action: 'chart_initialization'
  })
}

// グローバルエラーハンドラー設定
onMounted(() => {
  setupGlobalErrorHandler()
})
```

## トラブルシューティング

### よくある問題と解決方法

#### 1. デバッグパネルが表示されない

- 開発環境（`process.dev`）で実行されているか確認
- コンポーネントが正しくインポートされているか確認

#### 2. Chart.jsデバッグ情報が更新されない

- `updateChartInstance()`が適切に呼ばれているか確認
- Chart.jsインスタンスが正しく渡されているか確認

#### 3. API監視が動作しない

- `startMonitoring()`が呼ばれているか確認
- `monitoredFetch`または`monitoredUseFetch`を使用しているか確認

#### 4. エラーが記録されない

- `setupGlobalErrorHandler()`が呼ばれているか確認
- 手動でエラーを記録する場合は`logError()`を使用

## パフォーマンスへの影響

- デバッグ機能は開発環境でのみ動作し、本番環境では無効化されます
- API監視は軽量な実装で、通常のAPIコールに大きな影響を与えません
- エラー診断は必要最小限の情報のみを収集します

## セキュリティ考慮事項

- デバッグ情報には機密情報が含まれる可能性があるため、本番環境では無効化されます
- エクスポート機能は開発者のローカル環境でのみ使用してください
- APIレスポンスの詳細情報は開発環境でのみ記録されます
