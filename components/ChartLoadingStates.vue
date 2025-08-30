<template>
  <div class="chart-loading-container">
    <!-- スケルトンローディング -->
    <div
      v-if="loadingType === 'skeleton'"
      class="skeleton-loading"
      :class="{ 'animate-pulse': animate }"
      role="status"
      aria-label="チャートを読み込み中"
    >
      <!-- チャートコントロール部分のスケルトン -->
      <div class="skeleton-controls mb-4 flex flex-wrap gap-4">
        <div class="skeleton-control">
          <div class="skeleton-label h-4 bg-gray-200 rounded w-16 mb-2" />
          <div class="skeleton-buttons flex rounded-lg overflow-hidden">
            <div class="skeleton-button h-10 bg-gray-200 w-20" />
            <div class="skeleton-button h-10 bg-gray-300 w-24 border-l border-gray-400" />
          </div>
        </div>
        <div class="skeleton-control">
          <div class="skeleton-label h-4 bg-gray-200 rounded w-20 mb-2" />
          <div class="skeleton-buttons flex rounded-lg overflow-hidden">
            <div class="skeleton-button h-10 bg-gray-200 w-16" />
            <div class="skeleton-button h-10 bg-gray-300 w-16 border-l border-gray-400" />
            <div class="skeleton-button h-10 bg-gray-200 w-20 border-l border-gray-400" />
          </div>
        </div>
        <div class="skeleton-control">
          <div class="skeleton-label h-4 bg-gray-200 rounded w-12 mb-2" />
          <div class="skeleton-select h-10 bg-gray-200 rounded w-24" />
        </div>
      </div>

      <!-- チャート部分のスケルトン -->
      <div class="skeleton-chart-container">
        <div
          class="skeleton-chart bg-gray-100 rounded-lg border-2 border-gray-200 relative overflow-hidden"
          :style="{ height: chartHeight + 'px' }"
        >
          <!-- グリッドライン風のスケルトン -->
          <div class="skeleton-grid absolute inset-0">
            <!-- 水平線 -->
            <div
              v-for="i in 5"
              :key="`h-${i}`"
              class="skeleton-grid-line-h absolute w-full h-px bg-gray-200"
              :style="{ top: (i * 20) + '%' }"
            />
            <!-- 垂直線 -->
            <div
              v-for="i in 7"
              :key="`v-${i}`"
              class="skeleton-grid-line-v absolute h-full w-px bg-gray-200"
              :style="{ left: (i * 14.28) + '%' }"
            />
          </div>

          <!-- データライン風のスケルトン -->
          <div class="skeleton-data-lines absolute inset-4">
            <svg
              class="w-full h-full"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              <!-- 線グラフ風のパス -->
              <path
                v-if="chartType === 'line'"
                d="M 5,80 Q 20,60 35,70 T 65,50 T 95,40"
                stroke="rgb(59, 130, 246)"
                stroke-width="2"
                fill="none"
                opacity="0.3"
                class="skeleton-path"
              />
              <!-- 棒グラフ風の矩形 -->
              <g v-else-if="chartType === 'bar'">
                <rect
                  v-for="(height, index) in skeletonBarHeights"
                  :key="index"
                  :x="5 + index * 12"
                  :y="90 - height"
                  width="8"
                  :height="height"
                  fill="rgb(59, 130, 246)"
                  opacity="0.3"
                  class="skeleton-bar"
                />
              </g>
            </svg>
          </div>

          <!-- ローディングオーバーレイ -->
          <div class="skeleton-overlay absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-shimmer" />
        </div>

        <!-- サマリーカード部分のスケルトン -->
        <div class="skeleton-summary mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div
            v-for="i in 3"
            :key="i"
            class="skeleton-summary-card bg-gray-50 p-4 rounded-lg"
          >
            <div class="skeleton-summary-title h-4 bg-gray-200 rounded w-16 mb-2" />
            <div class="skeleton-summary-value h-8 bg-gray-300 rounded w-20" />
          </div>
        </div>
      </div>
    </div>

    <!-- プログレスインジケーター -->
    <div
      v-else-if="loadingType === 'progress'"
      class="progress-loading"
      role="status"
      aria-label="チャートを読み込み中"
    >
      <div class="progress-container bg-white rounded-lg shadow-sm border p-6">
        <!-- プログレスヘッダー -->
        <div class="progress-header text-center mb-6">
          <div class="progress-icon text-4xl mb-2">
            📊
          </div>
          <h3 class="progress-title text-lg font-medium text-gray-900 mb-1">
            {{ progressTitle }}
          </h3>
          <p class="progress-subtitle text-sm text-gray-600">
            {{ progressSubtitle }}
          </p>
        </div>

        <!-- プログレスバー -->
        <div class="progress-bar-container mb-4">
          <div class="progress-bar-track bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              class="progress-bar-fill bg-blue-600 h-full rounded-full transition-all duration-300 ease-out"
              :style="{ width: progress + '%' }"
            />
          </div>
          <div class="progress-percentage text-center mt-2 text-sm font-medium text-gray-700">
            {{ Math.round(progress) }}%
          </div>
        </div>

        <!-- プログレス詳細 -->
        <div class="progress-details space-y-2">
          <div
            v-for="step in progressSteps"
            :key="step.id"
            class="progress-step flex items-center gap-3 text-sm"
          >
            <div class="step-icon flex-shrink-0">
              <div
                v-if="step.status === 'completed'"
                class="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center"
              >
                <svg
                  class="w-3 h-3 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fill-rule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clip-rule="evenodd"
                  />
                </svg>
              </div>
              <div
                v-else-if="step.status === 'active'"
                class="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center"
              >
                <div class="w-2 h-2 bg-white rounded-full animate-pulse" />
              </div>
              <div
                v-else
                class="w-5 h-5 bg-gray-300 rounded-full"
              />
            </div>
            <span
              class="step-label"
              :class="{
                'text-green-700 font-medium': step.status === 'completed',
                'text-blue-700 font-medium': step.status === 'active',
                'text-gray-500': step.status === 'pending',
              }"
            >
              {{ step.label }}
            </span>
            <span
              v-if="step.duration && step.status === 'completed'"
              class="step-duration text-xs text-gray-400 ml-auto"
            >
              {{ step.duration }}ms
            </span>
          </div>
        </div>

        <!-- キャンセルボタン -->
        <div
          v-if="showCancelButton"
          class="progress-actions mt-6 text-center"
        >
          <button
            type="button"
            class="cancel-button px-4 py-2 text-sm text-gray-600 hover:text-gray-800 underline"
            @click="$emit('cancel')"
          >
            キャンセル
          </button>
        </div>
      </div>
    </div>

    <!-- シンプルスピナー -->
    <div
      v-else-if="loadingType === 'spinner'"
      class="spinner-loading flex flex-col items-center justify-center"
      :style="{ height: chartHeight + 'px' }"
      role="status"
      aria-label="チャートを読み込み中"
    >
      <div class="spinner-container mb-4">
        <div class="spinner w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
      <div class="spinner-text text-sm text-gray-600">
        {{ spinnerText }}
      </div>
    </div>

    <!-- ドットローディング -->
    <div
      v-else-if="loadingType === 'dots'"
      class="dots-loading flex flex-col items-center justify-center"
      :style="{ height: chartHeight + 'px' }"
      role="status"
      aria-label="チャートを読み込み中"
    >
      <div class="dots-container flex gap-1 mb-4">
        <div
          v-for="i in 3"
          :key="i"
          class="dot w-2 h-2 bg-blue-600 rounded-full animate-bounce"
          :style="{ animationDelay: (i - 1) * 0.1 + 's' }"
        />
      </div>
      <div class="dots-text text-sm text-gray-600">
        {{ dotsText }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface ProgressStep {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'completed';
  duration?: number;
}

interface Props {
  loadingType: 'skeleton' | 'progress' | 'spinner' | 'dots';
  chartType?: 'line' | 'bar';
  chartHeight?: number;
  animate?: boolean;
  progress?: number;
  progressTitle?: string;
  progressSubtitle?: string;
  progressSteps?: ProgressStep[];
  showCancelButton?: boolean;
  spinnerText?: string;
  dotsText?: string;
}

const props = withDefaults(defineProps<Props>(), {
  chartType: 'line',
  chartHeight: 400,
  animate: true,
  progress: 0,
  progressTitle: 'チャートを読み込み中',
  progressSubtitle: 'データを処理しています...',
  progressSteps: () => [],
  showCancelButton: false,
  spinnerText: 'データを読み込み中...',
  dotsText: 'チャートを準備中...',
});

defineEmits<{
  cancel: [];
}>();

// スケルトン用の棒グラフの高さ（ランダムな見た目のため）
const skeletonBarHeights = ref([30, 45, 25, 60, 40, 35, 50, 20]);
</script>

<style scoped>
/* スケルトンアニメーション */
@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

.animate-shimmer {
  animation: shimmer 2s infinite;
}

/* スケルトンパスのアニメーション */
.skeleton-path {
  stroke-dasharray: 5, 5;
  animation: dash 2s linear infinite;
}

@keyframes dash {
  to {
    stroke-dashoffset: -10;
  }
}

/* スケルトンバーのアニメーション */
.skeleton-bar {
  animation: pulse-bar 2s ease-in-out infinite;
}

@keyframes pulse-bar {
  0%, 100% {
    opacity: 0.3;
  }
  50% {
    opacity: 0.6;
  }
}

/* プログレスバーのスムーズな遷移 */
.progress-bar-fill {
  transition: width 0.3s ease-out;
}

/* ドットアニメーションの調整 */
.animate-bounce {
  animation-duration: 1s;
  animation-iteration-count: infinite;
}
</style>
