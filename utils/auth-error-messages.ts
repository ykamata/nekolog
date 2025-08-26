/**
 * 認証エラーメッセージの管理ユーティリティ
 * ユーザーフレンドリーな日本語エラーメッセージと復旧方法を提供
 */

export interface AuthErrorInfo {
  type: 'network' | 'authentication' | 'server' | 'validation' | 'timeout' | 'general';
  title: string;
  message: string;
  userMessage: string;
  suggestions: string[];
  canRetry: boolean;
  shouldClearTokens: boolean;
  icon: string;
}

/**
 * エラーメッセージのマッピング
 */
const ERROR_MESSAGES: Record<string, Partial<AuthErrorInfo>> = {
  // ネットワークエラー
  network_error: {
    type: 'network',
    title: 'ネットワーク接続エラー',
    userMessage: 'インターネット接続に問題があります。接続を確認してから再試行してください。',
    suggestions: [
      'Wi-Fiまたはモバイルデータ接続を確認してください',
      'ネットワーク設定を確認してください',
      'しばらく待ってから再試行してください',
    ],
    canRetry: true,
    shouldClearTokens: false,
    icon: '🌐',
  },

  connection_timeout: {
    type: 'timeout',
    title: '接続タイムアウト',
    userMessage: 'サーバーへの接続に時間がかかりすぎています。しばらく待ってから再試行してください。',
    suggestions: [
      'ネットワーク接続の安定性を確認してください',
      '数分待ってから再試行してください',
      'ページを再読み込みしてください',
    ],
    canRetry: true,
    shouldClearTokens: false,
    icon: '⏱️',
  },

  // 認証エラー
  invalid_credentials: {
    type: 'authentication',
    title: 'ログイン情報が正しくありません',
    userMessage: 'メールアドレスまたはパスワードが正しくありません。入力内容を確認してください。',
    suggestions: [
      'メールアドレスとパスワードを再度確認してください',
      'パスワードの大文字・小文字を確認してください',
      'パスワードを忘れた場合は、パスワードリセットをご利用ください',
    ],
    canRetry: true,
    shouldClearTokens: true,
    icon: '🔐',
  },

  token_expired: {
    type: 'authentication',
    title: 'セッションが期限切れです',
    userMessage: 'ログインセッションの有効期限が切れました。再度ログインしてください。',
    suggestions: [
      '再度ログインしてください',
      'ログイン状態を維持したい場合は、「ログイン状態を保持する」にチェックを入れてください',
    ],
    canRetry: false,
    shouldClearTokens: true,
    icon: '⏰',
  },

  invalid_token: {
    type: 'authentication',
    title: '認証情報が無効です',
    userMessage: '認証情報に問題があります。再度ログインしてください。',
    suggestions: [
      '再度ログインしてください',
      'ブラウザのキャッシュをクリアしてください',
      '問題が続く場合は、別のブラウザでお試しください',
    ],
    canRetry: false,
    shouldClearTokens: true,
    icon: '🚫',
  },

  account_locked: {
    type: 'authentication',
    title: 'アカウントがロックされています',
    userMessage: 'セキュリティのため、アカウントが一時的にロックされています。',
    suggestions: [
      'しばらく時間をおいてから再試行してください',
      '問題が続く場合は管理者にお問い合わせください',
    ],
    canRetry: false,
    shouldClearTokens: true,
    icon: '🔒',
  },

  // サーバーエラー
  server_error: {
    type: 'server',
    title: 'サーバーエラー',
    userMessage: 'サーバーで一時的な問題が発生しています。しばらく待ってから再試行してください。',
    suggestions: [
      'しばらく待ってから再試行してください',
      'ページを再読み込みしてください',
      '問題が続く場合は管理者にお問い合わせください',
    ],
    canRetry: true,
    shouldClearTokens: false,
    icon: '🔧',
  },

  service_unavailable: {
    type: 'server',
    title: 'サービス利用不可',
    userMessage: 'サービスが一時的に利用できません。メンテナンス中の可能性があります。',
    suggestions: [
      'しばらく待ってから再試行してください',
      'メンテナンス情報を確認してください',
      '緊急の場合は管理者にお問い合わせください',
    ],
    canRetry: true,
    shouldClearTokens: false,
    icon: '🚧',
  },

  // バリデーションエラー
  validation_error: {
    type: 'validation',
    title: '入力内容に問題があります',
    userMessage: '入力された情報に問題があります。内容を確認して再度お試しください。',
    suggestions: [
      '入力内容を確認してください',
      '必須項目がすべて入力されているか確認してください',
      '文字数制限や形式を確認してください',
    ],
    canRetry: true,
    shouldClearTokens: false,
    icon: '📝',
  },

  email_already_exists: {
    type: 'validation',
    title: 'メールアドレスが既に使用されています',
    userMessage: 'このメールアドレスは既に登録されています。別のメールアドレスをお試しください。',
    suggestions: [
      '別のメールアドレスを使用してください',
      '既にアカウントをお持ちの場合は、ログインしてください',
      'パスワードを忘れた場合は、パスワードリセットをご利用ください',
    ],
    canRetry: true,
    shouldClearTokens: false,
    icon: '📧',
  },

  // 一般的なエラー
  unknown_error: {
    type: 'general',
    title: '予期しないエラー',
    userMessage: '予期しないエラーが発生しました。しばらく待ってから再試行してください。',
    suggestions: [
      'ページを再読み込みしてください',
      'ブラウザのキャッシュをクリアしてください',
      '問題が続く場合は管理者にお問い合わせください',
    ],
    canRetry: true,
    shouldClearTokens: false,
    icon: '⚠️',
  },
};

