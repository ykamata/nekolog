# ID型変更マイグレーションガイド

## 概要

データベースの主キー`id`をString型からInt型に変更するための包括的なガイドです。

## 完了した変更 ✅

### 1. Prismaスキーマファイル
- ✅ `prisma/schema.prisma` - SQLite用スキーマを更新
- ✅ `prisma/schema.mysql.prisma` - MySQL用スキーマを更新
- ✅ `prisma/mysql-create-statements.sql` - MySQL DDLを更新

**変更内容:**
- すべてのモデルの`id`を`String @id @default(cuid())` → `Int @id @default(autoincrement())`に変更
- すべての外部キー(`catId`, `foodId`, `medicationId`など)を`String` → `Int`に変更

## 必要な変更 ⚠️

### 2. Validationファイルの更新が必要

以下のファイルでID関連のバリデーションを更新する必要があります:

#### `/home/user/nekolog/lib/validations/cat-meal.ts`

**変更前:**
```typescript
export const CatSchema = z.object({
  id: z.string().min(1, 'IDは必須です'),
  // ...
});

export const MealRecordInputSchema = z.object({
  catId: z.string().min(1, '有効な猫IDを選択してください'),
  foodId: z.string().min(1, '有効なフードIDを選択してください'),
  // ...
});

export const MealRecordFilterSchema = z.object({
  catId: z.string().min(1).optional(),
  foodId: z.string().min(1).optional(),
  // ...
});
```

**変更後:**
```typescript
export const CatSchema = z.object({
  id: z.number().int().positive('IDは正の整数である必要があります'),
  // ...
});

export const MealRecordInputSchema = z.object({
  catId: z.coerce.number().int().positive('有効な猫IDを選択してください'),
  foodId: z.coerce.number().int().positive('有効なフードIDを選択してください'),
  // ...
});

export const MealRecordFilterSchema = z.object({
  catId: z.coerce.number().int().positive().optional(),
  foodId: z.coerce.number().int().positive().optional(),
  // ...
});
```

**ポイント:**
- フォーム入力からのIDは`z.coerce.number()`を使用して文字列からの変換を許可
- データベースから取得したオブジェクトのIDは`z.number()`を使用
- すべてのID関連フィールドに`.int().positive()`を追加

#### `/home/user/nekolog/lib/validations/medication.ts`

同様の変更が必要:
- `MedicationIdSchema`の`id`
- `MedicationRecordInputSchema`の`catId`, `medicationId`
- `MedicationScheduleInputSchema`の`catId`, `medicationId`
- `MedicationReminderInputSchema`の`scheduleId`, `catId`, `medicationId`
- フィルタスキーマのすべてのID関連フィールド

#### `/home/user/nekolog/lib/validations/veterinary-master.ts`

変更が必要な箇所:
```typescript
// 変更前
export const veterinaryHospitalUpdateSchema = veterinaryHospitalSchema.extend({
  id: z.string().min(1, 'IDは必須です'),
});

export const veterinaryDoctorSchema = z.object({
  hospitalId: z.string()
    .min(1, '病院IDは必須です')
    .optional()
    .or(z.literal('')),
});

export const veterinaryIdSchema = z.object({
  id: z.string().min(1, 'IDは必須です'),
});

// 変更後
export const veterinaryHospitalUpdateSchema = veterinaryHospitalSchema.extend({
  id: z.coerce.number().int().positive('IDは正の整数である必要があります'),
});

export const veterinaryDoctorSchema = z.object({
  hospitalId: z.coerce.number().int().positive('病院IDは必須です').optional().nullable(),
});

export const veterinaryIdSchema = z.object({
  id: z.coerce.number().int().positive('IDは正の整数である必要があります'),
});
```

#### `/home/user/nekolog/lib/validations/veterinary-visit.ts`

大量のID関連スキーマがあり、すべて更新が必要:
- `VeterinaryHospitalSchema`, `VeterinaryDoctorSchema`, `VeterinaryTreatmentSchema`の`id`
- `VeterinaryVisitSchema`, `VeterinaryAppointmentSchema`の`id`, `catId`, `hospitalId`, `doctorId`
- すべてのフィルタスキーマのID関連フィールド
- `VeterinaryVisitIdSchema`, `VeterinaryAppointmentIdSchema`

#### `/home/user/nekolog/lib/validations/excretion.ts`

