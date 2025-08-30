import {
  Chart,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  LineController,
  BarController,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

export default defineNuxtPlugin(() => {
  // Chart.jsコンポーネントをグローバルに登録
  Chart.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    LineController,
    BarController,
    Title,
    Tooltip,
    Legend,
    Filler,
  );

  console.log('Chart.js プラグイン初期化完了');

  // Chart.jsをグローバルに利用可能にする
  if (import.meta.client) {
    window.Chart = Chart;
  }
});