/**
 * エラーメッセージからエラー情報を取得
 */
export function getAuthErrorInfo(error: unknown): AuthErrorInfo {
  let errorKey = 'unknown_error';
  let originalMessage = '';

  if (error instanceof Error) {
    originalMessage = error.message;

    // エラーメッセージからエラータイプを判定
    const message = error.message.toLowerCase();

    if (message.includes('network') || message.includes('ネットワーク')) {
      errorKey = 'network_error';
    }
    else if (message.includes('timeout') || message.includes('タイムアウト')) {
      errorKey = 'connection_timeout';
    }
    else if (message.includes('invalid credentials') || message.includes('認証情報') || message.includes('パスワード')) {
      errorKey = 'invalid_credentials';
    }
    else if (message.includes('token expired') || message.includes('期限切れ')) {
      errorKey = 'token_expired';
    }
    else if (message.includes('invalid token') || message.includes('無効')) {
      errorKey = 'invalid_token';
    }
    else if (message.includes('locked') || message.includes('ロック')) {
      errorKey = 'account_locked';
    }
    else if (message.includes('server error') || message.includes('サーバー')) {
      errorKey = 'server_error';
    }
    else if (message.includes('service unavailable') || message.includes('利用不可')) {
      errorKey = 'service_unavailable';
    }
    else if (message.includes('validation') || message.includes('バリデーション')) {
      errorKey = 'validation_error';
    }
    else if (message.includes('email already exists') || message.includes('既に使用')) {
      errorKey = 'email_already_exists';
    }
  }
  else if (typeof error === 'string') {
    originalMessage = error;

    // 文字列エラーからもタイプを判定
    const message = error.toLowerCase();
    if (message.includes('network') || message.includes('ネットワーク')) {
      errorKey = 'network_error';
    }
    else if (message.includes('timeout') || message.includes('タイムアウト')) {
      errorKey = 'connection_timeout';
    }
  }

  // エラー情報を取得
  const errorInfo = ERROR_MESSAGES[errorKey] || ERROR_MESSAGES.unknown_error;

  return {
    type: (errorInfo?.type || 'general') as AuthErrorInfo['type'],
    title: errorInfo?.title || '予期しないエラー',
    message: originalMessage,
    userMessage: errorInfo?.userMessage || '予期しないエラーが発生しました。',
    suggestions: errorInfo?.suggestions || ['ページを再読み込みしてください'],
    canRetry: errorInfo?.canRetry ?? true,
    shouldClearTokens: errorInfo?.shouldClearTokens ?? false,
    icon: errorInfo?.icon || '⚠️',
  };
}

