"use client";

import { useAuthStore } from '@/stores/authStore';
import { detectIdentifierType, isValidIdentifier } from '@slotwise/utils';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';
type LoginStep = 'identifier' | 'code';

const LoginPage = () => {
  const [step, setStep] = useState<LoginStep>('identifier');
  const [identifier, setIdentifier] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();
  const { sendPhoneCode, sendEmailCode, verifyCode, isAuthenticated } = useAuthStore();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (step === 'identifier') {
        // Step 1: Send verification code
        if (!isValidIdentifier(identifier)) {
          throw new Error('Please enter a valid email address or phone number');
        }

        const identifierType = detectIdentifierType(identifier);

        if (identifierType === 'email') {
          await sendEmailCode(identifier);
        } else if (identifierType === 'phone') {
          await sendPhoneCode(identifier);
        } else {
          throw new Error('Invalid email or phone number format');
        }

        setStep('code');
      } else {
        // Step 2: Verify code and login
        if (!code || code.length !== 4) {
          throw new Error('Please enter a valid 4-digit code');
        }

        await verifyCode(identifier, code);
        // Redirect is handled by useEffect below
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setStep('identifier');
    setCode('');
    setError(null);
  };

  // Redirect if already authenticated or after successful login
  React.useEffect(() => {
    if (isAuthenticated) {
      // Check if user has a business - this will be handled by the business lookup logic
      // For now, redirect to dashboard and let the dashboard handle the business check
      router.push('/business/dashboard');
    }
  }, [isAuthenticated, router]);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center">
      <div className="bg-white shadow-md rounded-lg p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">
            🪄 Magic Login
          </h1>
          <p className="text-sm text-gray-600 mt-2">
            {step === 'identifier'
              ? 'Enter your email or phone number to get started'
              : 'Enter the 4-digit code we sent you'
            }
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 border border-red-400 rounded-md">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {step === 'identifier' ? (
            <div>
              <label
                htmlFor="identifier"
                className="block text-sm font-medium text-gray-700"
              >
                Email or Phone Number
              </label>
              <input
                id="identifier"
                name="identifier"
                type="text"
                autoComplete="email tel"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                disabled={isLoading}
                placeholder="Enter your email or phone number"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-50"
              />
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="code"
                  className="block text-sm font-medium text-gray-700"
                >
                  Verification Code
                </label>
                <button
                  type="button"
                  onClick={handleBack}
                  className="text-sm text-indigo-600 hover:text-indigo-500"
                >
                  ← Back
                </button>
              </div>
              <input
                id="code"
                name="code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                required
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                disabled={isLoading}
                placeholder="Enter 4-digit code"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-50 text-center text-lg tracking-widest"
              />
              <p className="text-xs text-gray-500 mt-2">
                Code sent to: {identifier}
              </p>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {isLoading
                ? (step === 'identifier' ? 'Sending Code...' : 'Verifying...')
                : (step === 'identifier' ? 'Continue' : 'Verify & Login')
              }
            </button>
          </div>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            New to SlotWise?{' '}
            <button
              onClick={() => router.push('/register')}
              className="font-medium text-indigo-600 hover:text-indigo-500"
            >
              Create an account
            </button>
          </p>
        </div>
      </div>
      <footer className="mt-8 text-center text-sm text-gray-500">
        &copy; {new Date().getFullYear()} SlotWise. All rights reserved.
      </footer>
    </div>
  );
};

export default LoginPage;