```typescript
// 変更前
export const ExcretionRecordInputSchema = z.object({
  catId: z.string().min(1, '猫を選択してください'),
  // ...
});

export const ExcretionRecordFilterSchema = z.object({
  catId: z.string().optional(),
  // ...
});

// 変更後
export const ExcretionRecordInputSchema = z.object({
  catId: z.coerce.number().int().positive('猫を選択してください'),
  // ...
});

export const ExcretionRecordFilterSchema = z.object({
  catId: z.coerce.number().int().positive().optional(),
  // ...
});
```

### 3. 型定義ファイルの更新が必要

#### `/home/user/nekolog/types/cat-meal.ts`

```typescript
// 変更前
export interface Cat {
  id: string;
  // ...
}

export interface Food {
  id: string;
  // ...
}

export interface MealRecord {
  id: string;
  catId: string;
  foodId: string;
  // ...
}

export interface MealRecordFilter {
  catId?: string;
  foodId?: string;
  // ...
}

// 変更後
export interface Cat {
  id: number;
  // ...
}

export interface Food {
  id: number;
  // ...
}

export interface MealRecord {
  id: number;
  catId: number;
  foodId: number;
  // ...
}

export interface MealRecordFilter {
  catId?: number;
  foodId?: number;
  // ...
}
```

#### `/home/user/nekolog/types/medication.ts`

すべてのインターフェースのID関連フィールドを`string` → `number`に変更:
- `Medication.id`
- `MedicationRecord.id`, `catId`, `medicationId`
- `MedicationSchedule.id`, `catId`, `medicationId`
- `MedicationReminder.id`, `scheduleId`, `catId`, `medicationId`
- すべてのInputインターフェースとFilterインターフェース

#### `/home/user/nekolog/types/excretion.ts`

```typescript
// 変更前
export interface ExcretionRecord {
  id: string;
  catId: string;
  // ...
  cat?: {
    id: string;
    name: string;
  };
}

export interface ExcretionRecordInput {
  catId: string;
  // ...
}

export interface ExcretionRecordFilter {
  catId?: string;
  // ...
}

// 変更後
export interface ExcretionRecord {
  id: number;
  catId: number;
  // ...
  cat?: {
    id: number;
    name: string;
  };
}

export interface ExcretionRecordInput {
  catId: number;
  // ...
}

export interface ExcretionRecordFilter {
  catId?: number;
  // ...
}
```

#### `/home/user/nekolog/types/veterinary-master.ts`

```typescript
// 変更前
export interface VeterinaryHospital {
  id: string;
  userId: string;
  // ...
}

export interface VeterinaryDoctor {
  id: string;
  hospitalId?: string | null;
  userId: string;
  // ...
}

export interface VeterinaryHospitalUpdate extends VeterinaryHospitalInput {
  id: string;
}

// 変更後
export interface VeterinaryHospital {
  id: number;
  userId: number;
  // ...
}

export interface VeterinaryDoctor {
  id: number;
  hospitalId?: number | null;
  userId: number;
  // ...
}

export interface VeterinaryHospitalUpdate extends VeterinaryHospitalInput {
  id: number;
}
```

#### `/home/user/nekolog/types/veterinary-visit.ts`

このファイルはPrismaの型を再エクスポートしているため、Prismaクライアント生成後は自動的に更新されます。
ただし、以下のカスタムインターフェースは手動更新が必要:

```typescript
// 変更前
export interface CreateVeterinaryVisitInput {
  catId: string;
  // ...
}

export interface UpdateVeterinaryVisitInput extends Partial<CreateVeterinaryVisitInput> {
  id: string;
}

export interface CreateVeterinaryAppointmentInput {
  catId: string;
  // ...
}

export interface ConvertAppointmentToVisitInput {
  appointmentId: string;
  // ...
}

export interface CalendarVisitData {
  id: string;
  catId: string;
  // ...
}

// 変更後
export interface CreateVeterinaryVisitInput {
  catId: number;
  // ...
}

export interface UpdateVeterinaryVisitInput extends Partial<CreateVeterinaryVisitInput> {
  id: number;
}

export interface CreateVeterinaryAppointmentInput {
  catId: number;
  // ...
}

export interface ConvertAppointmentToVisitInput {
  appointmentId: number;
  // ...
}

export interface CalendarVisitData {
  id: number;
  catId: number;
  // ...
}
```

### 4. seed.tsファイルの更新が必要

`/home/user/nekolog/prisma/seed.ts`

**重要な変更:**
1. すべてのハードコードされたID（`'cat1'`, `'user1'`, `'food1'`など）を削除
2. `upsert`の`where`句でIDの代わりに一意制約フィールドを使用
3. レコード作成後、返されたオブジェクトからIDを取得して関連レコードで使用

