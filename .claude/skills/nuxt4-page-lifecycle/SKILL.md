---
name: nuxt4-lifecycle
description: Nuxt 4のページライフサイクルについて質問されたとき、SSRとクライアントサイドの実行順序を説明するとき、onMountedやuseFetchの使い分けを説明するとき、ハイドレーションについて説明するとき
---

# Nuxt 4 ページインスタンスのライフサイクル

## 概要

Nuxt 4はVue 3をベースとしたフルスタックフレームワークであり、サーバーサイドレンダリング（SSR）とクライアントサイドハイドレーションを組み合わせた独自のライフサイクルを持つ。ページコンポーネントのライフサイクルを理解することは、パフォーマンス最適化とバグ回避のために重要である。

## ライフサイクルの実行フロー

### 1. サーバーサイド（SSR）での実行順序

```
1. サーバープラグイン初期化
   ↓
2. サーバーミドルウェア実行
   ↓
3. アプリプラグイン実行 → app:created フック発火
   ↓
4. ルートバリデーション（definePageMeta の validate）
   ↓
5. アプリミドルウェア実行
   ↓
6. ページ & コンポーネントレンダリング
   - useAsyncData / useFetch 実行
   - <script setup> 内の同期コード実行
   - ※ onMounted などのVueライフサイクルは実行されない
   ↓
7. HTML出力 → app:rendered / render:html フック発火
```

### 2. クライアントサイドでの実行順序

```
1. アプリプラグイン実行（.client プラグイン含む）→ app:created フック
   ↓
2. ルートバリデーション再実行
   ↓
3. アプリミドルウェア再実行
   ↓
4. ハイドレーション → app:beforeMount フック
   - サーバーで生成されたHTMLとVueコンポーネントをマッチング
   - useAsyncData / useFetch のデータを再利用（重複リクエストなし）
   ↓
5. Vueライフサイクル開始 → app:mounted フック
   - onBeforeMount
   - onMounted
   - onUpdated（リアクティブ変更時）
   - onBeforeUnmount / onUnmounted（ページ離脱時）
```

### 3. クライアントナビゲーション時（SPA遷移）

```
1. page:start フック → Suspense開始
   ↓
2. page:loading:start フック → 新ページのsetup()実行
   ↓
3. ルートバリデーション
   ↓
4. アプリミドルウェア実行
   ↓
5. ページコンポーネントのマウント
   - onMounted 実行
   - useAsyncData / useFetch 実行（必要に応じて）
   ↓
6. page:finish / page:loading:end フック
   ↓
7. page:transition:finish フック（トランジション完了後）
```

## 主要なライフサイクルフック

### Vueライフサイクルフック（クライアントのみ）

| フック | 実行タイミング | 用途 |
|--------|---------------|------|
| `onBeforeMount` | マウント直前 | 初期状態のセットアップ |
| `onMounted` | マウント後 | DOM操作、イベントリスナー登録、外部ライブラリ初期化 |
| `onBeforeUpdate` | 更新直前 | 更新前の状態取得 |
| `onUpdated` | 更新後 | DOM更新後の処理 |
| `onBeforeUnmount` | アンマウント直前 | クリーンアップ準備 |
| `onUnmounted` | アンマウント後 | リソース解放、イベントリスナー削除 |

**重要**: SSR中は `onMounted` 以降のフックは実行されない。

### Nuxt アプリフック

```typescript
const nuxtApp = useNuxtApp()

// アプリ初期化時
nuxtApp.hook('app:created', () => { /* ... */ })
nuxtApp.hook('app:beforeMount', () => { /* ... */ })
nuxtApp.hook('app:mounted', () => { /* ... */ })

// ページナビゲーション時
nuxtApp.hook('page:start', () => { /* ... */ })
nuxtApp.hook('page:finish', () => { /* ... */ })
nuxtApp.hook('page:loading:start', () => { /* ... */ })
nuxtApp.hook('page:loading:end', () => { /* ... */ })
nuxtApp.hook('page:transition:finish', () => { /* ... */ })
```

## データフェッチのライフサイクル

### useFetch / useAsyncData

- **SSR時**: サーバーサイドでデータを取得し、HTMLに埋め込む
- **ハイドレーション時**: サーバーで取得したデータを再利用（リクエストなし）
- **SPA遷移時**: クライアントでデータを取得

