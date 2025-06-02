"use client";

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';

interface ServiceDetails { // Simplified, fetch actual details if needed
  id: string;
  name: string;
  duration: number; // minutes
  price: number;
  // Add other relevant service fields
}

interface TimeSlot { // Matches what Scheduling Service returns
  startTime: string; // ISO string
  endTime: string;   // ISO string
}

export default function BookServicePage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams(); // To get businessId from query
  
  const serviceId = params.serviceId as string;
  const businessId = searchParams.get('businessId'); // Crucial query param

  const [serviceDetails, setServiceDetails] = useState<ServiceDetails | null>(null); // For displaying service info
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [isLoadingService, setIsLoadingService] = useState(true);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch Service Details (conceptual - might come from Business Service or a dedicated endpoint)
  useEffect(() => {
    if (!serviceId || !businessId) { // Ensure businessId is present
        if (!businessId) setError("Business ID is missing from the URL query parameters.");
        setIsLoadingService(false);
        return;
    }
    setIsLoadingService(true);
    // This is a conceptual fetch. In a real app, you'd fetch this from Business Service.
    // GET /api/v1/services/:serviceId (Business Service, needs auth if not public)
    // OR, if service details are simple enough and can be passed via props/state from previous page.
    // For this example, we'll mock it or assume it's passed, as primary focus is slot fetching.
    // For now, let's simulate fetching service details (name, duration for display).
    // In a real app, this would be an API call to business-service.
    // This example assumes that business-service /api/v1/services/:id is accessible
    // and may or may not require auth depending on its setup.
    const fetchServiceDetails = async () => {
        try {
            const token = localStorage.getItem('authToken'); // Assuming token might be needed
            const response = await fetch(`/api/v1/services/${serviceId}`, { // Business service endpoint
                 headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });
            if (!response.ok) throw new Error("Failed to fetch service details.");
            const result = await response.json();
            if (result.success && result.data.businessId === businessId) { // Ensure service belongs to the business in query
                 setServiceDetails(result.data);
            } else {
                throw new Error(result.message || "Service not found or does not belong to this business.");
            }
        } catch (e: any) {
            setError("Error fetching service details: " + e.message);
            setServiceDetails(null); // Clear any stale details
        } finally {
            setIsLoadingService(false);
        }
    };
    fetchServiceDetails();
  }, [serviceId, businessId]);


  // Fetch Available Slots when date, serviceId, or businessId changes
  useEffect(() => {
    if (!selectedDate || !serviceId || !businessId) {
      setAvailableSlots([]);
      return;
    }
    
    setIsLoadingSlots(true);
    setError(null);
    setAvailableSlots([]); // Clear previous slots
    setSelectedSlot(null); // Clear selected slot

    // Call Scheduling Service: GET /api/v1/services/:serviceId/slots?date=...&businessId=...
    fetch(`/api/v1/services/${serviceId}/slots?date=${selectedDate}&businessId=${businessId}`) // Scheduling service endpoint
      .then(async res => {
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ message: `Failed to fetch slots: ${res.statusText}` }));
          throw new Error(errorData.message || "Server error fetching slots.");
        }
        return res.json();
      })
      .then(data => {
        if (data.slots && data.slots.length > 0) {
            setAvailableSlots(data.slots);
        } else {
            setAvailableSlots([]); // Ensure it's an empty array if no slots
        }
      })
      .catch(err => {
        setError(err.message);
        setAvailableSlots([]);
      })
      .finally(() => setIsLoadingSlots(false));
  }, [selectedDate, serviceId, businessId]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
  };

  const handleSlotSelection = (slot: TimeSlot) => {
    setSelectedSlot(slot);
  };

  const handleProceedToConfirmation = () => {
    if (!selectedSlot || !serviceDetails || !businessId) {
      alert("Please select a time slot and ensure service details are loaded.");
      return;
    }
    // Navigate to confirmation page with all necessary details
    // Using query parameters for simplicity. State management (Zustand, Redux) is better for complex objects.
    router.push(`/booking/confirm?serviceId=${serviceId}&serviceName=${encodeURIComponent(serviceDetails.name)}&businessId=${businessId}&startTime=${encodeURIComponent(selectedSlot.startTime)}&endTime=${encodeURIComponent(selectedSlot.endTime)}&price=${serviceDetails.price}`);
  };
  
  const today = useMemo(() => new Date().toISOString().split('T')[0], []);


  if (isLoadingService) return <p>Loading service details...</p>;
  if (!businessId && !error) return <p style={{color: 'red'}}>Business ID is required in URL query parameters (e.g., ?businessId=...).</p>;
  if (!serviceDetails && !error) return <p style={{color: 'red'}}>Service details could not be loaded. Ensure the service ID and business ID are correct.</p>;


  return (
    <div style={{ maxWidth: '700px', margin: 'auto', padding: '20px' }}>
      <h1>Book Service: {serviceDetails?.name || 'Service'}</h1>
      {serviceDetails && <p>Duration: {serviceDetails.duration} minutes. Price: ${serviceDetails.price}</p>}
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}

      <div>
        <label htmlFor="booking-date" style={{ marginRight: '10px' }}>Select Date:</label>
        <input
          type="date"
          id="booking-date"
          value={selectedDate}
          min={today} // Prevent selecting past dates
          onChange={handleDateChange}
          style={{ padding: '8px', marginRight: '20px' }}
        />
      </div>

      <h2 style={{ marginTop: '30px' }}>Available Slots for {selectedDate}:</h2>
      {isLoadingSlots && <p>Loading slots...</p>}
      {!isLoadingSlots && availableSlots.length === 0 && <p>No slots available for this date. Please try another date.</p>}
      
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '10px' }}>
        {availableSlots.map((slot, index) => (
          <button
            key={index}
            onClick={() => handleSlotSelection(slot)}
            style={{
              padding: '10px 15px',
              border: selectedSlot?.startTime === slot.startTime ? '2px solid #0070f3' : '1px solid #ccc',
              borderRadius: '5px',
              cursor: 'pointer',
              backgroundColor: selectedSlot?.startTime === slot.startTime ? '#e0efff' : 'white',
            }}
          >
            {new Date(slot.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
            {' - '}
            {new Date(slot.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
          </button>
        ))}
      </div>

      {selectedSlot && (
        <div style={{ marginTop: '30px', padding: '15px', backgroundColor: '#f0f0f0', borderRadius: '5px' }}>
          <h3>You selected:</h3>
          <p>Date: {selectedDate}</p>
          <p>Time: {new Date(selectedSlot.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })} - {new Date(selectedSlot.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}</p>
          <button onClick={handleProceedToConfirmation} style={{ padding: '10px 20px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', marginTop: '10px' }}>
            Proceed to Confirmation
          </button>
        </div>
      )}
       <button onClick={() => router.back()} style={{ marginTop: '20px', padding: '10px 15px' }}>
         Back
       </button>
    </div>
  );
}
