'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter, useParams } from 'next/navigation';

interface ServiceData {
  id: string;
  name: string;
  description?: string;
  duration: number;
  price: number;
  currency?: string;
  isActive?: boolean;
  // Add other fields as necessary
}

export default function EditServicePage() {
  const router = useRouter();
  const params = useParams();
  const serviceId = params.serviceId as string;

  const [formData, setFormData] = useState<Partial<ServiceData>>({}); // Partial as it's loaded
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!serviceId) return;

    const token = localStorage.getItem('authToken');
    if (!token) {
      router.push('/login');
      return;
    }

    setIsLoading(true);
    fetch(`/api/v1/services/${serviceId}`, {
      // Business Service GET service by ID
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async res => {
        if (!res.ok) {
          const errorData = await res
            .json()
            .catch(() => ({ message: `Failed to fetch service: ${res.statusText}` }));
          throw new Error(errorData.message);
        }
        return res.json();
      })
      .then(result => {
        const service = result.data;
        // Ensure price is a number, Prisma Decimal can be string
        setFormData({ ...service, price: Number(service.price) });
      })
      .catch(err => setError(err.message))
      .finally(() => setIsLoading(false));
  }, [serviceId, router]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    let processedValue: string | number | boolean = value;

    if (type === 'checkbox') {
      processedValue = (e.target as HTMLInputElement).checked;
    } else if (type === 'number') {
      processedValue = value === '' ? '' : Number(value);
    }
    setFormData(prev => ({ ...prev, [name]: processedValue }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name?.trim()) {
      setError('Service name is required.');
      return;
    }
    if (formData.duration && formData.duration <= 0) {
      setError('Duration must be a positive number.');
      return;
    }
    if (formData.price && formData.price < 0) {
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
      // Should not happen if initial load worked, but good check
      router.push('/login');
      return;
    }

    // Prepare only changed data if your API supports PATCH, or send full object for PUT
    // For PUT, it's common to send the whole object.
    const payload = {
      ...formData,
      price: Number(formData.price), // Ensure price is number
      duration: Number(formData.duration), // Ensure duration is number
    };

    try {
      const response = await fetch(`/api/v1/services/${serviceId}`, {
        // Business Service PUT endpoint
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ message: `Failed to update service: ${response.statusText}` }));
        throw new Error(errorData.message);
      }
      alert('Service updated successfully!');
      router.push('/business/dashboard/services');
    } catch (err: unknown) {
      // Changed from any
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage || 'An unexpected error occurred while updating.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <p>Loading service data...</p>;
  if (error && !formData.name)
    return <p style={{ color: 'red' }}>Error loading service: {error}</p>; // Show critical error if form can't load

  return (
    <div style={{ maxWidth: '600px', margin: 'auto', padding: '20px' }}>
      <h1>Edit Service: {formData.name || 'Loading...'}</h1>
      {error && <p style={{ color: 'red', textAlign: 'center', marginBottom: '10px' }}>{error}</p>}
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
            value={formData.name || ''}
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
            value={formData.description || ''}
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
            value={formData.duration || 0}
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
            value={formData.price || 0}
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
            value={formData.currency || 'USD'}
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
              checked={formData.isActive === undefined ? true : formData.isActive}
              onChange={handleChange}
              style={{ marginRight: '5px' }}
            />
            Service is Active
          </label>
        </div>
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
          <button type="submit" disabled={isSubmitting || isLoading} style={buttonStyle}>
            {isSubmitting ? 'Saving...' : 'Save Changes'}
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
