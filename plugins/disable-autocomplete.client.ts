/**
 * プラグイン: ブラウザのオートコンプリートを無効化
 *
 * アプリケーション全体でブラウザのネイティブなオートコンプリート機能を無効にし、
 * アプリ独自のオートコンプリート実装のみを使用するようにします。
 */

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.directive('disable-autocomplete', {
    mounted(el: HTMLElement) {
      // input要素を探して autocomplete="off" を設定
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') {
        el.setAttribute('autocomplete', 'off');
      }

      // 子要素のinput/textarea/selectも対象にする
      const inputs = el.querySelectorAll('input, textarea, select');
      inputs.forEach((input) => {
        input.setAttribute('autocomplete', 'off');
      });
    },
  });

  // MutationObserverを使ってDOM変更時にも適用
  if (import.meta.client) {
    nuxtApp.hook('app:mounted', () => {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as HTMLElement;

              // 追加された要素がinput/textarea/selectの場合
              if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA' || element.tagName === 'SELECT') {
                // autocomplete属性が明示的に設定されていない場合のみoff
                if (!element.hasAttribute('autocomplete')) {
                  element.setAttribute('autocomplete', 'off');
                }
              }

              // 子要素のinput/textarea/selectも対象
              const inputs = element.querySelectorAll?.('input:not([autocomplete]), textarea:not([autocomplete]), select:not([autocomplete])');
              inputs?.forEach((input) => {
                input.setAttribute('autocomplete', 'off');
              });
            }
          });
        });
      });

      // body全体を監視
      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });

      // 既存のすべてのinput/textarea/selectにautocomplete="off"を設定
      const allInputs = document.querySelectorAll('input:not([autocomplete]), textarea:not([autocomplete]), select:not([autocomplete])');
      allInputs.forEach((input) => {
        input.setAttribute('autocomplete', 'off');
      });
    });
  }
});
