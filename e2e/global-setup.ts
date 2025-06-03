import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export default async function globalSetup() {
  console.log('🚀 Starting E2E test environment setup...');

  try {
    // Start infrastructure services
    console.log('📦 Starting infrastructure services...');
    await execAsync('npm run infra:up', { cwd: '..' });

    // Wait for services to be ready
    console.log('⏳ Waiting for services to be ready...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Run database migrations
    console.log('🗄️ Running database migrations...');
    await execAsync('cd ../services/business-service && npx prisma migrate deploy');
    await execAsync('cd ../services/notification-service && npx prisma migrate deploy');

    console.log('✅ E2E test environment setup completed!');
  } catch (error) {
    console.error('❌ Failed to setup E2E test environment:', error);
    throw error;
  }
}
