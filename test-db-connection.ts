import { prisma, checkDBHealth } from './lib/prisma';
import { logger } from './lib/pino-logger';

async function testConnection() {
  logger.info('Testing database connection...');

  try {
    // Test health check
    const health = await checkDBHealth();
    logger.info('Health check:', health);

    // Test basic queries
    const catCount = await prisma.cat.count();
    const foodCount = await prisma.food.count();
    const mealCount = await prisma.mealRecord.count();

    logger.info(`Database contains:`);
    logger.info(`- ${catCount} cats`);
    logger.info(`- ${foodCount} foods`);
    logger.info(`- ${mealCount} meal records`);

    // Test a complex query with relations
    const catsWithMeals = await prisma.cat.findMany({
      include: {
        meals: {
          include: {
            food: true,
          },
        },
      },
    });

    logger.info('\nCats with meals:');
    catsWithMeals.forEach((cat) => {
      logger.info(`- ${cat.name}: ${cat.meals.length} meals`);
    });

    logger.info('\n✅ Database connection test successful!');
  }
  catch (error) {
    logger.error('❌ Database connection test failed:', error);
    process.exit(1);
  }
  finally {
    await prisma.$disconnect();
  }
}

testConnection();
