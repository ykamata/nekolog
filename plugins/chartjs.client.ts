export default defineNuxtPlugin(async () => {
  // Client-side only: Dynamically import and register Chart.js components
  if (!import.meta.client) {
    return;
  }

  try {
    // Dynamic import to prevent server-side bundling
    const {
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
    } = await import('chart.js');

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

    // Make Chart.js globally available for debugging
    if (typeof window !== 'undefined') {
      window.Chart = Chart;
    }

    console.log('Chart.js プラグインが登録されました');
  } catch (error) {
    console.error('Chart.js プラグインの読み込みに失敗しました:', error);
  }
});
