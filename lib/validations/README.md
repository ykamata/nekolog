# 通院履歴管理機能 バリデーションスキーマ

## 概要

通院履歴管理機能のためのZodバリデーションスキーマを提供します。フロントエンド・バックエンド共通で使用できる包括的なバリデーション機能を実装しています。

## 実装済みスキーマ

### 基本エンティティスキーマ

#### 通院記録 (VeterinaryVisit)

- `VeterinaryVisitSchema`: 完全な通院記録データ
- `VeterinaryVisitInputSchema`: 新規作成用入力データ
- `VeterinaryVisitUpdateSchema`: 更新用データ（部分更新対応）
- `VeterinaryVisitFormSchema`: フォーム用データ

#### 予約管理 (VeterinaryAppointment)

- `VeterinaryAppointmentSchema`: 完全な予約データ
- `VeterinaryAppointmentInputSchema`: 新規作成用入力データ（未来日時バリデーション付き）
- `VeterinaryAppointmentUpdateSchema`: 更新用データ
- `VeterinaryAppointmentFormSchema`: フォーム用データ

#### マスタデータスキーマ

##### 病院マスタ (VeterinaryHospital)

- `VeterinaryHospitalSchema`: 完全な病院データ
- `VeterinaryHospitalInputSchema`: 新規作成用入力データ
- `VeterinaryHospitalUpdateSchema`: 更新用データ

##### 先生マスタ (VeterinaryDoctor)

- `VeterinaryDoctorSchema`: 完全な先生データ
- `VeterinaryDoctorInputSchema`: 新規作成用入力データ
- `VeterinaryDoctorUpdateSchema`: 更新用データ

##### 処方内容マスタ (VeterinaryTreatment)

- `VeterinaryTreatmentSchema`: 完全な処方内容データ
- `VeterinaryTreatmentInputSchema`: 新規作成用入力データ
- `VeterinaryTreatmentUpdateSchema`: 更新用データ

### 特殊機能スキーマ

#### 予約変換

- `ConvertAppointmentToVisitSchema`: 予約を通院記録に変換するためのデータ

#### フィルタリング

- `VeterinaryVisitFilterSchema`: 通院記録検索・フィルタリング
- `VeterinaryAppointmentFilterSchema`: 予約検索・フィルタリング
- `VeterinaryHospitalFilterSchema`: 病院マスタ検索
- `VeterinaryDoctorFilterSchema`: 先生マスタ検索
- `VeterinaryTreatmentFilterSchema`: 処方内容マスタ検索

#### ユーティリティ

- `DateRangeSchema`: 日付範囲バリデーション
- `VeterinaryVisitIdSchema`: ID形式バリデーション
- `VeterinaryAppointmentIdSchema`: ID形式バリデーション

## バリデーション機能

### 基本バリデーション

- 必須項目チェック
- 文字数制限
- 数値範囲チェック
- 日付形式チェック
- 電話番号形式チェック

### 特殊バリデーション

- 予約日時の未来日チェック
- 日付範囲の論理チェック（開始日 ≤ 終了日）
- 配列要素数制限
- 空文字列の適切な処理

### エラーメッセージ

- 日本語でのわかりやすいエラーメッセージ
- フィールド固有のエラーメッセージ
- ユーザーフレンドリーな表現

## ユーティリティ関数

```typescript
// 各エンティティの入力データバリデーション
validateVeterinaryVisitInput(data)
validateVeterinaryAppointmentInput(data)
validateVeterinaryHospitalInput(data)
validateVeterinaryDoctorInput(data)
validateVeterinaryTreatmentInput(data)
validateConvertAppointmentToVisit(data)
```

## 型エクスポート

すべてのスキーマに対応するTypeScript型を提供：

- Input型（新規作成用）
- Update型（更新用）
- Filter型（検索・フィルタリング用）
- Form型（フォーム用）

## 要件対応状況

### 要件1.1-1.5: 通院記録の基本情報管理 ✅

- 診察日時の必須バリデーション
- 病院名の入力バリデーション
- 先生名の入力バリデーション
- 処方内容の複数選択バリデーション
- 支払い金額の数値バリデーション
- メモ欄の文字数制限
- 血液検査フラグの管理

### 要件7.1: 予約管理機能 ✅

- 予約日時の未来日バリデーション
- 通院記録と同様の項目バリデーション
- 予約ステータス管理
- 予約から通院記録への変換バリデーション

## テスト

`tests/validations/veterinary-visit-schemas.test.ts` で包括的なテストを実装：

- 正常系テスト（30テスト）
- 異常系テスト
- エッジケーステスト
- ユーティリティ関数テスト

すべてのテストが通過し、バリデーション機能の信頼性を確保しています。
