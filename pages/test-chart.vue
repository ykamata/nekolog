<template>
  <div class="test-chart-page">
    <h1>Chart.js テストページ</h1>

    <div class="debug-section">
      <h2>デバッグ情報</h2>
      <div>
        <p>isClient: {{ isClient }}</p>
        <p>Chart.js loaded: {{ chartJsLoaded }}</p>
        <p>Canvas element: {{ !!canvasRef }}</p>
        <p>Chart instance: {{ !!chart }}</p>
        <p>Error: {{ error }}</p>
      </div>
    </div>

    <div class="chart-section">
      <h2>テストチャート</h2>
      <canvas
        ref="canvasRef"
        width="400"
        height="200"
        style="border: 1px solid #ccc;"
      />
      <button @click="createTestChart">
        チャート作成
      </button>
      <button @click="destroyChart">
        チャート破棄
      </button>
    </div>

    <div class="api-test-section">
      <h2>API テスト</h2>
      <button @click="testCatsApi">
        猫データ取得テスト
      </button>
      <div v-if="catsData">
        <h3>猫データ:</h3>
        <pre>{{ JSON.stringify(catsData, null, 2) }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  Chart,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  LineController,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Chart.js registration
Chart.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  LineController,
  Title,
  Tooltip,
  Legend,
);

// Page meta
definePageMeta({
  ssr: false,
});

// Reactive state
const canvasRef = ref<HTMLCanvasElement>();
const chart = ref<Chart>();
const error = ref<string | null>(null);
const catsData = ref<any>(null);

// Computed
const isClient = computed(() => import.meta.client);
const chartJsLoaded = computed(() => typeof Chart !== 'undefined');

// Methods
const createTestChart = () => {
  if (!canvasRef.value) {
    error.value = 'Canvas element not found';
    return;
  }

  if (chart.value) {
    chart.value.destroy();
  }

  try {
    console.log('Creating test chart...');

    chart.value = new Chart(canvasRef.value, {
      type: 'line',
      data: {
        labels: ['1月', '2月', '3月', '4月', '5月'],
        datasets: [{
          label: 'テストデータ',
          data: [10, 20, 15, 25, 30],
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          tension: 0.1,
        }],
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Chart.js テストチャート',
          },
        },
        scales: {
          y: {
            beginAtZero: true,
          },
        },
      },
    });

    error.value = null;
    console.log('Test chart created successfully');
  }
  catch (err) {
    console.error('Chart creation failed:', err);
    error.value = err instanceof Error ? err.message : 'Chart creation failed';
  }
};

const destroyChart = () => {
  if (chart.value) {
    chart.value.destroy();
    chart.value = undefined;
    console.log('Chart destroyed');
  }
};

const testCatsApi = async () => {
  try {
    console.log('Testing cats API...');
    const response = await $fetch('/api/cats');
    catsData.value = response;
    console.log('Cats API response:', response);
  }
  catch (err) {
    console.error('Cats API failed:', err);
    error.value = err instanceof Error ? err.message : 'API call failed';
  }
};

// Lifecycle
onMounted(() => {
  console.log('Test chart page mounted');
  console.log('Chart.js available:', typeof Chart !== 'undefined');
  console.log('Canvas ref:', canvasRef.value);
});

onUnmounted(() => {
  destroyChart();
});
</script>

<style scoped>
.test-chart-page {
  padding: 2rem;
  max-width: 800px;
  margin: 0 auto;
}

.debug-section,
.chart-section,
.api-test-section {
  margin-bottom: 2rem;
  padding: 1rem;
  border: 1px solid #ddd;
  border-radius: 8px;
}

h1, h2, h3 {
  margin-bottom: 1rem;
}

button {
  margin: 0.5rem;
  padding: 0.5rem 1rem;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:hover {
  background: #0056b3;
}

pre {
  background: #f8f9fa;
  padding: 1rem;
  border-radius: 4px;
  overflow-x: auto;
  font-size: 0.875rem;
}

canvas {
  display: block;
  margin: 1rem 0;
}
</style>
