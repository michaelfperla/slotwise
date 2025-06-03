#!/usr/bin/env node

/**
 * Setup script for test databases
 * This script creates the necessary PostgreSQL test databases for all services
 */

const { execSync } = require('child_process');
const { PrismaClient } = require('@prisma/client');

const TEST_DATABASES = [
  'slotwise_business_test',
  'slotwise_notification_test',
  'slotwise_auth_test',
  'slotwise_scheduling_test',
];

async function createDatabase(dbName) {
  console.log(`Creating database: ${dbName}`);

  try {
    const adminPrisma = new PrismaClient({
      datasources: {
        db: {
          url: 'postgresql://postgres:postgres@localhost:5432/postgres',
        },
      },
    });

    // Try to create the database
    await adminPrisma.$executeRawUnsafe(`CREATE DATABASE ${dbName}`);
    console.log(`✅ Database ${dbName} created successfully`);

    await adminPrisma.$disconnect();
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log(`ℹ️  Database ${dbName} already exists`);
    } else {
      console.error(`❌ Failed to create database ${dbName}:`, error.message);
      throw error;
    }
  }
}

async function setupTestDatabases() {
  console.log('🚀 Setting up test databases...\n');

  try {
    // Check if PostgreSQL is running
    console.log('Checking PostgreSQL connection...');
    const adminPrisma = new PrismaClient({
      datasources: {
        db: {
          url: 'postgresql://postgres:postgres@localhost:5432/postgres',
        },
      },
    });

    await adminPrisma.$connect();
    await adminPrisma.$disconnect();
    console.log('✅ PostgreSQL connection successful\n');

    // Create all test databases
    for (const dbName of TEST_DATABASES) {
      await createDatabase(dbName);
    }

    console.log('\n🎉 All test databases are ready!');
    console.log('\nNext steps:');
    console.log('1. Run: npm run test');
    console.log('2. Or run specific service tests: npx nx run @slotwise/business-service:test');
  } catch (error) {
    console.error('\n❌ Failed to setup test databases:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Make sure PostgreSQL is running on localhost:5432');
    console.error('2. Make sure the postgres user exists with password "postgres"');
    console.error('3. Make sure the postgres user has CREATE DATABASE privileges');
    process.exit(1);
  }
}

if (require.main === module) {
  setupTestDatabases();
}

module.exports = { setupTestDatabases, createDatabase };
