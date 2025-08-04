<template>
  <div
    class="optimized-image-container"
    :class="containerClass"
  >
    <!-- Loading placeholder -->
    <div
      v-if="isLoading"
      class="image-placeholder"
      :style="placeholderStyle"
    >
      <div class="loading-spinner" />
    </div>

    <!-- Error placeholder -->
    <div
      v-else-if="hasError"
      class="image-error"
      :style="placeholderStyle"
    >
      <span class="error-icon">📷</span>
      <span class="error-text">画像を読み込めません</span>
    </div>

    <!-- Optimized image -->
    <img
      v-else
      ref="imageRef"
      :src="optimizedSrc"
      :alt="alt"
      :width="width"
      :height="height"
      :loading="lazy ? 'lazy' : 'eager'"
      :decoding="async ? 'async' : 'sync'"
      class="optimized-image"
      :class="imageClass"
      @load="handleLoad"
      @error="handleError"
    >
  </div>
</template>

<script setup lang="ts">
interface Props {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  lazy?: boolean;
  async?: boolean;
  quality?: number;
  format?: 'webp' | 'avif' | 'jpeg' | 'png';
  sizes?: string;
  containerClass?: string;
  imageClass?: string;
  placeholder?: boolean;
  placeholderColor?: string;
}

const props = withDefaults(defineProps<Props>(), {
  width: undefined,
  height: undefined,
  lazy: true,
  async: true,
  quality: 80,
  format: 'webp',
  sizes: undefined,
  containerClass: '',
  imageClass: '',
  placeholder: true,
  placeholderColor: '#f0f0f0',
});

// State
const isLoading = ref(true);
const hasError = ref(false);
const imageRef = ref<HTMLImageElement>();

// Computed
const optimizedSrc = computed(() => {
  if (!props.src) return '';

  // 開発環境では元の画像をそのまま使用
  if (process.env.NODE_ENV === 'development') {
    return props.src;
  }

  // 本番環境では画像最適化パラメータを追加
  const url = new URL(props.src, window.location.origin);

  if (props.width) {
    url.searchParams.set('w', props.width.toString());
  }
  if (props.height) {
    url.searchParams.set('h', props.height.toString());
  }
  if (props.quality) {
    url.searchParams.set('q', props.quality.toString());
  }
  if (props.format) {
    url.searchParams.set('f', props.format);
  }

  return url.toString();
});

const placeholderStyle = computed(() => ({
  width: props.width ? `${props.width}px` : '100%',
  height: props.height ? `${props.height}px` : '200px',
  backgroundColor: props.placeholderColor,
}));

// Methods
const handleLoad = () => {
  isLoading.value = false;
  hasError.value = false;
};

const handleError = () => {
  isLoading.value = false;
  hasError.value = true;
};

// Intersection Observer for lazy loading optimization
const observerOptions = {
  root: null,
  rootMargin: '50px',
  threshold: 0.1,
};

let observer: IntersectionObserver | null = null;

onMounted(() => {
  if (props.lazy && 'IntersectionObserver' in window) {
    observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && imageRef.value) {
          // 画像が表示領域に入ったら高品質版を読み込む
          const img = imageRef.value;
          if (img.dataset.src) {
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
            observer?.unobserve(img);
          }
        }
      });
    }, observerOptions);

    if (imageRef.value) {
      observer.observe(imageRef.value);
    }
  }
});

onUnmounted(() => {
  if (observer && imageRef.value) {
    observer.unobserve(imageRef.value);
    observer.disconnect();
  }
});

// Preload critical images
const preloadImage = () => {
  if (!props.lazy) {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = optimizedSrc.value;
    document.head.appendChild(link);
  }
};

// Expose methods
defineExpose({
  preloadImage,
});
</script>

<style scoped>
.optimized-image-container {
  position: relative;
  display: inline-block;
  overflow: hidden;
}

.optimized-image {
  display: block;
  width: 100%;
  height: auto;
  transition: opacity 0.3s ease;
}

.image-placeholder,
.image-error {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 0.5rem;
  border-radius: 4px;
  color: #666;
  font-size: 0.9rem;
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid #f3f3f3;
  border-top: 2px solid #4caf50;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.error-icon {
  font-size: 2rem;
  opacity: 0.5;
}

.error-text {
  font-size: 0.8rem;
  text-align: center;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Responsive images */
.optimized-image {
  max-width: 100%;
  height: auto;
}

/* High DPI displays */
@media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
  .optimized-image {
    image-rendering: -webkit-optimize-contrast;
    image-rendering: crisp-edges;
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .optimized-image {
    transition: none;
  }

  .loading-spinner {
    animation: none;
  }
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .image-placeholder,
  .image-error {
    border: 2px solid #333;
  }

  .loading-spinner {
    border-color: #333;
    border-top-color: transparent;
  }
}
</style>
