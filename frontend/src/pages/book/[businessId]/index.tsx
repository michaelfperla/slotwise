import { GetStaticPaths, GetStaticProps, NextPage } from 'next';
import { useRouter } from 'next/router';
import { useState, useRef, useCallback } from 'react'; // Added useRef
import BusinessProfile from '../../../components/booking/BusinessProfile';
import ServiceSelection from '../../../components/booking/ServiceSelection';
import TimeSelection from '../../../components/booking/TimeSelection';
import BookingForm, { BookingFormHandles, CustomerInfo } from '../../../components/booking/BookingForm'; // Import BookingFormHandles and CustomerInfo
import BookingSummary from '../../../components/booking/BookingSummary';
import ConfirmationPage from '../../../components/booking/ConfirmationPage';

// Mock Data
const mockBusiness = {
  id: "biz_123",
  name: "Acme Consulting",
  description: "Professional business strategy consulting, helping your company reach new heights with expert advice and proven methodologies.",
  timezone: "America/New_York",
  services: [
    {
      id: "svc_1",
      name: "Strategy Session",
      description: "1-hour intensive business strategy consultation. Ideal for startups and businesses looking for quick insights.",
      duration: 60,
      price: 150,
      currency: "USD"
    },
    {
      id: "svc_2",
      name: "Marketing Plan Development",
      description: "2-hour in-depth marketing strategy session, including a preliminary plan. Perfect for businesses aiming to expand their reach.",
      duration: 120,
      price: 250,
      currency: "USD"
    }
  ]
};

// Interfaces
interface Service {
  id: string;
  name: string;
  description: string;
  duration: number;
  price: number;
  currency: string;
}

interface Business {
  id: string;
  name: string;
  description: string;
  timezone: string;
  services: Service[];
}

interface TimeSlot {
  startTime: string;
  endTime: string;
}

// CustomerInfo is imported from BookingForm.tsx

interface BookingResponse {
  id: string;
  status: string;
  startTime: string;
  endTime: string;
  confirmationCode: string;
  serviceName: string;
  customerName: string;
}

interface BookingPageProps {
  business: Business | null;
}

type BookingStep = 'selectService' | 'selectTime' | 'enterDetails' | 'confirmed';

