/**
 * Service Management Component
 * 
 * This component provides a comprehensive interface for managing business services
 * including creation, editing, and deletion of services.
 */

'use client';

import React, { useState } from 'react';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Clock, 
  DollarSign,
  Eye,
  EyeOff,
  MoreHorizontal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { useBusiness, useCreateService, useUpdateService, useDeleteService } from '@/hooks/useBusinessQueries';
import { businessUtils } from '@/lib/services/businessApi';
import { CreateServiceRequest, Service } from '@/types/api';

interface ServiceFormData {
  name: string;
  description: string;
  duration: number;
  price: number;
  currency: string;
  category: string;
  isActive: boolean;
  maxAdvanceBookingDays: number;
  minAdvanceBookingHours: number;
  requiresApproval: boolean;
  allowOnlinePayment: boolean;
}

interface ServiceFormProps {
  service?: Service;
  businessId: string;
  onClose: () => void;
  onSuccess: () => void;
}

function ServiceForm({ service, businessId, onClose, onSuccess }: ServiceFormProps) {
  const [formData, setFormData] = useState<ServiceFormData>({
    name: service?.name || '',
    description: service?.description || '',
    duration: service?.duration || 60,
    price: service?.price ? service.price / 100 : 0, // Convert from cents
    currency: service?.currency || 'USD',
    category: service?.category || '',
    isActive: service?.isActive ?? true,
    maxAdvanceBookingDays: service?.maxAdvanceBookingDays || 30,
    minAdvanceBookingHours: service?.minAdvanceBookingHours || 24,
    requiresApproval: service?.requiresApproval || false,
    allowOnlinePayment: service?.allowOnlinePayment || true,
  });

  const createService = useCreateService();
  const updateService = useUpdateService();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const serviceData: CreateServiceRequest = {
        ...formData,
        businessId,
        price: Math.round(formData.price * 100), // Convert to cents
      };

      if (service) {
        await updateService.mutateAsync({ serviceId: service.id, updates: serviceData });
      } else {
        await createService.mutateAsync(serviceData);
      }
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to save service:', error);
    }
  };

  const isLoading = createService.isPending || updateService.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Service Name *
          </label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., 60-minute Consultation"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Category
          </label>
          <Input
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            placeholder="e.g., Consulting, Therapy"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          rows={3}
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Describe your service..."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Duration (minutes) *
          </label>
          <Input
            type="number"
            value={formData.duration}
            onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 0 })}
            min="15"
            max="480"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Price *
          </label>
          <Input
            type="number"
            step="0.01"
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
            min="0"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Currency
          </label>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={formData.currency}
            onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
          >
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
            <option value="CAD">CAD</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Max Advance Booking (days)
          </label>
          <Input
            type="number"
            value={formData.maxAdvanceBookingDays}
            onChange={(e) => setFormData({ ...formData, maxAdvanceBookingDays: parseInt(e.target.value) || 0 })}
            min="1"
            max="365"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Min Advance Booking (hours)
          </label>
          <Input
            type="number"
            value={formData.minAdvanceBookingHours}
            onChange={(e) => setFormData({ ...formData, minAdvanceBookingHours: parseInt(e.target.value) || 0 })}
            min="0"
            max="168"
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center">
          <input
            type="checkbox"
            id="isActive"
            checked={formData.isActive}
            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
          />
          <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
            Service is active and bookable
          </label>
        </div>
        
        <div className="flex items-center">
          <input
            type="checkbox"
            id="requiresApproval"
            checked={formData.requiresApproval}
            onChange={(e) => setFormData({ ...formData, requiresApproval: e.target.checked })}
            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
          />
          <label htmlFor="requiresApproval" className="ml-2 text-sm text-gray-700">
            Require manual approval for bookings
          </label>
        </div>
        
        <div className="flex items-center">
          <input
            type="checkbox"
            id="allowOnlinePayment"
            checked={formData.allowOnlinePayment}
            onChange={(e) => setFormData({ ...formData, allowOnlinePayment: e.target.checked })}
            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
          />
          <label htmlFor="allowOnlinePayment" className="ml-2 text-sm text-gray-700">
            Allow online payment
          </label>
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : service ? 'Update Service' : 'Create Service'}
        </Button>
      </div>
    </form>
  );
}

interface ServiceCardProps {
  service: Service;
  onEdit: (service: Service) => void;
  onDelete: (service: Service) => void;
}

function ServiceCard({ service, onEdit, onDelete }: ServiceCardProps) {
  const [showActions, setShowActions] = useState(false);

  return (
    <Card className="p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <h3 className="text-lg font-semibold text-gray-900">{service.name}</h3>
            <Badge variant={service.isActive ? 'default' : 'secondary'}>
              {service.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          
          {service.description && (
            <p className="text-gray-600 text-sm mb-3">{service.description}</p>
          )}
          
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-1" />
              {businessUtils.formatDuration(service.duration)}
            </div>
            <div className="flex items-center">
              <DollarSign className="h-4 w-4 mr-1" />
              {businessUtils.formatCurrency(service.price, service.currency)}
            </div>
          </div>
          
          {service.category && (
            <div className="mt-2">
              <Badge variant="outline">{service.category}</Badge>
            </div>
          )}
        </div>
        
        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowActions(!showActions)}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
          
          {showActions && (
            <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-10">
              <div className="py-1">
                <button
                  onClick={() => {
                    onEdit(service);
                    setShowActions(false);
                  }}
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Service
                </button>
                <button
                  onClick={() => {
                    onDelete(service);
                    setShowActions(false);
                  }}
                  className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Service
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

export function ServiceManagement() {
  const { business, services, isServicesLoading } = useBusiness();
  const deleteService = useDeleteService();
  const [showForm, setShowForm] = useState(false);
  const [editingService, setEditingService] = useState<Service | undefined>();

  const handleEdit = (service: Service) => {
    setEditingService(service);
    setShowForm(true);
  };

  const handleDelete = async (service: Service) => {
    if (window.confirm(`Are you sure you want to delete "${service.name}"?`)) {
      try {
        await deleteService.mutateAsync(service.id);
      } catch (error) {
        console.error('Failed to delete service:', error);
      }
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingService(undefined);
  };

  if (!business) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No business selected</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Services</h1>
          <p className="text-gray-600 mt-1">
            Manage the services your business offers
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Service
        </Button>
      </div>

      {/* Services Grid */}
      {isServicesLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/4"></div>
            </Card>
          ))}
        </div>
      ) : services?.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No services yet</h3>
          <p className="text-gray-600 mb-4">
            Create your first service to start accepting bookings
          </p>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create First Service
          </Button>
        </Card>
      )}

      {/* Service Form Modal */}
      <Modal
        isOpen={showForm}
        onClose={handleCloseForm}
        title={editingService ? 'Edit Service' : 'Create New Service'}
        size="lg"
      >
        <ServiceForm
          service={editingService}
          businessId={business.id}
          onClose={handleCloseForm}
          onSuccess={() => {
            // Refresh will happen automatically via React Query
          }}
        />
      </Modal>
    </div>
  );
}

export default ServiceManagement;
