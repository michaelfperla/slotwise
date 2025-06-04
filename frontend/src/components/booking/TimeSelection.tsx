import React, { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css'; // Default styling for react-calendar

interface Service {
  id: string;
  name: string;
  description: string;
  duration: number;
  price: number;
  currency: string;
}

interface TimeSlot {
  startTime: string;
  endTime: string;
}

interface TimeSelectionProps {
  selectedService: Service;
  onTimeSelect: (date: Date, slot: TimeSlot) => void;
  businessTimezone: string;
}

const mockAvailableSlots: TimeSlot[] = [
  { startTime: "2024-01-15T09:00:00Z", endTime: "2024-01-15T10:00:00Z" },
  { startTime: "2024-01-15T14:00:00Z", endTime: "2024-01-15T15:00:00Z" },
  { startTime: "2024-01-16T10:00:00Z", endTime: "2024-01-16T11:00:00Z" },
  { startTime: new Date().toISOString().split('T')[0] + "T11:00:00Z", endTime: new Date().toISOString().split('T')[0] + "T12:00:00Z" },
  { startTime: new Date().toISOString().split('T')[0] + "T15:00:00Z", endTime: new Date().toISOString().split('T')[0] + "T16:00:00Z" },
];

const TimeSelection: React.FC<TimeSelectionProps> = ({ selectedService, onTimeSelect, businessTimezone }) => {
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [currentSelectedSlot, setCurrentSelectedSlot] = useState<TimeSlot | null>(null);

  useEffect(() => {
    if (selectedDate) {
      const selectedDateISO = selectedDate.toISOString().split('T')[0];
      const filteredSlots = mockAvailableSlots.filter(slot =>
        slot.startTime.startsWith(selectedDateISO)
      );
      setAvailableSlots(filteredSlots);
      setCurrentSelectedSlot(null);
    } else {
      setAvailableSlots([]);
    }
  }, [selectedDate]);

  const handleDateChange = (value: any) => {
    if (value instanceof Date) {
      setSelectedDate(value);
    } else if (Array.isArray(value) && value[0] instanceof Date) {
      setSelectedDate(value[0]);
    } else {
        setSelectedDate(null);
    }
  };

  const handleSlotSelect = (slot: TimeSlot) => {
    setCurrentSelectedSlot(slot);
    if (selectedDate) {
      onTimeSelect(selectedDate, slot);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: businessTimezone, hour12: true });
  };

  return (
    <div className="space-y-6 p-4 bg-gray-50 rounded-lg shadow">
      <div className="p-4 border-b border-gray-200">
        <h4 className="text-lg font-medium text-gray-700">For: {selectedService.name}</h4>
        <p className="text-sm text-gray-600">Duration: {selectedService.duration} minutes</p>
        <p className="text-sm text-gray-600">Price: ${selectedService.price} {selectedService.currency}</p>
      </div>

      <div className="md:flex md:space-x-6 space-y-6 md:space-y-0">
        <div className="md:w-1/2 flex justify-center">
          {/* Ensure react-calendar's CSS is loaded. Custom styling can be complex.
              The container below helps with responsiveness and centering. */}
          <div className="react-calendar-container p-2 rounded-md shadow-sm bg-white">
            <Calendar
              onChange={handleDateChange}
              value={selectedDate}
              minDate={new Date()}
              className="border-none" // Attempt to remove default border if any, use container shadow
            />
          </div>
        </div>

        <div className="md:w-1/2">
          {selectedDate && (
            <div>
              <h4 className="text-md font-semibold text-gray-700 mb-3 text-center md:text-left">
                Available Slots for {selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}:
              </h4>
              {availableSlots.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {availableSlots.map((slot) => (
                    <button
                      key={slot.startTime}
                      onClick={() => handleSlotSelect(slot)}
                      className={`p-2 border rounded-md text-sm transition-colors
                        ${currentSelectedSlot?.startTime === slot.startTime
                          ? 'bg-blue-500 text-white ring-2 ring-blue-300'
                          : 'bg-white hover:bg-gray-100 text-blue-500 border-gray-300'}`}
                    >
                      {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center md:text-left">No available slots for this date.</p>
              )}
            </div>
          )}
        </div>
      </div>

      {currentSelectedSlot && selectedDate && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md text-center">
          <p className="font-semibold text-green-700">
            You selected: {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} at {formatTime(currentSelectedSlot.startTime)}
          </p>
        </div>
      )}
    </div>
  );
};

export default TimeSelection;