const BookingPage: NextPage<BookingPageProps> = ({ business }) => {
  const router = useRouter();
  const bookingFormRef = useRef<BookingFormHandles>(null); // Ref for BookingForm
  const [bookingStep, setBookingStep] = useState<BookingStep>('selectService');
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDateTime, setSelectedDateTime] = useState<{ date: Date; slot: TimeSlot } | null>(null);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null); // To store validated info
  const [bookingResponse, setBookingResponse] = useState<BookingResponse | null>(null);

  if (router.isFallback) {
    return <div className="flex justify-center items-center min-h-screen"><p className="text-lg">Loading...</p></div>;
  }

  if (!business) {
    return <div className="flex justify-center items-center min-h-screen"><p className="text-lg text-red-500">Business not found.</p></div>;
  }

  const handleServiceSelect = (service: Service) => {
    setSelectedService(service);
    setSelectedDateTime(null);
    setCustomerInfo(null);
    setBookingResponse(null);
    setBookingStep('selectTime');
  };

  const handleTimeSelect = (date: Date, slot: TimeSlot) => {
    setSelectedDateTime({ date, slot });
    setBookingStep('enterDetails');
  };

  // This function is called by BookingForm AFTER its internal validation passes
  const handleCustomerInfoSubmit = useCallback((formData: CustomerInfo) => {
    setCustomerInfo(formData); // Store the validated customer info
    // console.log("Validated Customer Info Received from Form:", formData);

    if (business && selectedService && selectedDateTime) {
      const bookingRequest = {
        businessId: business.id,
        serviceId: selectedService.id,
        customerInfo: formData, // Use the validated formData
        startTime: selectedDateTime.slot.startTime,
      };
      console.log("Simulating API Call with booking request:", bookingRequest);

      const mockApiResponse: BookingResponse = {
        id: `booking_${Date.now().toString().slice(-6)}`,
        status: "CONFIRMED",
        startTime: selectedDateTime.slot.startTime,
        endTime: selectedDateTime.slot.endTime,
        confirmationCode: `XYZ${Date.now().toString().slice(-3)}`,
        serviceName: selectedService.name,
        customerName: formData.name,
      };
      setBookingResponse(mockApiResponse);
      console.log("Mock API Response:", mockApiResponse);
      console.log(`Simulating sending confirmation email to ${formData.email}.`);
      setBookingStep('confirmed');
    } else {
      console.error("Missing data for booking submission. This should not happen if steps are followed.");
      // Potentially reset or show an error
    }
  }, [business, selectedService, selectedDateTime]); // Dependencies for useCallback

  const handleBookAnother = () => {
    setSelectedService(null);
    setSelectedDateTime(null);
    setCustomerInfo(null);
    setBookingResponse(null);
    setBookingStep('selectService');
  };

  const handlePaymentButtonClick = () => {
    if (bookingFormRef.current) {
      const isValid = bookingFormRef.current.triggerSubmit();
      // If isValid is true, BookingForm's onSubmit will call handleCustomerInfoSubmit
      // which then sets customerInfo state and proceeds to 'confirmed' step.
      // No need to directly change step here based on isValid,
      // as handleCustomerInfoSubmit will do that if called.
      if (!isValid) {
        console.log("Form validation failed in BookingForm.");
        // Optionally, provide feedback to the user that the form is invalid
      }
    }
  };

  const stepTitles: Record<BookingStep, string> = {
    selectService: "Select a Service",
    selectTime: "Choose a Time Slot",
    enterDetails: "Enter Your Details & Confirm",
    confirmed: "Booking Confirmed!"
  };

  const currentTitle = selectedService && bookingStep !== 'selectService'
    ? `${selectedService.name} - ${stepTitles[bookingStep]}`
    : stepTitles[bookingStep];

  return (
    <div className="container mx-auto p-4 max-w-2xl bg-white shadow-lg rounded-lg my-6 md:my-12">
      <BusinessProfile business={{ name: business.name, description: business.description }} />
      <hr className="my-6" />

      <h2 className="text-2xl font-semibold mb-6 text-center text-gray-700">{currentTitle}</h2>

      {bookingStep === 'selectService' && (
        <ServiceSelection services={business.services} onSelectService={handleServiceSelect} />
      )}

      {bookingStep === 'selectTime' && selectedService && (
        <>
          <TimeSelection
            selectedService={selectedService}
            onTimeSelect={handleTimeSelect}
            businessTimezone={business.timezone}
          />
          <div className="mt-6 flex justify-start">
            <button
              onClick={() => setBookingStep('selectService')}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
            >
              Back to Services
            </button>
          </div>
        </>
      )}

      {bookingStep === 'enterDetails' && selectedService && selectedDateTime && (
        <div className="space-y-6">
          <BookingSummary
            businessName={business.name}
            selectedService={selectedService}
            selectedDateTime={selectedDateTime}
            customerInfo={customerInfo} // Show customerInfo if already validated and somehow re-showing summary
            businessTimezone={business.timezone}
          />
          <hr/>
          <BookingForm
            onSubmit={handleCustomerInfoSubmit}
            ref={bookingFormRef}
          />
          <div className="mt-6 p-4 bg-gray-50 rounded-md shadow">
            <button
              onClick={handlePaymentButtonClick}
              className="w-full px-6 py-3 bg-green-500 text-white font-semibold rounded-md hover:bg-green-600 transition-colors text-lg"
            >
              Pay ${selectedService.price} & Confirm Booking
            </button>
          </div>
          <div className="mt-6 flex justify-start">
            <button
              onClick={() => setBookingStep('selectTime')}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
            >
              Back to Time Selection
            </button>
          </div>
        </div>
      )}

      {bookingStep === 'confirmed' && bookingResponse && (
        <ConfirmationPage
            bookingDetails={bookingResponse}
            onBookAnother={handleBookAnother}
            businessTimezone={business.timezone}
        />
      )}
    </div>
  );
};

export const getStaticPaths: GetStaticPaths = async () => {
  return {
    paths: [{ params: { businessId: 'biz_123' } }],
    fallback: true,
  };
};

export const getStaticProps: GetStaticProps<BookingPageProps> = async (context) => {
  const { params } = context;
  const businessId = params?.businessId as string;

  if (businessId === 'biz_123') {
    return { props: { business: mockBusiness }, revalidate: 60 };
  }
  return { notFound: true };
};

export default BookingPage;