/**
 * HTTPステータスコードからエラー情報を取得
 */
export function getAuthErrorInfoFromStatus(status: number, message?: string): AuthErrorInfo {
  let errorKey = 'unknown_error';

  switch (status) {
    case 400:
      errorKey = 'validation_error';
      break;
    case 401:
      errorKey = 'invalid_credentials';
      break;
    case 403:
      errorKey = 'account_locked';
      break;
    case 408:
      errorKey = 'connection_timeout';
      break;
    case 409:
      errorKey = 'email_already_exists';
      break;
    case 500:
    case 502:
    case 503:
      errorKey = 'server_error';
      break;
    case 504:
      errorKey = 'connection_timeout';
      break;
    default:
      if (status >= 500) {
        errorKey = 'server_error';
      }
      else if (status >= 400) {
        errorKey = 'validation_error';
      }
  }

  const errorInfo = ERROR_MESSAGES[errorKey] || ERROR_MESSAGES.unknown_error;

  return {
    type: (errorInfo?.type || 'general') as AuthErrorInfo['type'],
    title: errorInfo?.title || '予期しないエラー',
    message: message || `HTTP ${status}`,
    userMessage: errorInfo?.userMessage || '予期しないエラーが発生しました。',
    suggestions: errorInfo?.suggestions || ['ページを再読み込みしてください'],
    canRetry: errorInfo?.canRetry ?? true,
    shouldClearTokens: errorInfo?.shouldClearTokens ?? false,
    icon: errorInfo?.icon || '⚠️',
  };
}

/**
 * 復旧アクションの種類
 */
export interface RecoveryAction {
  type: 'retry' | 'reload' | 'login' | 'clear_cache' | 'contact_support';
  label: string;
  description: string;
  icon: string;
  primary?: boolean;
}

/**
 * エラータイプに応じた復旧アクションを取得
 */
export function getRecoveryActions(errorInfo: AuthErrorInfo): RecoveryAction[] {
  const actions: RecoveryAction[] = [];

  // 再試行可能な場合
  if (errorInfo.canRetry) {
    actions.push({
      type: 'retry',
      label: '再試行',
      description: 'もう一度試してみる',
      icon: '🔄',
      primary: true,
    });
  }

  // ネットワークエラーの場合
  if (errorInfo.type === 'network' || errorInfo.type === 'timeout') {
    actions.push({
      type: 'reload',
      label: 'ページを再読み込み',
      description: 'ページを再読み込みして再試行',
      icon: '↻',
    });
  }

  // 認証エラーの場合
  if (errorInfo.type === 'authentication') {
    actions.push({
      type: 'login',
      label: 'ログインページへ',
      description: '再度ログインする',
      icon: '🔑',
      primary: !errorInfo.canRetry,
    });
  }

  // サーバーエラーの場合
  if (errorInfo.type === 'server') {
    actions.push({
      type: 'reload',
      label: 'ページを再読み込み',
      description: 'ページを再読み込みして再試行',
      icon: '↻',
    });
  }

  // 一般的なアクション
  actions.push({
    type: 'clear_cache',
    label: 'キャッシュをクリア',
    description: 'ブラウザのキャッシュをクリアする',
    icon: '🗑️',
  });

  // サポートへの連絡
  actions.push({
    type: 'contact_support',
    label: 'サポートに連絡',
    description: '問題が解決しない場合',
    icon: '📞',
  });

  return actions;
}

/**
 * エラーメッセージをユーザーフレンドリーな形式に変換
 */
export function formatAuthError(error: unknown): string {
  const errorInfo = getAuthErrorInfo(error);
  return errorInfo.userMessage;
}

/**
 * エラーの重要度を取得
 */
export function getErrorSeverity(errorInfo: AuthErrorInfo): 'low' | 'medium' | 'high' | 'critical' {
  switch (errorInfo.type) {
    case 'network':
    case 'timeout':
      return 'medium';
    case 'authentication':
      return 'high';
    case 'server':
      return 'high';
    case 'validation':
      return 'low';
    default:
      return 'medium';
  }
}
