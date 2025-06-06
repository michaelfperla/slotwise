'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Copy, ExternalLink } from 'lucide-react';
import React, { useState } from 'react';

interface BusinessData {
  ownerName: string;
  serviceName: string;
  serviceDuration: number;
}

interface MagicLinks {
  pageId: string;
  publicLink: string;
  adminLink: string;
}

const DURATION_OPTIONS = [
  { value: 30, label: '30 minutes' },
  { value: 45, label: '45 minutes' },
  { value: 60, label: '60 minutes' },
];

// Generate a random ID for the booking page
function generatePageId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 7; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export default function DemoPage() {
  const [currentView, setCurrentView] = useState<'business' | 'links'>('business');
  const [businessData, setBusinessData] = useState<BusinessData>({
    ownerName: '',
    serviceName: '',
    serviceDuration: 30,
  });
  const [magicLinks, setMagicLinks] = useState<MagicLinks | null>(null);

  const handleBusinessSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (businessData.ownerName && businessData.serviceName) {
      // Generate unique page ID
      const pageId = generatePageId();

      // Create magic links
      const baseUrl = window.location.origin;
      const publicLink = `${baseUrl}/b/${pageId}`;
      const adminLink = `${baseUrl}/admin/${pageId}`;

      // Save to localStorage for "passwordless" login
      const bookingPageData = {
        pageId,
        ownerName: businessData.ownerName,
        serviceName: businessData.serviceName,
        serviceDuration: businessData.serviceDuration,
        createdAt: new Date().toISOString(),
      };

      // Store in localStorage
      localStorage.setItem(`booking_page_${pageId}`, JSON.stringify(bookingPageData));

      // Also store a list of user's pages for easy access
      const userPages = JSON.parse(localStorage.getItem('user_booking_pages') || '[]');
      userPages.push(pageId);
      localStorage.setItem('user_booking_pages', JSON.stringify(userPages));

      // Set magic links and switch view
      setMagicLinks({ pageId, publicLink, adminLink });
      setCurrentView('links');
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // You could add a toast notification here
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };



  if (currentView === 'business') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Create Your Booking Link</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleBusinessSubmit} className="space-y-4">
              <div>
                <label htmlFor="ownerName" className="block text-sm font-medium text-gray-700 mb-1">
                  Your Name
                </label>
                <Input
                  id="ownerName"
                  type="text"
                  value={businessData.ownerName}
                  onChange={(e) => setBusinessData(prev => ({ ...prev, ownerName: e.target.value }))}
                  placeholder="Enter your name"
                  required
                />
              </div>

              <div>
                <label htmlFor="serviceName" className="block text-sm font-medium text-gray-700 mb-1">
                  Service Name
                </label>
                <Input
                  id="serviceName"
                  type="text"
                  value={businessData.serviceName}
                  onChange={(e) => setBusinessData(prev => ({ ...prev, serviceName: e.target.value }))}
                  placeholder="e.g., Men's Haircut"
                  required
                />
              </div>

              <div>
                <label htmlFor="serviceDuration" className="block text-sm font-medium text-gray-700 mb-1">
                  Service Duration
                </label>
                <select
                  id="serviceDuration"
                  value={businessData.serviceDuration}
                  onChange={(e) => setBusinessData(prev => ({ ...prev, serviceDuration: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {DURATION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <Button type="submit" className="w-full">
                Generate My Booking Link
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (currentView === 'links' && magicLinks) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle className="text-2xl text-center text-green-600">🎉 Your Booking Links Are Ready!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <p className="text-gray-600 mb-4">
                Your booking page for <strong>{businessData.serviceName}</strong> has been created successfully!
              </p>
            </div>

            {/* Public Booking Link */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                📅 Your Public Booking Link (for your clients):
              </label>
              <div className="flex gap-2">
                <Input
                  value={magicLinks.publicLink}
                  readOnly
                  className="flex-1 bg-blue-50 border-blue-200"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(magicLinks.publicLink)}
                  className="px-3"
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(magicLinks.publicLink, '_blank')}
                  className="px-3"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                Share this link with your clients so they can book appointments with you.
              </p>
            </div>

            {/* Private Admin Link */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                🔐 Your Private Admin Link (Bookmark this!):
              </label>
              <div className="flex gap-2">
                <Input
                  value={magicLinks.adminLink}
                  readOnly
                  className="flex-1 bg-amber-50 border-amber-200"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(magicLinks.adminLink)}
                  className="px-3"
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(magicLinks.adminLink, '_blank')}
                  className="px-3"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                This is your private control panel. Bookmark it to manage your appointments.
              </p>
            </div>

            <div className="pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setCurrentView('business');
                  setMagicLinks(null);
                  setBusinessData({ ownerName: '', serviceName: '', serviceDuration: 30 });
                }}
                className="w-full"
              >
                Create Another Booking Link
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}
