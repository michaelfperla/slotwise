'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// Zod-like schema for client-side validation (optional, but good practice)
// For simplicity, direct validation in handler for now.
// Based on createServiceSchema from business-service/src/routes/service.ts
interface NewServiceData {
  name: string;
  description?: string;
  duration: number; // minutes
  price: number;
  currency?: string;
  isActive?: boolean;
  // Add other fields like category, maxAdvanceBookingDays, minAdvanceBookingHours if needed
}

export default function NewServicePage() {
  const router = useRouter();
  const [formData, setFormData] = useState<NewServiceData>({
    name: '',
    description: '',
    duration: 30, // Default duration
    price: 0,
    currency: 'USD',
    isActive: true,
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;

    let processedValue: string | number | boolean = value;
    if (type === 'checkbox') {
      processedValue = (e.target as HTMLInputElement).checked;
    } else if (type === 'number') {
      processedValue = value === '' ? '' : Number(value); // Allow empty string for number inputs initially
    }

    setFormData(prev => ({ ...prev, [name]: processedValue }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Basic Validation
    if (!formData.name.trim()) {
      setError('Service name is required.');
      return;
    }
    if (formData.duration <= 0) {
      setError('Duration must be a positive number.');
      return;
    }
    if (formData.price < 0) {
      setError('Price cannot be negative.');
      return;
    }
    if (formData.currency && formData.currency.length !== 3) {
      setError('Currency code must be 3 characters (e.g., USD).');
      return;
    }

    setIsSubmitting(true);
    const token = localStorage.getItem('authToken');
    if (!token) {
      setError('Authentication token not found. Please login again.');
      setIsSubmitting(false);
      router.push('/login');
      return;
    }

    try {
      const response = await fetch('/api/v1/services', {
        // Business Service POST endpoint
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          price: Number(formData.price), // Ensure price is number
          duration: Number(formData.duration), // Ensure duration is number
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to create service: ${response.statusText}`);
      }

      // On success
      alert('Service created successfully!');
      router.push('/business/dashboard/services'); // Redirect back to services list
      // Optionally, invalidate TanStack Query cache for services list here
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === 'string'
            ? err
            : 'An unexpected error occurred.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: 'auto', padding: '20px' }}>
      <h1>Add New Service</h1>
      <form
        onSubmit={handleSubmit}
        style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}
      >
        <div>
          <label htmlFor="name" style={labelStyle}>
            Service Name:
          </label>
          <input
            type="text"
            name="name"
            id="name"
            value={formData.name}
            onChange={handleChange}
            required
            style={inputStyle}
          />
        </div>
        <div>
          <label htmlFor="description" style={labelStyle}>
            Description (Optional):
          </label>
          <textarea
            name="description"
            id="description"
            value={formData.description}
            onChange={handleChange}
            style={{ ...inputStyle, height: '80px' }}
          />
        </div>
        <div>
          <label htmlFor="duration" style={labelStyle}>
            Duration (minutes):
          </label>
          <input
            type="number"
            name="duration"
            id="duration"
            value={formData.duration}
            onChange={handleChange}
            required
            min="1"
            style={inputStyle}
          />
        </div>
        <div>
          <label htmlFor="price" style={labelStyle}>
            Price:
          </label>
          <input
            type="number"
            name="price"
            id="price"
            value={formData.price}
            onChange={handleChange}
            required
            min="0"
            step="0.01"
            style={inputStyle}
          />
        </div>
        <div>
          <label htmlFor="currency" style={labelStyle}>
            Currency (e.g., USD):
          </label>
          <input
            type="text"
            name="currency"
            id="currency"
            value={formData.currency}
            onChange={handleChange}
            maxLength={3}
            style={inputStyle}
          />
        </div>
        <div>
          <label htmlFor="isActive" style={labelStyle}>
            <input
              type="checkbox"
              name="isActive"
              id="isActive"
              checked={formData.isActive}
              onChange={handleChange}
              style={{ marginRight: '5px' }}
            />
            Service is Active
          </label>
        </div>

        {error && <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>}

        <div
          style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}
        >
          <button
            type="button"
            onClick={() => router.back()}
            disabled={isSubmitting}
            style={{ ...buttonStyle, backgroundColor: '#ccc' }}
          >
            Cancel
          </button>
          <button type="submit" disabled={isSubmitting} style={buttonStyle}>
            {isSubmitting ? 'Creating...' : 'Create Service'}
          </button>
        </div>
      </form>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: '5px',
  fontWeight: 'bold',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px',
  border: '1px solid #ddd',
  borderRadius: '4px',
  boxSizing: 'border-box',
};

const buttonStyle: React.CSSProperties = {
  padding: '10px 20px',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  backgroundColor: '#0070f3',
  color: 'white',
  fontWeight: 'bold',
};
