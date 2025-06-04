"use client";

import useAuth from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface Booking {
  id: string;
  serviceName: string;
  businessName: string;
  startTime: string;
  endTime: string;
  status: string;
}

export default function BookingsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading bookings
    setTimeout(() => {
      setBookings([
        {
          id: '1',
          serviceName: 'Hair Cut',
          businessName: 'Style Studio',
          startTime: '2025-06-10T10:00:00Z',
          endTime: '2025-06-10T11:00:00Z',
          status: 'confirmed'
        },
        {
          id: '2',
          serviceName: 'Massage Therapy',
          businessName: 'Wellness Center',
          startTime: '2025-06-12T14:00:00Z',
          endTime: '2025-06-12T15:30:00Z',
          status: 'pending'
        }
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  if (!user) {
    return <p className="p-4 text-center">Loading...</p>;
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <header className="flex flex-col sm:flex-row justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">My Bookings</h1>
          <p className="text-gray-600">View and manage your appointments</p>
        </div>
        <button
          onClick={() => router.push('/dashboard')}
          className="mt-3 sm:mt-0 px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
        >
          Back to Dashboard
        </button>
      </header>

      {loading ? (
        <div className="text-center py-8">
          <p>Loading your bookings...</p>
        </div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500 mb-4">You don't have any bookings yet.</p>
          <button
            onClick={() => router.push('/book')}
            className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
          >
            Book Your First Appointment
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => (
            <div key={booking.id} className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">{booking.serviceName}</h3>
                  <p className="text-gray-600">{booking.businessName}</p>
                  <p className="text-sm text-gray-500 mt-2">
                    {new Date(booking.startTime).toLocaleDateString()} at{' '}
                    {new Date(booking.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  booking.status === 'confirmed' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {booking.status}
                </span>
              </div>
              <div className="mt-4 flex space-x-2">
                <button className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600">
                  View Details
                </button>
                <button className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600">
                  Cancel
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
