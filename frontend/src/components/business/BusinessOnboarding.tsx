/**
 * Business Onboarding Component
 * 
 * This component provides a step-by-step onboarding flow for new business owners
 * to set up their business profile, services, and availability.
 */

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Building2, 
  Clock, 
  DollarSign, 
  CheckCircle,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useCreateBusiness, useCreateService } from '@/hooks/useBusinessQueries';
import { CreateBusinessRequest, CreateServiceRequest } from '@/types/api';
import { businessUtils } from '@/lib/services/businessApi';

interface OnboardingStep {
  id: number;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const onboardingSteps: OnboardingStep[] = [
  {
    id: 1,
    title: 'Business Profile',
    description: 'Set up your business information',
    icon: Building2,
  },
  {
    id: 2,
    title: 'First Service',
    description: 'Create your first service offering',
    icon: Clock,
  },
  {
    id: 3,
    title: 'Pricing',
    description: 'Set your pricing and policies',
    icon: DollarSign,
  },
  {
    id: 4,
    title: 'Go Live',
    description: 'Review and launch your business',
    icon: CheckCircle,
  },
];

interface BusinessFormData {
  name: string;
  description: string;
  subdomain: string;
  email: string;
  phone: string;
  website: string;
  timezone: string;
  currency: string;
  address: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
}

interface ServiceFormData {
  name: string;
  description: string;
  duration: number;
  price: number;
  category: string;
}

export function BusinessOnboarding() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [businessData, setBusinessData] = useState<BusinessFormData>({
    name: '',
    description: '',
    subdomain: '',
    email: '',
    phone: '',
    website: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    currency: 'USD',
    address: {
      street: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'US',
    },
  });
  const [serviceData, setServiceData] = useState<ServiceFormData>({
    name: '',
    description: '',
    duration: 60,
    price: 100,
    category: '',
  });
  const [createdBusiness, setCreatedBusiness] = useState<any>(null);

  const createBusiness = useCreateBusiness();
  const createService = useCreateService();

  const handleBusinessSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const business = await createBusiness.mutateAsync({
        ...businessData,
        subdomain: businessUtils.formatSubdomain(businessData.subdomain || businessData.name),
      });
      
