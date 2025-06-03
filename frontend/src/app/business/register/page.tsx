'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function BusinessRegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [timezone, setTimezone] = useState('UTC'); // Default timezone
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

  // Removed useEffect for checking token, as this page is for new user + business registration.

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email || !password || !firstName || !lastName || !businessName) {
      setError('All fields (Email, Password, First Name, Last Name, Business Name) are required.');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Invalid email format.');
      return;
    }
    if (password.length < 6) {
      // Align with user registration password length
      setError('Password must be at least 6 characters long.');
      return;
    }

    try {
      const res = await fetch('http://localhost:8001/api/v1/auth/register', {
        // Updated endpoint
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          firstName,
          lastName,
          businessName,
          timezone, // Send timezone
          role: 'business_owner', // Specify the role for business owner
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSuccess(data.message || 'Business and user registration successful! Please login.');
        // Redirect to login page or show a message
        setTimeout(() => router.push('/login'), 3000);
      } else {
        const errorData = await res.json();
        setError(errorData.message || 'Registration failed. Please try again.');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again later.');
      console.error('Business registration error:', err);
    }
  };

  return (
    <div
      style={{
        maxWidth: '500px',
        margin: 'auto',
        marginTop: '50px',
        padding: '20px',
        border: '1px solid #ccc',
        borderRadius: '8px',
      }}
    >
      <h1>Register as a Business Owner</h1>
      <p>Create your user account and register your first business.</p>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="firstName" style={{ display: 'block', marginBottom: '5px' }}>
            Your First Name:
          </label>
          <input
            type="text"
            id="firstName"
            value={firstName}
            onChange={e => setFirstName(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
          />
        </div>
        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="lastName" style={{ display: 'block', marginBottom: '5px' }}>
            Your Last Name:
          </label>
          <input
            type="text"
            id="lastName"
            value={lastName}
            onChange={e => setLastName(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
          />
        </div>
        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="email" style={{ display: 'block', marginBottom: '5px' }}>
            Your Email:
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
          />
        </div>
        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="password" style={{ display: 'block', marginBottom: '5px' }}>
            Create Password:
          </label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={6}
            style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
          />
        </div>
        <hr style={{ margin: '20px 0' }} />
        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="businessName" style={{ display: 'block', marginBottom: '5px' }}>
            Business Name:
          </label>
          <input
            type="text"
            id="businessName"
            value={businessName}
            onChange={e => setBusinessName(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
          />
        </div>
        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="timezone" style={{ display: 'block', marginBottom: '5px' }}>
            Timezone:
          </label>
          <select
            id="timezone"
            value={timezone}
            onChange={e => setTimezone(e.target.value)}
            style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
          >
            {/* Add more timezones as needed */}
            <option value="UTC">UTC</option>
            <option value="America/New_York">America/New_York</option>
            <option value="America/Chicago">America/Chicago</option>
            <option value="America/Denver">America/Denver</option>
            <option value="America/Los_Angeles">America/Los_Angeles</option>
            <option value="Europe/London">Europe/London</option>
            <option value="Europe/Berlin">Europe/Berlin</option>
            <option value="Asia/Tokyo">Asia/Tokyo</option>
          </select>
        </div>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        {success && <p style={{ color: 'green' }}>{success}</p>}
        <button
          type="submit"
          style={{
            width: '100%',
            padding: '10px',
            backgroundColor: '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Register User and Business
        </button>
      </form>
      <p style={{ marginTop: '15px', textAlign: 'center' }}>
        Already have an account?{' '}
        <a href="/login" style={{ color: '#0070f3', textDecoration: 'none' }}>
          Login here
        </a>
      </p>
      <p style={{ marginTop: '10px', textAlign: 'center' }}>
        Just want a regular user account?{' '}
        <a href="/register" style={{ color: '#0070f3', textDecoration: 'none' }}>
          Register here
        </a>
      </p>
    </div>
  );
}
