"use client";

import useAuth from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function BookPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [selectedService, setSelectedService] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [loading, setLoading] = useState(false);

  const services = [
    { id: '1', name: 'Hair Cut', business: 'Style Studio', duration: '60 min', price: '$50' },
    { id: '2', name: 'Massage Therapy', business: 'Wellness Center', duration: '90 min', price: '$120' },
    { id: '3', name: 'Dental Cleaning', business: 'Smile Dental', duration: '45 min', price: '$80' },
  ];

  const timeSlots = [
    '09:00', '10:00', '11:00', '14:00', '15:00', '16:00'
  ];

  const handleBooking = async () => {
    if (!selectedService || !selectedDate || !selectedTime) {
      alert('Please select a service, date, and time');
      return;
    }

    setLoading(true);
    // Simulate booking API call
    setTimeout(() => {
      alert('Booking confirmed! You will receive a confirmation email shortly.');
      router.push('/bookings');
    }, 2000);
  };

  if (!user) {
    return <p className="p-4 text-center">Loading...</p>;
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <header className="flex flex-col sm:flex-row justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Book Appointment</h1>
          <p className="text-gray-600">Choose a service and time that works for you</p>
        </div>
        <button
          onClick={() => router.push('/dashboard')}
          className="mt-3 sm:mt-0 px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
        >
          Back to Dashboard
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Service Selection */}
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Select a Service</h2>
            <div className="space-y-3">
              {services.map((service) => (
                <label key={service.id} className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="service"
                    value={service.id}
                    checked={selectedService === service.id}
                    onChange={(e) => setSelectedService(e.target.value)}
                    className="mr-3"
                  />
                  <div className="flex-1">
                    <div className="font-medium">{service.name}</div>
                    <div className="text-sm text-gray-500">{service.business}</div>
                    <div className="text-sm text-gray-500">{service.duration} • {service.price}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Select Date</h2>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Time Selection */}
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Select Time</h2>
            <div className="grid grid-cols-3 gap-3">
              {timeSlots.map((time) => (
                <button
                  key={time}
                  onClick={() => setSelectedTime(time)}
                  className={`px-4 py-2 rounded-md border transition-colors ${
                    selectedTime === time
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {time}
                </button>
              ))}
            </div>
          </div>

          {/* Booking Summary */}
          {selectedService && selectedDate && selectedTime && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-2">Booking Summary</h3>
              <div className="space-y-1 text-sm">
                <p><span className="font-medium">Service:</span> {services.find(s => s.id === selectedService)?.name}</p>
                <p><span className="font-medium">Business:</span> {services.find(s => s.id === selectedService)?.business}</p>
                <p><span className="font-medium">Date:</span> {new Date(selectedDate).toLocaleDateString()}</p>
                <p><span className="font-medium">Time:</span> {selectedTime}</p>
                <p><span className="font-medium">Price:</span> {services.find(s => s.id === selectedService)?.price}</p>
              </div>
            </div>
          )}

          <button
            onClick={handleBooking}
            disabled={!selectedService || !selectedDate || !selectedTime || loading}
            className="w-full px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Booking...' : 'Confirm Booking'}
          </button>
        </div>
      </div>
    </div>
  );
}
