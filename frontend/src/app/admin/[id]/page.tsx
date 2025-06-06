'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useParams } from 'next/navigation';
import { Copy, ExternalLink, Calendar, Clock, User } from 'lucide-react';

interface BookingPageData {
  pageId: string;
  ownerName: string;
  serviceName: string;
  serviceDuration: number;
  createdAt: string;
}

interface Appointment {
  date: string;
  time: string;
  slotKey: string;
}

export default function AdminPage() {
  const params = useParams();
  const pageId = params.id as string;
  
  const [bookingData, setBookingData] = useState<BookingPageData | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load booking page data from localStorage
    const data = localStorage.getItem(`booking_page_${pageId}`);
    if (data) {
      setBookingData(JSON.parse(data));
    }
    
    // Load booked slots and convert to appointments
    const slots = localStorage.getItem(`booked_slots_${pageId}`);
    if (slots) {
      const bookedSlots = JSON.parse(slots);
      const appointmentList = bookedSlots.map((slotKey: string) => {
        const [dateStr, time] = slotKey.split('-');
        return {
          date: dateStr,
          time: time,
          slotKey: slotKey,
        };
      });
      
      // Sort appointments by date and time
      appointmentList.sort((a, b) => {
        const dateA = new Date(a.date + ' ' + a.time);
        const dateB = new Date(b.date + ' ' + b.time);
        return dateA.getTime() - dateB.getTime();
      });
      
      setAppointments(appointmentList);
    }
    
    setLoading(false);
  }, [pageId]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('Copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const formatAppointmentDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const deleteAppointment = (slotKey: string) => {
    if (confirm('Are you sure you want to cancel this appointment?')) {
      const updatedSlots = appointments
        .filter(apt => apt.slotKey !== slotKey)
        .map(apt => apt.slotKey);
      
      localStorage.setItem(`booked_slots_${pageId}`, JSON.stringify(updatedSlots));
      setAppointments(appointments.filter(apt => apt.slotKey !== slotKey));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  if (!bookingData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-red-600">Admin Page Not Found</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-4">
              This admin page doesn't exist or has been removed.
            </p>
            <Button onClick={() => window.location.href = '/demo'}>
              Create Your Own Booking Page
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const publicLink = `${window.location.origin}/b/${pageId}`;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome, {bookingData.ownerName}! 👋
          </h1>
          <p className="text-gray-600">
            Admin panel for your <strong>{bookingData.serviceName}</strong> booking page
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <Calendar className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{appointments.length}</p>
              <p className="text-sm text-gray-600">Total Appointments</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <Clock className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{bookingData.serviceDuration}</p>
              <p className="text-sm text-gray-600">Minutes per Service</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <User className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">Active</p>
              <p className="text-sm text-gray-600">Booking Status</p>
            </CardContent>
          </Card>
        </div>

        {/* Public Link Sharing */}
        <Card>
          <CardHeader>
            <CardTitle>📅 Share Your Booking Link</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <input
                type="text"
                value={publicLink}
                readOnly
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-blue-50 border-blue-200"
              />
              <Button
                variant="outline"
                onClick={() => copyToClipboard(publicLink)}
                className="px-3"
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                onClick={() => window.open(publicLink, '_blank')}
                className="px-3"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Share this link with your clients so they can book appointments with you.
            </p>
          </CardContent>
        </Card>

        {/* Appointments List */}
        <Card>
          <CardHeader>
            <CardTitle>📋 Upcoming Appointments</CardTitle>
          </CardHeader>
          <CardContent>
            {appointments.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 mb-2">No appointments yet</p>
                <p className="text-sm text-gray-400">
                  Share your booking link to start receiving appointments!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {appointments.map((appointment, index) => (
                  <div
                    key={appointment.slotKey}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-white"
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        {formatAppointmentDate(appointment.date)}
                      </p>
                      <p className="text-sm text-gray-600">
                        {appointment.time} • {bookingData.serviceDuration} minutes
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteAppointment(appointment.slotKey)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      Cancel
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center">
          <p className="text-sm text-gray-500">
            Powered by SlotWise • <a href="/demo" className="text-blue-600 hover:underline">Create another booking page</a>
          </p>
        </div>
      </div>
    </div>
  );
}
