import {
  Chart,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  LineController,
  BarElement,
  BarController,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

export default defineNuxtPlugin(() => {
  // Chart.js components registration
  Chart.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    LineController,
    BarElement,
    BarController,
    Title,
    Tooltip,
    Legend,
    Filler,
  );

  console.log('Chart.js プラグインが登録されました');
});