**変更例:**

```typescript
// 変更前
const testUser = await prisma.user.upsert({
  where: { email: 'test@example.com' },
  update: {},
  create: {
    id: 'user1',  // ❌ 削除
    email: 'test@example.com',
    name: 'テストユーザー',
    password: hashedPassword,
  },
});

const cat1 = await prisma.cat.upsert({
  where: { id: 'cat1' },  // ❌ IDでのupsertは不可
  update: {},
  create: {
    id: 'cat1',  // ❌ 削除
    name: 'みけ',
    birthdate: new Date('2020-03-15'),
    weight: 4.2,
  },
});

// 変更後
const testUser = await prisma.user.upsert({
  where: { email: 'test@example.com' },  // ✅ ユニーク制約を使用
  update: {},
  create: {
    // id: 削除 - データベースが自動生成
    email: 'test@example.com',
    name: 'テストユーザー',
    password: hashedPassword,
  },
});

// ✅ upsertの代わりに、まず検索、なければ作成
let cat1 = await prisma.cat.findFirst({
  where: { name: 'みけ' }
});

if (!cat1) {
  cat1 = await prisma.cat.create({
    data: {
      // id: 削除 - データベースが自動生成
      name: 'みけ',
      birthdate: new Date('2020-03-15'),
      weight: 4.2,
    },
  });
}
```

**ループ内のレコード作成の変更:**

```typescript
// 変更前
for (const record of mealRecords) {
  await prisma.mealRecord.upsert({
    where: { id: record.id },  // ❌
    update: {},
    create: record,
  });
}

// 変更後
for (const record of mealRecords) {
  await prisma.mealRecord.create({
    data: {
      catId: record.catId,
      foodId: record.foodId,
      quantity: record.quantity,
      calories: record.calories,
      mealTime: record.mealTime,
      notes: record.notes,
      // id は含めない - データベースが自動生成
    },
  });
}
```

**外部キーの参照方法:**

```typescript
// 変更前
const hospital1 = await prisma.veterinaryHospital.upsert({
  where: { id: 'hospital1' },
  create: { id: 'hospital1', ... }
});

const doctor1 = await prisma.veterinaryDoctor.upsert({
  where: { id: 'doctor1' },
  create: {
    id: 'doctor1',
    hospitalId: hospital1.id,  // ✅ これは変更不要（IDは動的に取得される）
    ...
  }
});

// 変更後
const hospital1 = await prisma.veterinaryHospital.upsert({
  where: { name: 'みどり動物病院' },  // ユニーク制約を使用
  update: {},
  create: {
    // id: 削除
    name: 'みどり動物病院',
    address: '東京都渋谷区1-2-3',
    phone: '03-1234-5678',
    memo: '親切で丁寧な診察をしてくれる',
    userId: testUser.id,  // ✅ 動的に取得したID
  },
});

const doctor1 = await prisma.veterinaryDoctor.upsert({
  where: { name: '田中 太郎' },  // ユニーク制約を使用
  update: {},
  create: {
    // id: 削除
    name: '田中 太郎',
    hospitalId: hospital1.id,  // ✅ これは変更不要
    specialty: '内科・外科',
    memo: '猫の専門医',
    userId: testUser.id,
  },
});
```

### 5. APIルートの更新

APIルートで、以下のような箇所を更新する必要があります:

#### パラメータの変換

```typescript
// server/api/cats/[id].get.ts など

// 変更前
const { id } = event.context.params;
const cat = await prisma.cat.findUnique({
  where: { id }  // ❌ idは文字列だが、DBはnumberを期待
});

// 変更後
const { id } = event.context.params;
const catId = parseInt(id, 10);

if (isNaN(catId)) {
  throw createError({
    statusCode: 400,
    message: '無効なIDです',
  });
}

const cat = await prisma.cat.findUnique({
  where: { id: catId }
});
```

#### クエリパラメータの変換

```typescript
// 変更前
const catId = query.catId;  // 文字列
const foodId = query.foodId;  // 文字列

// 変更後
const catId = query.catId ? parseInt(query.catId as string, 10) : undefined;
const foodId = query.foodId ? parseInt(query.foodId as string, 10) : undefined;

if ((query.catId && isNaN(catId!)) || (query.foodId && isNaN(foodId!))) {
  throw createError({
    statusCode: 400,
    message: '無効なIDです',
  });
}
```

### 6. コンポーネントとComposablesの更新

#### フォームでの選択値の処理

