export default defineNuxtPlugin(async () => {
  // Client-side only: Dynamically import and register Chart.js components
  if (!import.meta.client) {
    return;
  }

  try {
    // 既にグローバルに登録されている場合はスキップ
    if (typeof window !== 'undefined' && (window as any).Chart) {
      console.log('Chart.js は既にグローバルに登録されています');
      return;
    }

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

    // プラグインを登録
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

    // Make Chart.js globally available
    if (typeof window !== 'undefined') {
      (window as any).Chart = Chart;
    }

    console.log('Chart.js プラグインが登録されました');
  } catch (error) {
    console.error('Chart.js プラグインの読み込みに失敗しました:', error);
    throw error;
  }
});
