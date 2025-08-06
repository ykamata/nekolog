/**
 * レスポンシブデザイン用のcomposable
 * 画面サイズを検出し、適切なCSSクラスを提供する
 */
export const useResponsive = () => {
  const screenSize = ref<'mobile' | 'tablet' | 'desktop'>('desktop');

  /**
   * 画面サイズを更新する
   */
  const updateScreenSize = () => {
    if (import.meta.client) {
      const width = window.innerWidth;
      if (width < 768) {
        screenSize.value = 'mobile';
      }
      else if (width < 1024) {
        screenSize.value = 'tablet';
      }
      else {
        screenSize.value = 'desktop';
      }
    }
  };

  /**
   * レスポンシブクラスを生成する
   * @param baseClasses ベースとなるCSSクラス
   * @returns 画面サイズに応じたCSSクラス配列
   */
  const getResponsiveClasses = (baseClasses: string | string[] = []) => {
    const classes = Array.isArray(baseClasses) ? baseClasses : [baseClasses];

    return [
      ...classes,
      {
        'mobile-layout': screenSize.value === 'mobile',
        'tablet-layout': screenSize.value === 'tablet',
      },
    ];
  };

  // コンポーネントマウント時に画面サイズを設定し、リサイズイベントを監視
  onMounted(() => {
    updateScreenSize();
    if (import.meta.client) {
      window.addEventListener('resize', updateScreenSize);
    }
  });

  // コンポーネントアンマウント時にイベントリスナーを削除
  onUnmounted(() => {
    if (import.meta.client) {
      window.removeEventListener('resize', updateScreenSize);
    }
  });

  return {
    screenSize: readonly(screenSize),
    updateScreenSize,
    getResponsiveClasses,
  };
};
