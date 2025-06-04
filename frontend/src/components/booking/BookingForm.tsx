import React, { useState, forwardRef, useImperativeHandle, useCallback } from 'react';

export interface CustomerInfo {
  name: string;
  email: string;
  phone: string;
}

interface BookingFormProps {
  onSubmit: (customerInfo: CustomerInfo) => void;
}

export interface BookingFormHandles {
  triggerSubmit: () => boolean; // Returns true if validation passes, false otherwise
}

const BookingForm: React.ForwardRefRenderFunction<BookingFormHandles, BookingFormProps> = (
  props,
  ref
) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState<Partial<CustomerInfo>>({});

  const validate = useCallback((): boolean => {
    const newErrors: Partial<CustomerInfo> = {};
    if (!name.trim()) newErrors.name = 'Name is required';
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email is invalid';
    }
    if (!phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\+?[0-9\s\-()]{7,20}$/.test(phone)) {
      newErrors.phone = 'Phone number is invalid';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [name, email, phone]);

  const handleSubmit = useCallback((event?: React.FormEvent): boolean => {
    if (event) {
      event.preventDefault();
    }
    if (validate()) {
      props.onSubmit({ name, email, phone });
      return true;
    }
    return false;
  }, [validate, props, name, email, phone]);

  useImperativeHandle(ref, () => ({
    triggerSubmit: handleSubmit
  }), [handleSubmit]);

  const inputClass = "mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm";
  const labelClass = "block text-sm font-medium text-gray-700";
  const errorClass = "mt-1 text-xs text-red-500";

  return (
    // The form tag is still useful for semantics and accessibility, though submission is triggered via ref.
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-white shadow-sm rounded-lg">
      <div>
        <label htmlFor="name" className={labelClass}>Full Name:</label>
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={`${inputClass} ${errors.name ? 'border-red-500' : ''}`}
          aria-describedby="name-error"
        />
        {errors.name && <p id="name-error" className={errorClass}>{errors.name}</p>}
      </div>
      <div>
        <label htmlFor="email" className={labelClass}>Email Address:</label>
        <input
          type="email"
          id="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={`${inputClass} ${errors.email ? 'border-red-500' : ''}`}
          aria-describedby="email-error"
        />
        {errors.email && <p id="email-error" className={errorClass}>{errors.email}</p>}
      </div>
      <div>
        <label htmlFor="phone" className={labelClass}>Phone Number:</label>
        <input
          type="tel"
          id="phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className={`${inputClass} ${errors.phone ? 'border-red-500' : ''}`}
          aria-describedby="phone-error"
        />
        {errors.phone && <p id="phone-error" className={errorClass}>{errors.phone}</p>}
      </div>
    </form>
  );
};

export default forwardRef(BookingForm);
