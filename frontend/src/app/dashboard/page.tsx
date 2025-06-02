"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null); // Assuming token might contain email or user info

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      router.push('/login');
    } else {
      // Optional: Decode token to get user info (client-side decoding is not secure for verification)
      // For MVP, we can just assume if token exists, user is "logged in"
      // In a real app, you'd verify the token with the backend or use a client-side library to decode it for display purposes
      try {
        const payload = JSON.parse(atob(token.split('.')[1])); // Decode JWT payload
        setUserEmail(payload.email || 'User'); // Adjust 'email' if your JWT payload uses a different key
      } catch (e) {
        console.error("Failed to parse token:", e);
        // If token is malformed, treat as unauthenticated
        localStorage.removeItem('authToken');
        router.push('/login');
      }
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    router.push('/login');
  };

  if (!userEmail) {
    // This state will be brief as useEffect redirects, or could show a loader
    return <p>Loading...</p>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>User Dashboard</h1>
      <p>Welcome, {userEmail}!</p>
      <p>This is your personal dashboard. More features coming soon.</p>
      <button 
        onClick={handleLogout} 
        style={{ marginTop: '20px', padding: '10px', backgroundColor: 'red', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
      >
        Logout
      </button>
    </div>
  );
}
