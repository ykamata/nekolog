<script setup lang="ts">
// 認証初期化中のローディングオーバーレイコンポーネント

interface Props {
  show?: boolean;
  message?: string;
}

const props = withDefaults(defineProps<Props>(), {
  show: false,
  message: '認証状態を確認しています...',
});
</script>

<template>
  <Teleport to="body">
    <Transition
      name="auth-loading"
      appear
    >
      <div
        v-if="show"
        class="auth-loading-overlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-loading-title"
        aria-describedby="auth-loading-description"
      >
        <div class="auth-loading-content">
          <!-- ローディングスピナー -->
          <div class="auth-loading-spinner">
            <div class="spinner-ring" />
            <div class="spinner-ring" />
            <div class="spinner-ring" />
          </div>

          <!-- ローディングメッセージ -->
          <h2
            id="auth-loading-title"
            class="auth-loading-title"
          >
            {{ message }}
          </h2>

          <p
            id="auth-loading-description"
            class="auth-loading-description"
          >
            しばらくお待ちください
          </p>

          <!-- プログレスバー（視覚的フィードバック） -->
          <div class="auth-loading-progress">
            <div class="progress-bar" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.auth-loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 1rem;
}

.auth-loading-content {
  text-align: center;
  max-width: 320px;
  width: 100%;
}

.auth-loading-spinner {
  position: relative;
  width: 60px;
  height: 60px;
  margin: 0 auto 1.5rem auto;
}

.spinner-ring {
  position: absolute;
  width: 100%;
  height: 100%;
  border: 3px solid transparent;
  border-top: 3px solid #4caf50;
  border-radius: 50%;
  animation: spin 1.2s linear infinite;
}

.spinner-ring:nth-child(2) {
  width: 80%;
  height: 80%;
  top: 10%;
  left: 10%;
  border-top-color: #66bb6a;
  animation-duration: 1.5s;
  animation-direction: reverse;
}

.spinner-ring:nth-child(3) {
  width: 60%;
  height: 60%;
  top: 20%;
  left: 20%;
  border-top-color: #81c784;
  animation-duration: 1.8s;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.auth-loading-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #2e7d32;
  margin: 0 0 0.5rem 0;
  line-height: 1.4;
}

.auth-loading-description {
  font-size: 0.875rem;
  color: #666;
  margin: 0 0 1.5rem 0;
  line-height: 1.4;
}

.auth-loading-progress {
  width: 100%;
  height: 4px;
  background: #e8f5e9;
  border-radius: 2px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #4caf50, #66bb6a, #4caf50);
  background-size: 200% 100%;
  animation: progress 2s ease-in-out infinite;
}

@keyframes progress {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

/* トランジション効果 */
.auth-loading-enter-active,
.auth-loading-leave-active {
  transition: all 0.3s ease;
}

.auth-loading-enter-from,
.auth-loading-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

/* ダークモード対応 */
@media (prefers-color-scheme: dark) {
  .auth-loading-overlay {
    background: rgba(0, 0, 0, 0.9);
  }

  .auth-loading-title {
    color: #81c784;
  }

  .auth-loading-description {
    color: #ccc;
  }

  .auth-loading-progress {
    background: #2e2e2e;
  }
}

/* 高コントラストモード対応 */
@media (prefers-contrast: high) {
  .auth-loading-overlay {
    background: rgba(255, 255, 255, 0.98);
    border: 2px solid #000;
  }

  .spinner-ring {
    border-top-color: #000;
  }

  .auth-loading-title {
    color: #000;
  }

  .progress-bar {
    background: #000;
  }
}

/* モーション削減対応 */
@media (prefers-reduced-motion: reduce) {
  .spinner-ring {
    animation: none;
  }

  .progress-bar {
    animation: none;
  }

  .auth-loading-enter-active,
  .auth-loading-leave-active {
    transition: none;
  }
}

/* モバイル対応 */
@media (max-width: 480px) {
  .auth-loading-content {
    max-width: 280px;
  }

  .auth-loading-spinner {
    width: 50px;
    height: 50px;
  }

  .auth-loading-title {
    font-size: 1rem;
  }

  .auth-loading-description {
    font-size: 0.8rem;
  }
}
</style>
