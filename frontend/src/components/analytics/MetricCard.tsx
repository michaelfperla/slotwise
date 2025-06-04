import React from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  description?: string; // Optional description or comparison
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, description }) => {
  return (
    <div className="bg-white shadow-lg rounded-lg p-6 transition-all hover:shadow-xl">
      <h3 className="text-lg font-semibold text-gray-600 mb-1">{title}</h3>
      <p className="text-3xl font-bold text-gray-900 mb-2">{value}</p>
      {description && (
        <p className="text-sm text-gray-500">{description}</p>
      )}
    </div>
  );
};

export default MetricCard;
