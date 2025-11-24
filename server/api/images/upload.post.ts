import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';

// アップロード可能な画像形式
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
] as const;

// 最大ファイルサイズ (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// レスポンススキーマ
const UploadResponseSchema = z.object({
  url: z.string(),
  filename: z.string(),
  size: z.number(),
  mimeType: z.string(),
});

export default defineEventHandler(async (event) => {
  try {
    // Only allow POST method
    assertMethod(event, 'POST');

    // マルチパートフォームデータを読み取る
    const formData = await readMultipartFormData(event);

    if (!formData || formData.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'ファイルが送信されていません',
      });
    }

    // 画像ファイルを見つける
    const imageFile = formData.find(part => part.name === 'image');

    if (!imageFile) {
      throw createError({
        statusCode: 400,
        statusMessage: '画像ファイルが見つかりません',
      });
    }

    // MIMEタイプの検証
    const mimeType = imageFile.type || '';
    if (!ALLOWED_MIME_TYPES.includes(mimeType as typeof ALLOWED_MIME_TYPES[number])) {
      throw createError({
        statusCode: 400,
        statusMessage: 'サポートされていない画像形式です。JPEG、PNG、GIF、WebPのみ対応しています。',
      });
    }

    // ファイルサイズの検証
    const fileSize = imageFile.data.length;
    if (fileSize > MAX_FILE_SIZE) {
      throw createError({
        statusCode: 400,
        statusMessage: `ファイルサイズが大きすぎます。最大${MAX_FILE_SIZE / (1024 * 1024)}MBまでです。`,
      });
    }

    // ファイル名の生成（タイムスタンプ + ランダム文字列）
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 15);
    const extension = getExtensionFromMimeType(mimeType);
    const filename = `cat-${timestamp}-${randomStr}.${extension}`;

    // アップロードディレクトリの作成
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'cats');
    if (!existsSync(uploadDir)) {
      mkdirSync(uploadDir, { recursive: true });
    }

    // ファイルの保存
    const filePath = join(uploadDir, filename);
    writeFileSync(filePath, imageFile.data);

    // レスポンスの作成
    const response = {
      url: `/uploads/cats/${filename}`,
      filename,
      size: fileSize,
      mimeType,
    };

    // バリデーション
    const validatedResponse = UploadResponseSchema.parse(response);

    // eslint-disable-next-line no-console
    console.log('📸 画像アップロード成功:', {
      filename: validatedResponse.filename,
      size: `${(validatedResponse.size / 1024).toFixed(2)}KB`,
      url: validatedResponse.url,
    });

    return validatedResponse;
  }
  catch (error) {
    // Handle validation errors
    if (error instanceof z.ZodError) {
      throw createError({
        statusCode: 400,
        statusMessage: 'バリデーションエラー',
        data: error.errors,
      });
    }

    // Re-throw HTTP errors
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }

    // Handle unexpected errors
    // eslint-disable-next-line no-console
    console.error('画像アップロードエラー:', error);
    throw createError({
      statusCode: 500,
      statusMessage: '画像のアップロードに失敗しました',
    });
  }
});

// MIMEタイプから拡張子を取得
function getExtensionFromMimeType(mimeType: string): string {
  const extensions: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
  };

  return extensions[mimeType] || 'jpg';
}
