"use client";

import React from 'react';
import useAuth from '@/hooks/useAuth'; // Assuming @ path alias

const DashboardPage: React.FC = () => {
  const { user } = useAuth(); // Optionally use user data

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Welcome to your Dashboard</h1>
      {user && (
        <div>
          <p>Hello, {user.email}!</p>
          {/* Display other user information if available in the token */}
        </div>
      )}
      <p>This is your protected dashboard area.</p>
      {/* Add more dashboard content here */}
    </div>
  );
};

export default DashboardPage;
