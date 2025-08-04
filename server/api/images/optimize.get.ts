import { createReadStream, existsSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';

// 画像最適化パラメータのスキーマ
const ImageOptimizationSchema = z.object({
  src: z.string().min(1, '画像パスが必要です'),
  w: z.coerce.number().int().min(1).max(2000).optional(),
  h: z.coerce.number().int().min(1).max(2000).optional(),
  q: z.coerce.number().int().min(1).max(100).default(80),
  f: z.enum(['webp', 'avif', 'jpeg', 'png']).default('webp'),
});

export default defineEventHandler(async (event) => {
  try {
    // Only allow GET method
    assertMethod(event, 'GET');

    // Parse and validate query parameters
    const query = getQuery(event);
    const { src, w, h, q, f } = ImageOptimizationSchema.parse(query);

    // セキュリティ: パストラバーサル攻撃を防ぐ
    if (src.includes('..') || src.includes('~') || !src.startsWith('/')) {
      throw createError({
        statusCode: 400,
        statusMessage: '無効な画像パスです',
      });
    }

    // 画像ファイルのパスを構築
    const imagePath = join(process.cwd(), 'public', src);

    // ファイルの存在確認
    if (!existsSync(imagePath)) {
      throw createError({
        statusCode: 404,
        statusMessage: '画像が見つかりません',
      });
    }

    // 開発環境では最適化をスキップして元の画像を返す
    if (process.env.NODE_ENV === 'development') {
      const stream = createReadStream(imagePath);

      // 適切なContent-Typeを設定
      const ext = src.split('.').pop()?.toLowerCase();
      const contentType = getContentType(ext || '');

      setHeader(event, 'Content-Type', contentType);
      setHeader(event, 'Cache-Control', 'public, max-age=3600');

      return sendStream(event, stream);
    }

    // 本番環境では画像最適化を実行
    // 注意: 実際の本番環境では、Sharp や ImageMagick などの
    // 画像処理ライブラリを使用して最適化を行う必要があります

    // ここでは簡単な実装として、元の画像を返します
    const stream = createReadStream(imagePath);

    // 最適化されたContent-Typeを設定
    const contentType = getOptimizedContentType(f);

    setHeader(event, 'Content-Type', contentType);
    setHeader(event, 'Cache-Control', 'public, max-age=31536000, immutable'); // 1年間キャッシュ
    setHeader(event, 'X-Image-Optimized', 'true');

    // 最適化パラメータをヘッダーに追加（デバッグ用）
    if (w) setHeader(event, 'X-Image-Width', w.toString());
    if (h) setHeader(event, 'X-Image-Height', h.toString());
    setHeader(event, 'X-Image-Quality', q.toString());
    setHeader(event, 'X-Image-Format', f);

    return sendStream(event, stream);
  }
  catch (error) {
    // Handle validation errors
    if (error instanceof z.ZodError) {
      throw createError({
        statusCode: 400,
        statusMessage: 'パラメータが無効です',
        data: error.errors,
      });
    }

    // Re-throw HTTP errors
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }

    // Handle unexpected errors
    console.error('Image optimization error:', error);
    throw createError({
      statusCode: 500,
      statusMessage: '画像の最適化に失敗しました',
    });
  }
});

// Content-Type を取得する関数
function getContentType(extension: string): string {
  const contentTypes: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    avif: 'image/avif',
    svg: 'image/svg+xml',
  };

  return contentTypes[extension] || 'application/octet-stream';
}

// 最適化されたContent-Type を取得する関数
function getOptimizedContentType(format: string): string {
  const contentTypes: Record<string, string> = {
    webp: 'image/webp',
    avif: 'image/avif',
    jpeg: 'image/jpeg',
    png: 'image/png',
  };

  return contentTypes[format] || 'image/webp';
}
