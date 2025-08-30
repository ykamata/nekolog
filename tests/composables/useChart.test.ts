import { describe, it, expect, beforeEach, vi } from 'vitest';

import { useChart } from '~/composables/useChart';

// Chart.jsのモック
vi.mock('chart.js', () => {
  const mockChart = {
    destroy: vi.fn(),
    update: vi.fn(),
    resize: vi.fn(),
  };

  const MockChart = vi.fn().mockImplementation(() => mockChart);
  MockChart.register = vi.fn();

  return {
    Chart: MockChart,
    CategoryScale: vi.fn(),
    LinearScale: vi.fn(),
    PointElement: vi.fn(),
    LineElement: vi.fn(),
    BarElement: vi.fn(),
    LineController: vi.fn(),
    BarController: vi.fn(),
    Title: vi.fn(),
    Tooltip: vi.fn(),
    Legend: vi.fn(),
    Filler: vi.fn(),
  };
});

describe('useChart', () => {
  let canvas: HTMLCanvasElement;

  beforeEach(() => {
    // HTMLCanvasElementのモック
    canvas = document.createElement('canvas');
    vi.spyOn(canvas, 'getContext').mockReturnValue({} as CanvasRenderingContext2D);
    vi.clearAllMocks();
  });

  it('チャートを初期化できる', async () => {
    const { initChart, isInitialized, error } = useChart();

    const config = {
      type: 'line' as const,
      data: {
        labels: ['1', '2', '3'],
        datasets: [{
          label: 'Test',
          data: [1, 2, 3],
        }],
      },
    };

    await initChart(canvas, config);

    expect(isInitialized.value).toBe(true);
    expect(error.value).toBe(null);
  });

  it('無効なcanvas要素でエラーが発生する', async () => {
    const { initChart, error } = useChart();

    const config = {
      type: 'line' as const,
      data: {
        labels: ['1', '2', '3'],
        datasets: [{
          label: 'Test',
          data: [1, 2, 3],
        }],
      },
    };

    await expect(initChart(null as unknown, config)).rejects.toThrow('有効なcanvas要素が必要です');
    expect(error.value).toContain('有効なcanvas要素が必要です');
  });
});
