#!/usr/bin/env node

/**
 * Development Data Seeding Script
 * Creates sample data for local development and testing
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const businessPrisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL_BUSINESS || 'postgresql://slotwise:slotwise_dev_password@localhost:5432/slotwise_business'
    }
  }
});

const notificationPrisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL_NOTIFICATION || 'postgresql://slotwise:slotwise_dev_password@localhost:5432/slotwise_notification'
    }
  }
});

async function seedBusinessData() {
  console.log('🌱 Seeding business service data...');

  // Create sample businesses
  const businesses = [
    {
      id: 'biz_acme_consulting',
      name: 'Acme Consulting',
      description: 'Professional business consulting services',
      subdomain: 'acme-consulting',
      email: 'contact@acme-consulting.com',
      phone: '+1-555-0123',
      website: 'https://acme-consulting.com',
      timezone: 'America/New_York',
      currency: 'USD',
      ownerId: 'user_john_doe',
      status: 'ACTIVE',
      street: '123 Business Ave',
      city: 'New York',
      state: 'NY',
      postalCode: '10001',
      country: 'US',
    },
    {
      id: 'biz_wellness_spa',
      name: 'Zen Wellness Spa',
      description: 'Relaxation and wellness services',
      subdomain: 'zen-wellness',
      email: 'hello@zenwellness.com',
      phone: '+1-555-0456',
      website: 'https://zenwellness.com',
      timezone: 'America/Los_Angeles',
      currency: 'USD',
      ownerId: 'user_jane_smith',
      status: 'ACTIVE',
      street: '456 Wellness Blvd',
      city: 'Los Angeles',
      state: 'CA',
      postalCode: '90210',
      country: 'US',
    },
  ];

  for (const business of businesses) {
    await businessPrisma.business.upsert({
      where: { id: business.id },
      update: business,
      create: business,
    });
  }

  // Create sample services
  const services = [
    {
      id: 'svc_strategy_session',
      businessId: 'biz_acme_consulting',
      name: 'Strategy Session',
      description: 'One-on-one business strategy consultation',
      duration: 60,
      price: 150.0,
      currency: 'USD',
      category: 'Consulting',
      isActive: true,
      maxAdvanceBookingDays: 30,
      minAdvanceBookingHours: 24,
      allowOnlinePayment: true,
      requiresApproval: false,
    },
    {
      id: 'svc_team_workshop',
      businessId: 'biz_acme_consulting',
      name: 'Team Workshop',
      description: 'Team building and strategy workshop',
      duration: 120,
      price: 500.0,
      currency: 'USD',
      category: 'Workshop',
      isActive: true,
      maxAdvanceBookingDays: 60,
      minAdvanceBookingHours: 48,
      allowOnlinePayment: true,
      requiresApproval: true,
    },
    {
      id: 'svc_massage_therapy',
      businessId: 'biz_wellness_spa',
      name: 'Relaxation Massage',
      description: 'Full body relaxation massage therapy',
      duration: 90,
      price: 120.0,
      currency: 'USD',
      category: 'Massage',
      isActive: true,
      maxAdvanceBookingDays: 14,
      minAdvanceBookingHours: 2,
      allowOnlinePayment: true,
      requiresApproval: false,
    },
    {
      id: 'svc_facial_treatment',
      businessId: 'biz_wellness_spa',
      name: 'Rejuvenating Facial',
      description: 'Deep cleansing and rejuvenating facial treatment',
      duration: 75,
      price: 95.0,
      currency: 'USD',
      category: 'Skincare',
      isActive: true,
      maxAdvanceBookingDays: 21,
      minAdvanceBookingHours: 4,
      allowOnlinePayment: true,
      requiresApproval: false,
    },
  ];

  for (const service of services) {
    await businessPrisma.service.upsert({
      where: { id: service.id },
      update: service,
      create: service,
    });
  }

  console.log('✅ Business service data seeded');
}

async function seedNotificationData() {
  console.log('🌱 Seeding notification service data...');

  // Create notification templates
  const templates = [
    {
      id: 'tpl_booking_confirmation',
      name: 'Booking Confirmation',
      type: 'BOOKING_CONFIRMATION',
      channel: 'EMAIL',
      subject: 'Booking Confirmed - {{serviceName}}',
      content: `
        <h2>Booking Confirmed!</h2>
        <p>Hi {{customerName}},</p>
        <p>Your booking has been confirmed:</p>
        <ul>
          <li><strong>Service:</strong> {{serviceName}}</li>
          <li><strong>Date & Time:</strong> {{startTime}}</li>
          <li><strong>Duration:</strong> {{duration}} minutes</li>
          <li><strong>Price:</strong> ${{price}}</li>
        </ul>
        <p>We look forward to seeing you!</p>
        <p>Best regards,<br>{{businessName}}</p>
      `,
      variables: ['customerName', 'serviceName', 'startTime', 'duration', 'price', 'businessName'],
      isActive: true,
      businessId: null, // System template
    },
    {
      id: 'tpl_booking_reminder',
      name: 'Booking Reminder',
      type: 'BOOKING_REMINDER',
      channel: 'EMAIL',
      subject: 'Reminder: {{serviceName}} tomorrow',
      content: `
        <h2>Appointment Reminder</h2>
        <p>Hi {{customerName}},</p>
        <p>This is a friendly reminder about your upcoming appointment:</p>
        <ul>
          <li><strong>Service:</strong> {{serviceName}}</li>
          <li><strong>Date & Time:</strong> {{startTime}}</li>
          <li><strong>Location:</strong> {{businessAddress}}</li>
        </ul>
        <p>Please arrive 10 minutes early.</p>
        <p>Best regards,<br>{{businessName}}</p>
      `,
      variables: ['customerName', 'serviceName', 'startTime', 'businessAddress', 'businessName'],
      isActive: true,
      businessId: null, // System template
    },
  ];

  for (const template of templates) {
    await notificationPrisma.notificationTemplate.upsert({
      where: { id: template.id },
      update: template,
      create: template,
    });
  }

  console.log('✅ Notification service data seeded');
}

async function main() {
  try {
    console.log('🚀 Starting development data seeding...');
    
    await seedBusinessData();
    await seedNotificationData();
    
    console.log('✅ All development data seeded successfully!');
    console.log('');
    console.log('📋 Sample Data Created:');
    console.log('  • 2 businesses (Acme Consulting, Zen Wellness Spa)');
    console.log('  • 4 services (Strategy Session, Team Workshop, Massage, Facial)');
    console.log('  • 2 notification templates (Confirmation, Reminder)');
    console.log('');
    console.log('🌐 You can now:');
    console.log('  • Visit http://localhost:8003/docs to explore the Business API');
    console.log('  • Test booking flows with the sample services');
    console.log('  • View businesses at /api/v1/businesses');
    
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  } finally {
    await businessPrisma.$disconnect();
    await notificationPrisma.$disconnect();
  }
}

main();
