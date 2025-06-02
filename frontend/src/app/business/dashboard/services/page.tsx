"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation'; // Corrected import

// Define interfaces for Service data (adjust based on actual API response)
interface Service {
  id: string;
  name: string;
  description?: string;
  duration: number; // minutes
  price: number; // Assuming number, adjust if Decimal/string
  currency: string;
  isActive?: boolean;
}

export default function ManageServicesPage() {
  const router = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // TODO: Replace with actual businessId from user context or props
  const businessId = "mock-business-id"; // Placeholder

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      router.push('/login');
      return;
    }

    // Fetch services for the business
    // The Business Service GET /api/v1/services endpoint can take a businessId query param,
    // or infers from user if not provided.
    // We need to ensure the logged-in user's businessId is used.
    // For now, this part is conceptual until user context provides businessId.
    // If your auth token contains businessId, decode it here.
    // Or, have a /api/v1/me/business endpoint in Auth/Business service.

    const fetchServices = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Assuming the list services endpoint might be /api/v1/services?businessId=<businessId>
        // Or if it's user-scoped: /api/v1/services
        // The current GET /api/v1/services in business-service uses request.user.id
        // and can also accept businessId query param.
        // For a business owner, it should list services for *their* business.
        // Let's assume the endpoint implicitly knows the user and their business.
        const response = await fetch(`/api/v1/services`, { // Business Service endpoint
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `Failed to fetch services: ${response.statusText}`);
        }
        const result = await response.json();
        setServices(result.data || []); // Assuming result.data is an array of services
      } catch (err: any) {
        setError(err.message || 'An unexpected error occurred.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchServices();
  }, [router, businessId]); // businessId dependency if used in fetch

  const handleAddService = () => {
    // TODO: Navigate to a new page or open a modal for adding a service
    router.push('/business/dashboard/services/new');
    console.log("Navigate to add new service page/modal");
  };

  const handleEditService = (serviceId: string) => {
    // TODO: Navigate to edit page or open modal
    router.push(`/business/dashboard/services/edit/${serviceId}`);
    console.log(`Edit service: ${serviceId}`);
  };

  const handleDeleteService = async (serviceId: string) => {
    // TODO: Implement delete functionality with confirmation
    console.log(`Delete service: ${serviceId}`);
    const token = localStorage.getItem('authToken');
    if (!window.confirm("Are you sure you want to delete this service?")) return;

    try {
        const response = await fetch(`/api/v1/services/${serviceId}`, { // Business Service endpoint
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
        if (response.ok) {
            setServices(prevServices => prevServices.filter(s => s.id !== serviceId));
            alert("Service deleted successfully");
        } else {
            const errorData = await response.json();
            alert(`Failed to delete service: ${errorData.message || response.statusText}`);
        }
    } catch (err: any) {
        alert(`Error deleting service: ${err.message}`);
    }
  };

  if (isLoading) return <p>Loading services...</p>;
  if (error) return <p style={{ color: 'red' }}>Error: {error}</p>;

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Manage Services</h1>
        <button onClick={handleAddService} style={{ padding: '10px 15px', backgroundColor: '#0070f3', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
          Add New Service
        </button>
      </div>

      {services.length === 0 ? (
        <p>No services found. Click &quot;Add New Service&quot; to get started.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={tableHeaderStyle}>Name</th>
              <th style={tableHeaderStyle}>Duration (min)</th>
              <th style={tableHeaderStyle}>Price</th>
              <th style={tableHeaderStyle}>Active</th>
              <th style={tableHeaderStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {services.map(service => (
              <tr key={service.id}>
                <td style={tableCellStyle}>{service.name}</td>
                <td style={tableCellStyle}>{service.duration}</td>
                <td style={tableCellStyle}>{service.price} {service.currency}</td>
                <td style={tableCellStyle}>{service.isActive ? 'Yes' : 'No'}</td>
                <td style={tableCellStyle}>
                  <button onClick={() => handleEditService(service.id)} style={{ marginRight: '5px', ...actionButtonStyle }}>Edit</button>
                  <button onClick={() => handleDeleteService(service.id)} style={{ ...actionButtonStyle, backgroundColor: 'red' }}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
       <button onClick={() => router.back()} style={{ marginTop: '20px', padding: '10px 15px' }}>
         Back to Business Dashboard
       </button>
    </div>
  );
}

const tableHeaderStyle: React.CSSProperties = {
  borderBottom: '2px solid #ddd',
  padding: '10px',
  textAlign: 'left',
  backgroundColor: '#f9f9f9',
};

const tableCellStyle: React.CSSProperties = {
  borderBottom: '1px solid #eee',
  padding: '10px',
  textAlign: 'left',
};

const actionButtonStyle: React.CSSProperties = {
  padding: '5px 10px',
  border: 'none',
  borderRadius: '3px',
  cursor: 'pointer',
  backgroundColor: '#0070f3',
  color: 'white',
};
