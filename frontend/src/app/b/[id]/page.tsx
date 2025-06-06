'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useParams } from 'next/navigation';

interface BookingPageData {
  pageId: string;
  ownerName: string;
  serviceName: string;
  serviceDuration: number;
  createdAt: string;
}

interface TimeSlot {
  time: string;
  available: boolean;
}

const BUSINESS_HOURS = {
  start: 9, // 9 AM
  end: 17, // 5 PM
};

export default function PublicBookingPage() {
  const params = useParams();
  const pageId = params.id as string;
  
  const [bookingData, setBookingData] = useState<BookingPageData | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [bookedSlots, setBookedSlots] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load booking page data from localStorage
    const data = localStorage.getItem(`booking_page_${pageId}`);
    if (data) {
      setBookingData(JSON.parse(data));
    }
    
    // Load booked slots for this page
    const slots = localStorage.getItem(`booked_slots_${pageId}`);
    if (slots) {
      setBookedSlots(new Set(JSON.parse(slots)));
    }
    
    setLoading(false);
  }, [pageId]);

  const generateTimeSlots = (duration: number): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    const startHour = BUSINESS_HOURS.start;
    const endHour = BUSINESS_HOURS.end;
    
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += duration) {
        if (hour === endHour - 1 && minute + duration > 60) break;
        
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const slotKey = selectedDate ? `${selectedDate.toDateString()}-${timeString}` : timeString;
        
        slots.push({
          time: timeString,
          available: !bookedSlots.has(slotKey),
        });
      }
    }
    
    return slots;
  };

  const handleBookSlot = (timeSlot: string) => {
    if (selectedDate) {
      const slotKey = `${selectedDate.toDateString()}-${timeSlot}`;
      const newBookedSlots = new Set([...bookedSlots, slotKey]);
      setBookedSlots(newBookedSlots);
      
      // Save to localStorage
      localStorage.setItem(`booked_slots_${pageId}`, JSON.stringify([...newBookedSlots]));
      
      // Show confirmation
      alert(`✅ Appointment booked for ${selectedDate.toLocaleDateString()} at ${timeSlot}!`);
    }
  };

  const getWeekDays = () => {
    const today = new Date();
    const days = [];
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      days.push(date);
    }
    
    return days;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading booking page...</p>
        </div>
      </div>
    );
  }

  if (!bookingData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-red-600">Booking Page Not Found</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-4">
              This booking page doesn't exist or has been removed.
            </p>
            <Button onClick={() => window.location.href = '/demo'}>
              Create Your Own Booking Page
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Book a {bookingData.serviceName} with {bookingData.ownerName}
          </h1>
          <p className="text-gray-600">
            Duration: {bookingData.serviceDuration} minutes
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Calendar Section */}
          <Card>
            <CardHeader>
              <CardTitle>Select a Day</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-2">
                {getWeekDays().map((date, index) => (
                  <Button
                    key={index}
                    variant={selectedDate?.toDateString() === date.toDateString() ? "default" : "outline"}
                    className="justify-start"
                    onClick={() => setSelectedDate(date)}
                  >
                    {formatDate(date)}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Time Slots Section */}
          <Card>
            <CardHeader>
              <CardTitle>
                {selectedDate ? `Available Times - ${formatDate(selectedDate)}` : 'Select a day to see available times'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedDate ? (
                <div className="grid grid-cols-2 gap-2">
                  {generateTimeSlots(bookingData.serviceDuration).map((slot) => (
                    <div key={slot.time}>
                      {slot.available ? (
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => {
                            if (confirm(`Book this time slot: ${slot.time}?`)) {
                              handleBookSlot(slot.time);
                            }
                          }}
                        >
                          {slot.time}
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          className="w-full opacity-50 cursor-not-allowed"
                          disabled
                        >
                          {slot.time} (Booked)
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">
                  Please select a day to view available time slots
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Powered by SlotWise • <a href="/demo" className="text-blue-600 hover:underline">Create your own booking page</a>
          </p>
        </div>
      </div>
    </div>
  );
}
