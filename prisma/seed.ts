import {
  PrismaClient,
  FoodType,
  MedicationType,
  MedicationStatus,
  ReminderStatus,
  AppointmentStatus,
  ExcretionType,
} from '@prisma/client';
import { hashPassword } from '../lib/auth';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding...');

  // Create test user
  const hashedPassword = await hashPassword('password123');
  const testUser = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      id: 1,
      email: 'test@example.com',
      name: 'テストユーザー',
      password: hashedPassword,
    },
  });

  console.log('Created test user:', testUser.email);

  // Create sample cats
  const cat1 = await prisma.cat.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      name: 'みけ',
      birthdate: new Date('2020-03-15'),
      weight: 4.2,
    },
  });

  const cat2 = await prisma.cat.upsert({
    where: { id: 2 },
    update: {},
    create: {
      id: 2,
      name: 'しろ',
      birthdate: new Date('2021-07-22'),
      weight: 3.8,
    },
  });

  // Create sample foods
  const dryFood = await prisma.food.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      name: 'ロイヤルカナン アダルト',
      type: FoodType.DRY,
      brand: 'ロイヤルカナン',
      caloriesPerGram: 4.0,
      pricePerUnit: 2800,
      unit: 'g',
    },
  });

  const wetFood = await prisma.food.upsert({
    where: { id: 2 },
    update: {},
    create: {
      id: 2,
      name: 'チャオ ちゅーる まぐろ',
      type: FoodType.WET,
      brand: 'チャオ',
      caloriesPerGram: 0.7,
      pricePerUnit: 120,
      unit: 'g',
    },
  });

  // Create additional foods for variety
  const wetFood2 = await prisma.food.upsert({
    where: { id: 3 },
    update: {},
    create: {
      id: 3,
      name: 'モンプチ パウチ まぐろ',
      type: FoodType.WET,
      brand: 'モンプチ',
      caloriesPerGram: 0.8,
      pricePerUnit: 80,
      unit: 'g',
    },
  });

  const dryFood2 = await prisma.food.upsert({
    where: { id: 4 },
    update: {},
    create: {
      id: 4,
      name: 'ヒルズ サイエンスダイエット',
      type: FoodType.DRY,
      brand: 'ヒルズ',
      caloriesPerGram: 3.8,
      pricePerUnit: 3200,
      unit: 'g',
    },
  });

  // Create veterinary hospitals
  const hospital1 = await prisma.veterinaryHospital.upsert({
    where: { name: 'みどり動物病院' },
    update: {},
    create: {
      id: 1,
      name: 'みどり動物病院',
      address: '東京都渋谷区1-2-3',
      phone: '03-1234-5678',
      memo: '親切で丁寧な診察をしてくれる',
      userId: testUser.id,
    },
  });

  const hospital2 = await prisma.veterinaryHospital.upsert({
    where: { name: 'ペットクリニック田中' },
    update: {},
    create: {
      id: 2,
      name: 'ペットクリニック田中',
      address: '東京都新宿区4-5-6',
      phone: '03-9876-5432',
      memo: '夜間診療も対応',
      userId: testUser.id,
    },
  });

  // Create veterinary doctors
  const doctor1 = await prisma.veterinaryDoctor.upsert({
    where: { name: '田中 太郎' },
    update: {},
    create: {
      id: 1,
      name: '田中 太郎',
      hospitalId: hospital1.id,
      specialty: '内科・外科',
      memo: '猫の専門医',
      userId: testUser.id,
    },
  });

  const doctor2 = await prisma.veterinaryDoctor.upsert({
    where: { name: '佐藤 花子' },
    update: {},
    create: {
      id: 2,
      name: '佐藤 花子',
      hospitalId: hospital1.id,
      specialty: '皮膚科',
      memo: 'アレルギー治療が得意',
      userId: testUser.id,
    },
  });

  const doctor3 = await prisma.veterinaryDoctor.upsert({
    where: { name: '山田 次郎' },
    update: {},
    create: {
      id: 3,
      name: '山田 次郎',
      hospitalId: hospital2.id,
      specialty: '歯科・口腔外科',
      memo: '歯石除去の専門医',
      userId: testUser.id,
    },
  });

  // Create veterinary treatments
  const treatment1 = await prisma.veterinaryTreatment.upsert({
    where: { name: '健康診断' },
    update: {},
    create: {
      id: 1,
      name: '健康診断',
      category: '予防医療',
      description: '年1回の定期健康診断',
    },
  });

  const treatment2 = await prisma.veterinaryTreatment.upsert({
    where: { name: 'ワクチン接種' },
    update: {},
    create: {
      id: 2,
      name: 'ワクチン接種',
      category: '予防医療',
      description: '3種混合ワクチン',
    },
  });

  const treatment3 = await prisma.veterinaryTreatment.upsert({
    where: { name: '血液検査' },
    update: {},
    create: {
      id: 3,
      name: '血液検査',
      category: '検査',
      description: '一般的な血液検査',
    },
  });

  const treatment4 = await prisma.veterinaryTreatment.upsert({
    where: { name: '歯石除去' },
    update: {},
    create: {
      id: 4,
      name: '歯石除去',
      category: '治療',
      description: '全身麻酔下での歯石除去',
    },
  });

  // Create medications
  const medication1 = await prisma.medication.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      name: 'プレドニゾロン',
      type: MedicationType.MEDICINE,
      description: 'ステロイド系抗炎症薬',
      dosage: '1日1回 5mg',
    },
  });

  const medication2 = await prisma.medication.upsert({
    where: { id: 2 },
    update: {},
    create: {
      id: 2,
      name: 'ビタミンB複合体',
      type: MedicationType.SUPPLEMENT,
      description: 'ビタミンB群のサプリメント',
      dosage: '1日1回 1錠',
    },
  });

  const medication3 = await prisma.medication.upsert({
    where: { id: 3 },
    update: {},
    create: {
      id: 3,
      name: 'オメガ3脂肪酸',
      type: MedicationType.SUPPLEMENT,
      description: '関節と皮膚の健康維持',
      dosage: '1日1回 1カプセル',
    },
  });

  const medication4 = await prisma.medication.upsert({
    where: { id: 4 },
    update: {},
    create: {
      id: 4,
      name: 'アンチノール',
      type: MedicationType.SUPPLEMENT,
      description: '関節サポートサプリメント',
      dosage: '1日2回 朝夕',
    },
  });

  // Create 100+ meal records over the past 30 days
  const mealRecords: any[] = [];
  const foods = [dryFood, wetFood, wetFood2, dryFood2];
  const cats = [cat1, cat2];
  const mealTypes = ['朝食', '昼食', '夕食', 'おやつ'];

  // 過去30日間のデータを生成
  let mealRecordId = 1;
  for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() - dayOffset);

    // 各猫に対して1日2-4回の食事を生成
    for (const cat of cats) {
      const mealsPerDay = Math.floor(Math.random() * 3) + 2; // 2-4回

      for (let mealIndex = 0; mealIndex < mealsPerDay; mealIndex++) {
        const mealTime = new Date(baseDate);

        // 食事時間を設定（朝7時〜夜9時の間でランダム）
        const hour = 7 + Math.floor(Math.random() * 14); // 7-20時
        const minute = Math.floor(Math.random() * 60);
        mealTime.setHours(hour, minute, 0, 0);

        // ランダムにフードを選択
        const selectedFood = foods[Math.floor(Math.random() * foods.length)];

        // 食事量を設定（ドライフードは20-50g、ウェットフードは10-30g）
        let quantity: number;
        if (selectedFood.type === FoodType.DRY) {
          quantity = 20 + Math.random() * 30; // 20-50g
        }
        else {
          quantity = 10 + Math.random() * 20; // 10-30g
        }

        const calories = quantity * selectedFood.caloriesPerGram;
        const mealType = mealTypes[mealIndex % mealTypes.length];

        mealRecords.push({
          id: mealRecordId++,
          catId: cat.id,
          foodId: selectedFood.id,
          quantity: Math.round(quantity * 10) / 10, // 小数点1桁に丸める
          calories: Math.round(calories * 10) / 10,
          mealTime,
          notes: `${mealType}${Math.random() > 0.7 ? ' - よく食べた' : ''}`,
        });
      }
    }
  }

  // バッチでMealRecordを作成
  console.log(`Creating ${mealRecords.length} meal records...`);

  for (const record of mealRecords) {
    await prisma.mealRecord.upsert({
      where: { id: record.id },
      update: {},
      create: record,
    });
  }

  console.log(`Created ${mealRecords.length} meal records for analytics testing.`);

  // Create veterinary visits (past visits)
  const veterinaryVisits = [];
  const medications = [medication1, medication2, medication3, medication4];
  const treatments = [treatment1, treatment2, treatment3, treatment4];
  const hospitals = [hospital1, hospital2];
  const doctors = [doctor1, doctor2, doctor3];

  // 過去6ヶ月の通院記録を生成
  let veterinaryVisitId = 1;
  for (let monthOffset = 0; monthOffset < 6; monthOffset++) {
    for (const cat of cats) {
      // 月に1-2回の通院
      const visitsPerMonth = Math.floor(Math.random() * 2) + 1;

      for (let visitIndex = 0; visitIndex < visitsPerMonth; visitIndex++) {
        const visitDate = new Date();
        visitDate.setMonth(visitDate.getMonth() - monthOffset);
        visitDate.setDate(Math.floor(Math.random() * 28) + 1);
        visitDate.setHours(Math.floor(Math.random() * 8) + 9, Math.floor(Math.random() * 60), 0, 0); // 9-17時

        const selectedHospital = hospitals[Math.floor(Math.random() * hospitals.length)];
        const availableDoctors = doctors.filter(d => d.hospitalId === selectedHospital.id);
        const selectedDoctor = availableDoctors[Math.floor(Math.random() * availableDoctors.length)];

        const cost = Math.floor(Math.random() * 15000) + 3000; // 3000-18000円
        const hasBloodTest = Math.random() > 0.7;

        const visitNotes = [
          '定期健康診断。特に問題なし。',
          'ワクチン接種を実施。',
          '軽い皮膚炎の治療。薬を処方。',
          '歯石除去を実施。全身麻酔下で処置。',
          '血液検査の結果、軽度の腎機能低下。経過観察。',
          '耳の掃除と爪切りを実施。',
        ];

        veterinaryVisits.push({
          id: veterinaryVisitId++,
          catId: cat.id,
          visitDate,
          hospitalId: selectedHospital.id,
          doctorId: selectedDoctor.id,
          cost,
          hasBloodTest,
          notes: visitNotes[Math.floor(Math.random() * visitNotes.length)],
        });
      }
    }
  }

  // 通院記録を作成
  console.log(`Creating ${veterinaryVisits.length} veterinary visits...`);
  for (const visit of veterinaryVisits) {
    const createdVisit = await prisma.veterinaryVisit.upsert({
      where: { id: visit.id },
      update: {},
      create: visit,
    });

    // 各通院に1-3個の治療を関連付け
    const treatmentCount = Math.floor(Math.random() * 3) + 1;
    const selectedTreatments = treatments
      .sort(() => 0.5 - Math.random())
      .slice(0, treatmentCount);

    for (const treatment of selectedTreatments) {
      await prisma.veterinaryVisitTreatment.upsert({
        where: {
          visitId_treatmentId: {
            visitId: createdVisit.id,
            treatmentId: treatment.id,
          },
        },
        update: {},
        create: {
          visitId: createdVisit.id,
          treatmentId: treatment.id,
        },
      });
    }
  }

  // Create veterinary appointments (future appointments)
  const futureAppointments = [];
  let appointmentId = 1;
  for (const cat of cats) {
    // 今後1-2ヶ月の予約を作成
    for (let i = 0; i < 2; i++) {
      const appointmentDate = new Date();
      appointmentDate.setDate(appointmentDate.getDate() + Math.floor(Math.random() * 60) + 7); // 1週間後から2ヶ月後
      appointmentDate.setHours(Math.floor(Math.random() * 8) + 9, Math.floor(Math.random() * 60), 0, 0);

      const selectedHospital = hospitals[Math.floor(Math.random() * hospitals.length)];
      const availableDoctors = doctors.filter(d => d.hospitalId === selectedHospital.id);
      const selectedDoctor = availableDoctors[Math.floor(Math.random() * availableDoctors.length)];

      futureAppointments.push({
        id: appointmentId++,
        catId: cat.id,
        appointmentDate,
        hospitalId: selectedHospital.id,
        doctorId: selectedDoctor.id,
        plannedTreatments: '定期健康診断',
        notes: '年1回の定期検診',
        status: AppointmentStatus.SCHEDULED,
      });
    }
  }

  console.log(`Creating ${futureAppointments.length} veterinary appointments...`);
  for (const appointment of futureAppointments) {
    await prisma.veterinaryAppointment.upsert({
      where: { id: appointment.id },
      update: {},
      create: appointment,
    });
  }

  // Create medication schedules and records
  const medicationSchedules = [];
  const medicationRecords = [];
  const medicationReminders = [];

  let scheduleId = 1;
  let medicationRecordId = 1;
  let reminderId = 1;

  for (const cat of cats) {
    // 各猫に2-3個の薬のスケジュールを作成
    const catMedications = medications.slice(0, Math.floor(Math.random() * 2) + 2);

    for (let medIndex = 0; medIndex < catMedications.length; medIndex++) {
      const medication = catMedications[medIndex];
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - Math.floor(Math.random() * 30)); // 過去30日以内に開始

      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + Math.floor(Math.random() * 60) + 30); // 30-90日間の治療期間

      const frequencies = ['daily', 'twice_daily', 'weekly'];
      const frequency = frequencies[Math.floor(Math.random() * frequencies.length)];

      let times: string[];
      switch (frequency) {
        case 'daily':
          times = ['08:00'];
          break;
        case 'twice_daily':
          times = ['08:00', '20:00'];
          break;
        case 'weekly':
          times = ['08:00'];
          break;
        default:
          times = ['08:00'];
      }

      const currentScheduleId = scheduleId++;
      const schedule = {
        id: currentScheduleId,
        catId: cat.id,
        medicationId: medication.id,
        frequency,
        times: JSON.stringify(times),
        startDate,
        endDate,
        isActive: true,
      };

      medicationSchedules.push(schedule);

      // 過去の投薬記録を生成
      const currentDate = new Date(startDate);
      while (currentDate <= new Date() && currentDate <= endDate) {
        for (const timeStr of times) {
          const [hour, minute] = timeStr.split(':').map(Number);
          const administeredAt = new Date(currentDate);
          administeredAt.setHours(hour, minute, 0, 0);

          if (administeredAt <= new Date()) {
            const status = Math.random() > 0.1
              ? MedicationStatus.ADMINISTERED
              : Math.random() > 0.5 ? MedicationStatus.SKIPPED : MedicationStatus.MISSED;

            medicationRecords.push({
              id: medicationRecordId++,
              catId: cat.id,
              medicationId: medication.id,
              quantity: 1,
              administeredAt,
              status,
              notes: status === MedicationStatus.ADMINISTERED
                ? '正常に投与'
                : status === MedicationStatus.SKIPPED ? '食事を食べなかったためスキップ' : '投与忘れ',
            });
          }

          // 未来のリマインダーを生成
          if (administeredAt > new Date() && administeredAt <= endDate) {
            medicationReminders.push({
              id: reminderId++,
              scheduleId: currentScheduleId,
              catId: cat.id,
              medicationId: medication.id,
              scheduledAt: administeredAt,
              status: ReminderStatus.PENDING,
            });
          }
        }

        // 次の日に進む（週1回の場合は7日後）
        if (frequency === 'weekly') {
          currentDate.setDate(currentDate.getDate() + 7);
        }
        else {
          currentDate.setDate(currentDate.getDate() + 1);
        }
      }
    }
  }

  // 薬のスケジュール、記録、リマインダーを作成
  console.log(`Creating ${medicationSchedules.length} medication schedules...`);
  for (const schedule of medicationSchedules) {
    await prisma.medicationSchedule.upsert({
      where: { id: schedule.id },
      update: {},
      create: schedule,
    });
  }

  console.log(`Creating ${medicationRecords.length} medication records...`);
  for (const record of medicationRecords) {
    await prisma.medicationRecord.upsert({
      where: { id: record.id },
      update: {},
      create: record,
    });
  }

  console.log(`Creating ${medicationReminders.length} medication reminders...`);
  for (const reminder of medicationReminders) {
    await prisma.medicationReminder.upsert({
      where: { id: reminder.id },
      update: {},
      create: reminder,
    });
  }

  // Create excretion records
  const excretionRecords = [];
  const excretionTypes = [ExcretionType.URINE, ExcretionType.FECES];
  const excretionNotes = [
    '正常',
    '少し硬め',
    '少し軟らかめ',
    '色が少し濃い',
    '量が多め',
    '量が少なめ',
    '',
  ];

  // 過去30日間の排泄記録を生成
  let excretionRecordId = 1;
  for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() - dayOffset);

    for (const cat of cats) {
      // 1日に2-5回の排泄記録
      const recordsPerDay = Math.floor(Math.random() * 4) + 2;

      for (let recordIndex = 0; recordIndex < recordsPerDay; recordIndex++) {
        const recordedAt = new Date(baseDate);
        recordedAt.setHours(
          Math.floor(Math.random() * 16) + 6, // 6-22時
          Math.floor(Math.random() * 60),
          0,
          0,
        );

        const type = excretionTypes[Math.floor(Math.random() * excretionTypes.length)];
        const notes = excretionNotes[Math.floor(Math.random() * excretionNotes.length)];

        excretionRecords.push({
          id: excretionRecordId++,
          catId: cat.id,
          type,
          recordedAt,
          notes: notes || undefined,
        });
      }
    }
  }

  console.log(`Creating ${excretionRecords.length} excretion records...`);
  for (const record of excretionRecords) {
    await prisma.excretionRecord.upsert({
      where: { id: record.id },
      update: {},
      create: record,
    });
  }

  console.log('Seeding finished.');
  console.log(`Created:
    - ${cats.length} cats
    - ${foods.length} foods
    - ${mealRecords.length} meal records
    - ${hospitals.length} veterinary hospitals
    - ${doctors.length} veterinary doctors
    - ${treatments.length} veterinary treatments
    - ${veterinaryVisits.length} veterinary visits
    - ${futureAppointments.length} veterinary appointments
    - ${medications.length} medications
    - ${medicationSchedules.length} medication schedules
    - ${medicationRecords.length} medication records
    - ${medicationReminders.length} medication reminders
    - ${excretionRecords.length} excretion records
  `);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (_error) => {
    await prisma.$disconnect();
    process.exit(1);
  });