```typescript
// サーバーとクライアント両方で実行
const { data, pending, error, refresh } = await useFetch('/api/data')

// クライアントのみで実行（server: false）
const { data } = await useFetch('/api/data', { server: false })

// 遅延実行（navigation blocking なし）
const { data } = await useLazyFetch('/api/data')
```

### $fetch

- `$fetch` はSSR/クライアント両方で使用可能
- `onMounted` 内で使用するとクライアントのみで実行される

```typescript
onMounted(async () => {
  // クライアントのみで実行
  const data = await $fetch('/api/data')
})
```

## 実践的なパターン

### パターン1: SSRデータフェッチ + クライアント更新

```typescript
// SSRでデータ取得
const { data: initialStats } = await useFetch('/api/dashboard/stats', {
  default: () => ({ cats: 0, foods: 0 }),
  server: true,
})

// 状態を初期化
const stats = ref(initialStats.value)

// クライアントのみで追加処理
onMounted(async () => {
  // 必要に応じてデータを更新
  if (stats.value.cats === 0) {
    const freshData = await $fetch('/api/dashboard/stats')
    stats.value = freshData
  }
})
```

### パターン2: ページナビゲーション検知

```typescript
const nuxtApp = useNuxtApp()
const mealListRef = ref()

// ページ遷移完了時にデータをリフレッシュ
const unsubscribe = nuxtApp.hook('page:finish', () => {
  if (mealListRef.value) {
    mealListRef.value.fetchMealRecords(true)
  }
})

// クリーンアップ（重要）
onUnmounted(() => {
  unsubscribe()
})
```

### パターン3: クライアント専用ページ（SSR無効化）

```typescript
// SSRを無効化してクライアントのみで実行
definePageMeta({
  ssr: false,
})

// 全てのコードがクライアントでのみ実行される
onMounted(async () => {
  await fetchData()
  initializeChart()
})
```

### パターン4: 適切なクリーンアップ

```typescript
let orientationChangeHandler: (() => void) | null = null
let intersectionObserver: IntersectionObserver | null = null

onMounted(() => {
  // イベントリスナー登録
  orientationChangeHandler = () => { /* ... */ }
  window.addEventListener('orientationchange', orientationChangeHandler)

  // Observer登録
  intersectionObserver = new IntersectionObserver(/* ... */)
  intersectionObserver.observe(targetElement)
})

onUnmounted(() => {
  // イベントリスナー削除
  if (orientationChangeHandler) {
    window.removeEventListener('orientationchange', orientationChangeHandler)
  }

  // Observer切断
  if (intersectionObserver) {
    intersectionObserver.disconnect()
  }
})
```

## 注意点とベストプラクティス

### 1. SSRとクライアントの環境判定

```typescript
// 環境判定
if (import.meta.client) {
  // クライアントのみで実行
}

if (import.meta.server) {
  // サーバーのみで実行
}
```

### 2. ハイドレーションミスマッチの回避

- サーバーとクライアントで異なる出力を避ける
- クライアント専用コンポーネントは `<ClientOnly>` で囲む
- `Date.now()` や `Math.random()` などはSSRで使用しない

```vue
<ClientOnly>
  <DynamicChart :data="chartData" />
  <template #fallback>
    <div class="loading">読み込み中...</div>
  </template>
</ClientOnly>
```

### 3. データフェッチのタイミング

| シナリオ | 推奨方法 |
|---------|---------|
| SEO重要なデータ | `useFetch` / `useAsyncData` |
| ユーザー固有データ | `onMounted` + `$fetch` |
| 大量データ | `useLazyFetch` + ローディング表示 |
| リアルタイムデータ | `onMounted` + WebSocket / ポーリング |

### 4. メモリリークの防止

- `onMounted` で登録したリソースは必ず `onUnmounted` で解放
- `nuxtApp.hook` の購読解除を忘れない
- `setInterval` / `setTimeout` のクリアを確実に行う

## 参考リンク

- [Nuxt Lifecycle](https://nuxt.com/docs/4.x/guide/concepts/nuxt-lifecycle)
- [Lifecycle Hooks API](https://nuxt.com/docs/4.x/api/advanced/hooks)
- [useAsyncData](https://nuxt.com/docs/4.x/api/composables/use-async-data)
- [Vue Composition API Lifecycle](https://vuejs.org/api/composition-api-lifecycle)
