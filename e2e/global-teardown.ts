import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export default async function globalTeardown() {
  console.log('🧹 Starting E2E test environment cleanup...');

  try {
    // Stop infrastructure services
    console.log('🛑 Stopping infrastructure services...');
    await execAsync('npm run infra:down', { cwd: '..' });

    console.log('✅ E2E test environment cleanup completed!');
  } catch (error) {
    console.error('❌ Failed to cleanup E2E test environment:', error);
    // Don't throw error in teardown to avoid masking test failures
  }
}
