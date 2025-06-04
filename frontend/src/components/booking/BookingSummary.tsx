import React from 'react';

interface Service {
  name: string;
  duration: number;
  price: number;
  currency: string;
}

interface TimeSlot {
  startTime: string;
  endTime: string;
}

interface CustomerInfo {
  name: string;
  email: string;
  phone: string;
}

interface BookingSummaryProps {
  businessName: string;
  selectedService: Service;
  selectedDateTime: { date: Date; slot: TimeSlot };
  customerInfo: CustomerInfo | null;
  businessTimezone?: string;
}

const BookingSummary: React.FC<BookingSummaryProps> = ({
  businessName,
  selectedService,
  selectedDateTime,
  customerInfo,
  businessTimezone = 'UTC',
}) => {
  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: businessTimezone,
      hour12: true,
    });
  };

  const formatDate = (date: Date) => {
     return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }

  return (
    <div className="p-4 md:p-6 bg-white shadow-md rounded-lg border border-gray-200 space-y-4">
      <h3 className="text-xl font-semibold text-gray-800 border-b pb-2 mb-3">Review Your Booking</h3>

      <div>
        <h4 className="text-md font-semibold text-gray-700">Business:</h4>
        <p className="text-gray-600">{businessName}</p>
      </div>

      <div>
        <h4 className="text-md font-semibold text-gray-700">Service Details:</h4>
        <p className="text-gray-600"><strong>Service:</strong> {selectedService.name}</p>
        <p className="text-gray-600"><strong>Duration:</strong> {selectedService.duration} minutes</p>
        <p className="text-gray-600"><strong>Price:</strong> ${selectedService.price} {selectedService.currency}</p>
      </div>

      <div>
        <h4 className="text-md font-semibold text-gray-700">Selected Time:</h4>
        <p className="text-gray-600"><strong>Date:</strong> {formatDate(selectedDateTime.date)}</p>
        <p className="text-gray-600"><strong>Time:</strong> {formatTime(selectedDateTime.slot.startTime)} - {formatTime(selectedDateTime.slot.endTime)}</p>
      </div>

      {customerInfo && (
        <div>
          <h4 className="text-md font-semibold text-gray-700">Your Information:</h4>
          <p className="text-gray-600"><strong>Name:</strong> {customerInfo.name}</p>
          <p className="text-gray-600"><strong>Email:</strong> {customerInfo.email}</p>
          <p className="text-gray-600"><strong>Phone:</strong> {customerInfo.phone}</p>
        </div>
      )}
    </div>
  );
};

export default BookingSummary;