      setCreatedBusiness(business);
      setCurrentStep(2);
    } catch (error) {
      console.error('Failed to create business:', error);
    }
  };

  const handleServiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!createdBusiness) return;
    
    try {
      await createService.mutateAsync({
        ...serviceData,
        businessId: createdBusiness.id,
        price: Math.round(serviceData.price * 100), // Convert to cents
        currency: businessData.currency,
        isActive: true,
        maxAdvanceBookingDays: 30,
        minAdvanceBookingHours: 24,
        requiresApproval: false,
        allowOnlinePayment: true,
      });
      
      setCurrentStep(3);
    } catch (error) {
      console.error('Failed to create service:', error);
    }
  };

  const handleComplete = () => {
    router.push('/business/dashboard');
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      {onboardingSteps.map((step, index) => {
        const Icon = step.icon;
        const isActive = currentStep === step.id;
        const isCompleted = currentStep > step.id;
        
        return (
          <div key={step.id} className="flex items-center">
            <div className={`
              flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors
              ${isActive 
                ? 'border-primary-600 bg-primary-600 text-white' 
                : isCompleted 
                  ? 'border-green-500 bg-green-500 text-white'
                  : 'border-gray-300 bg-white text-gray-400'
              }
            `}>
              <Icon className="h-5 w-5" />
            </div>
            
            {index < onboardingSteps.length - 1 && (
              <div className={`
                w-16 h-0.5 mx-2 transition-colors
                ${isCompleted ? 'bg-green-500' : 'bg-gray-300'}
              `} />
            )}
          </div>
        );
      })}
    </div>
  );

  const renderBusinessForm = () => (
    <Card className="p-8 max-w-2xl mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Tell us about your business
        </h2>
        <p className="text-gray-600">
          This information will be used to create your business profile
        </p>
      </div>

      <form onSubmit={handleBusinessSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Business Name *
            </label>
            <Input
              value={businessData.name}
              onChange={(e) => {
                const name = e.target.value;
                setBusinessData({ 
                  ...businessData, 
                  name,
                  subdomain: businessData.subdomain || businessUtils.formatSubdomain(name)
                });
              }}
              placeholder="Your Business Name"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subdomain *
            </label>
            <div className="flex">
              <Input
                value={businessData.subdomain}
                onChange={(e) => setBusinessData({ 
                  ...businessData, 
                  subdomain: businessUtils.formatSubdomain(e.target.value)
                })}
                placeholder="your-business"
                required
              />
              <span className="inline-flex items-center px-3 text-sm text-gray-500 bg-gray-50 border border-l-0 border-gray-300 rounded-r-md">
                .slotwise.com
              </span>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            rows={3}
            value={businessData.description}
            onChange={(e) => setBusinessData({ ...businessData, description: e.target.value })}
            placeholder="Describe what your business does..."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <Input
              type="email"
              value={businessData.email}
              onChange={(e) => setBusinessData({ ...businessData, email: e.target.value })}
              placeholder="business@example.com"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone
            </label>
            <Input
              type="tel"
              value={businessData.phone}
              onChange={(e) => setBusinessData({ ...businessData, phone: e.target.value })}
              placeholder="+1 (555) 123-4567"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Timezone *
            </label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={businessData.timezone}
              onChange={(e) => setBusinessData({ ...businessData, timezone: e.target.value })}
              required
            >
              <option value="America/New_York">Eastern Time</option>
              <option value="America/Chicago">Central Time</option>
              <option value="America/Denver">Mountain Time</option>
              <option value="America/Los_Angeles">Pacific Time</option>
              <option value="Europe/London">London</option>
              <option value="Europe/Paris">Paris</option>
              <option value="Asia/Tokyo">Tokyo</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Currency
            </label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={businessData.currency}
              onChange={(e) => setBusinessData({ ...businessData, currency: e.target.value })}
            >
              <option value="USD">USD - US Dollar</option>
              <option value="EUR">EUR - Euro</option>
              <option value="GBP">GBP - British Pound</option>
              <option value="CAD">CAD - Canadian Dollar</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end">
          <Button 
            type="submit" 
            disabled={createBusiness.isPending}
            className="flex items-center"
          >
            {createBusiness.isPending ? 'Creating...' : 'Continue'}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </form>
    </Card>
  );

  const renderServiceForm = () => (
    <Card className="p-8 max-w-2xl mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Create your first service
        </h2>
        <p className="text-gray-600">
          What service will you be offering to your customers?
        </p>
      </div>

      <form onSubmit={handleServiceSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Service Name *
          </label>
          <Input
            value={serviceData.name}
            onChange={(e) => setServiceData({ ...serviceData, name: e.target.value })}
            placeholder="e.g., 60-minute Consultation"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            rows={3}
            value={serviceData.description}
            onChange={(e) => setServiceData({ ...serviceData, description: e.target.value })}
            placeholder="Describe your service..."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Duration (minutes) *
            </label>
            <Input
              type="number"
              value={serviceData.duration}
              onChange={(e) => setServiceData({ ...serviceData, duration: parseInt(e.target.value) || 0 })}
              min="15"
              max="480"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Price ({businessData.currency}) *
            </label>
            <Input
              type="number"
              step="0.01"
              value={serviceData.price}
              onChange={(e) => setServiceData({ ...serviceData, price: parseFloat(e.target.value) || 0 })}
              min="0"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <Input
              value={serviceData.category}
              onChange={(e) => setServiceData({ ...serviceData, category: e.target.value })}
              placeholder="e.g., Consulting"
            />
          </div>
        </div>

        <div className="flex justify-between">
          <Button 
            type="button" 
            variant="outline"
            onClick={() => setCurrentStep(1)}
            className="flex items-center"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button 
            type="submit" 
            disabled={createService.isPending}
            className="flex items-center"
          >
            {createService.isPending ? 'Creating...' : 'Continue'}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </form>
    </Card>
  );

  const renderComplete = () => (
    <Card className="p-8 max-w-2xl mx-auto text-center">
      <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        Congratulations! 🎉
      </h2>
      <p className="text-gray-600 mb-6">
        Your business is now set up and ready to accept bookings.
      </p>
      
      {createdBusiness && (
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-600 mb-2">Your booking page is live at:</p>
          <p className="font-mono text-primary-600 break-all">
            {businessUtils.getBusinessUrl(createdBusiness.subdomain)}
          </p>
        </div>
      )}

      <div className="flex justify-center space-x-4">
        <Button variant="outline" asChild>
          <a href={businessUtils.getBusinessUrl(createdBusiness?.subdomain || '')} target="_blank">
            View Public Page
          </a>
        </Button>
        <Button onClick={handleComplete}>
          Go to Dashboard
        </Button>
      </div>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {renderStepIndicator()}
        
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {onboardingSteps[currentStep - 1]?.title}
          </h1>
          <p className="text-gray-600">
            {onboardingSteps[currentStep - 1]?.description}
          </p>
        </div>

        {currentStep === 1 && renderBusinessForm()}
        {currentStep === 2 && renderServiceForm()}
        {currentStep === 3 && setCurrentStep(4)} {/* Skip pricing step for now */}
        {currentStep === 4 && renderComplete()}
      </div>
    </div>
  );
}

export default BusinessOnboarding;
