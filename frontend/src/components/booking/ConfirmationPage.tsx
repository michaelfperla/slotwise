import React from 'react';

interface BookingResponse {
  id: string;
  status: string;
  startTime: string;
  endTime: string;
  confirmationCode: string;
  serviceName: string;
  customerName: string;
}

interface ConfirmationPageProps {
  bookingDetails: BookingResponse;
  onBookAnother: () => void;
  businessTimezone?: string;
}

const ConfirmationPage: React.FC<ConfirmationPageProps> = ({ bookingDetails, onBookAnother, businessTimezone = 'UTC' }) => {
  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: businessTimezone,
      hour12: true,
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }

  return (
    <div className="p-4 md:p-8 text-center bg-green-50 border-2 border-green-500 rounded-lg shadow-xl">
      <h2 className="text-2xl md:text-3xl font-bold text-green-700 mb-4">Booking Confirmed!</h2>
      <p className="text-md text-gray-700 mb-2">
        Thank you, <span className="font-semibold">{bookingDetails.customerName}</span>, your booking for <span className="font-semibold">{bookingDetails.serviceName}</span> is confirmed.
      </p>
      <p className="text-sm text-gray-600 mb-6">
        A (mock) confirmation email has been sent to your email address.
      </p>

      <div className="p-4 bg-white rounded-md shadow border border-gray-200 text-left space-y-2 mb-8">
        <h3 className="text-lg font-semibold text-gray-800 mb-3 border-b pb-2">Confirmation Details:</h3>
        <p><strong>Booking ID:</strong> <span className="text-gray-700">{bookingDetails.id}</span></p>
        <p><strong>Confirmation Code:</strong> <span className="text-gray-700">{bookingDetails.confirmationCode}</span></p>
        <p><strong>Status:</strong> <span className="text-green-600 font-semibold">{bookingDetails.status}</span></p>
        <p><strong>Service:</strong> <span className="text-gray-700">{bookingDetails.serviceName}</span></p>
        <p><strong>Date:</strong> <span className="text-gray-700">{formatDate(bookingDetails.startTime)}</span></p>
        <p><strong>Time:</strong> <span className="text-gray-700">{formatTime(bookingDetails.startTime)} - {formatTime(bookingDetails.endTime)}</span></p>
      </div>

      <button
        onClick={onBookAnother}
        className="px-6 py-3 bg-blue-500 text-white font-semibold rounded-md hover:bg-blue-600 transition-colors text-lg"
      >
        Book Another Service
      </button>
    </div>
  );
};

export default ConfirmationPage;
