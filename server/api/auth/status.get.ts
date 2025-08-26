import {
  verifyToken,
  generateAccessToken,
  getSecureCookieOptions,
} from '~/lib/auth';
import { prisma } from '~/lib/prisma';

/**
 * 現在の認証状態を確認するAPI
 * HTTP-only cookieから認証情報を取得してクライアントに返す
 * アクセストークンが無効な場合はリフレッシュトークンで再生成を試行
 */
export default defineEventHandler(async (event) => {
  try {
    // アクセストークンをcookieから取得
    const accessToken = getCookie(event, 'access-token');
    let payload = null;

    // アクセストークンがある場合は検証を試行
    if (accessToken) {
      try {
        payload = await verifyToken(accessToken);
      }
      catch (error) {
        // アクセストークンの検証に失敗
        if (process.env.NODE_ENV === 'development') {
          console.log('アクセストークンの検証に失敗、リフレッシュトークンで再試行:', error);
        }
        payload = null;
      }
    }

    // アクセストークンが無効またはない場合、リフレッシュトークンで再試行
    if (!payload) {
      const refreshToken = getCookie(event, 'refresh-token');

      if (!refreshToken) {
        // リフレッシュトークンもない場合は未認証
        return {
          isAuthenticated: false,
          user: null,
        };
      }

      try {
        // リフレッシュトークンを検証
        const refreshPayload = await verifyToken(refreshToken);

        if (!refreshPayload) {
          // リフレッシュトークンも無効な場合は未認証
          return {
            isAuthenticated: false,
            user: null,
          };
        }

        // ユーザーが存在するか確認
        const user = await prisma.user.findUnique({
          where: { id: refreshPayload.userId },
          select: {
            id: true,
            email: true,
            name: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        if (!user) {
          // ユーザーが見つからない場合は未認証
          return {
            isAuthenticated: false,
            user: null,
          };
        }

        // 新しいアクセストークンを生成
        const newAccessToken = await generateAccessToken({
          userId: user.id,
          email: user.email,
        });

        // 新しいアクセストークンをcookieに設定
        setCookie(event, 'access-token', newAccessToken, getSecureCookieOptions());

        // 認証済み（リフレッシュ成功）
        return {
          isAuthenticated: true,
          user,
          refreshed: true, // リフレッシュが実行されたことを示すフラグ
        };
      }
      catch (refreshError) {
        // リフレッシュトークンの検証にも失敗した場合は未認証
        if (process.env.NODE_ENV === 'development') {
          console.error('リフレッシュトークンの検証に失敗:', refreshError);
        }
        return {
          isAuthenticated: false,
          user: null,
        };
      }
    }

    // アクセストークンが有効な場合、ユーザー情報を取得
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      // ユーザーが見つからない場合は未認証
      return {
        isAuthenticated: false,
        user: null,
      };
    }

    // 認証済み（アクセストークンが有効）
    return {
      isAuthenticated: true,
      user,
      refreshed: false, // リフレッシュは実行されていない
    };
  }
  catch (error) {
    // 予期しないエラーが発生した場合は未認証として扱う
    if (process.env.NODE_ENV === 'development') {
      console.error('Auth status check error:', error);
    }
    return {
      isAuthenticated: false,
      user: null,
    };
  }
});