```typescript
// 変更前
const selectedCatId = ref<string>('');

// 変更後
const selectedCatId = ref<number | null>(null);

// または、フォームの場合は文字列で保持し、送信時に変換
const selectedCatId = ref<string>('');
const submitForm = async () => {
  const catId = parseInt(selectedCatId.value, 10);
  if (isNaN(catId)) {
    // エラー処理
    return;
  }
  // APIリクエスト
};
```

#### APIレスポンスの型

```typescript
// Composablesなど

// 変更前
const getCat = async (id: string) => {
  const response = await $fetch(`/api/cats/${id}`);
  return response;
};

// 変更後
const getCat = async (id: number) => {
  const response = await $fetch(`/api/cats/${id}`);
  return response;
};
```

## マイグレーション手順

### 1. 開発環境のリセット（SQLite）

```bash
# データベースファイルを削除
rm dev.db

# Prismaクライアントを再生成
npm run db:generate

# マイグレーションを実行
npm run db:migrate

# シードデータを投入
npm run db:seed
```

### 2. 本番環境のマイグレーション（MySQL）

**警告: 本番環境では既存データが失われます！**

本番環境で既存データを保持したい場合は、以下の手順が必要です:

1. **データのバックアップ**
```bash
mysqldump -u username -p nekolog > backup_$(date +%Y%m%d).sql
```

2. **新しいカラムの追加とデータ移行**

カスタムマイグレーションスクリプトが必要です:

```sql
-- 各テーブルに新しいINT型のidカラムを追加
ALTER TABLE cats ADD COLUMN new_id INT AUTO_INCREMENT UNIQUE FIRST;

-- データを新しいIDで更新
-- （この部分は各テーブルと外部キーの関係によって異なります）

-- 古いidカラムを削除し、new_idをidにリネーム
ALTER TABLE cats DROP PRIMARY KEY;
ALTER TABLE cats DROP COLUMN id;
ALTER TABLE cats CHANGE new_id id INT AUTO_INCREMENT PRIMARY KEY;

-- すべてのテーブルと外部キーに対して同様の処理を実行
```

**推奨:** 本番環境ではデータが失われないよう、十分にテストした後に移行してください。

3. **Prismaクライアントの再生成とデプロイ**
```bash
npm run db:generate
npm run build
# デプロイ
```

## チェックリスト

### 必須タスク
- [✅] Prisma schema.prisma更新
- [✅] Prisma schema.mysql.prisma更新
- [✅] MySQL DDL更新
- [ ] lib/validations/cat-meal.ts更新
- [ ] lib/validations/medication.ts更新
- [ ] lib/validations/veterinary-master.ts更新
- [ ] lib/validations/veterinary-visit.ts更新
- [ ] lib/validations/excretion.ts更新
- [ ] types/cat-meal.ts更新
- [ ] types/medication.ts更新
- [ ] types/excretion.ts更新
- [ ] types/veterinary-master.ts更新
- [ ] types/veterinary-visit.ts更新
- [ ] prisma/seed.ts更新
- [ ] APIルート（/server/api/**/*.ts）の更新
- [ ] Composables（/composables/**/*.ts）の更新
- [ ] Components（/components/**/*.vue）の更新

### テスト
- [ ] 開発環境でデータベースをリセットしてテスト
- [ ] 各機能が正常に動作することを確認
- [ ] 既存のテストが通ることを確認
- [ ] 新しいバリデーションが機能することを確認

## よくある問題と解決方法

### 問題1: バリデーションエラー

```
Expected number, received string
```

**原因:** フォームやURLパラメータから受け取った文字列をnumberに変換していない

**解決:** `z.coerce.number()`を使用するか、手動で`parseInt()`を使用

### 問題2: Prismaクエリエラー

```
Argument `id`: Invalid value provided. Expected IntFieldRefInput | Int, provided String.
```

**原因:** 文字列のIDをPrismaクエリに渡している

**解決:** `parseInt(id, 10)`でnumberに変換

### 問題3: 外部キー制約エラー

**原因:** 存在しないIDを参照しようとしている

**解決:** シードデータで作成したレコードのIDを正しく取得して使用

## 注意事項

1. **すべての変更は相互に依存しています** - 一部だけ変更すると、型エラーやランタイムエラーが発生します
2. **テストを十分に実施してください** - 特にフォーム送信、データの取得、フィルタリング機能
3. **バックアップを取ってください** - 本番環境では必ずデータベースのバックアップを取得
4. **段階的に移行してください** - まず開発環境で完全にテストしてから本番環境に適用
