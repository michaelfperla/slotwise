import React from 'react';

// Matches the structure in analytics.ts
interface TrendsDataPoint {
  date: string;
  bookings: number;
  revenue: number;
}

interface BookingTrendsChartProps {
  data: TrendsDataPoint[];
  chartTitle?: string;
  // We could add more props for customization, e.g., which key to plot (bookings vs revenue)
}

const BookingTrendsChart: React.FC<BookingTrendsChartProps> = ({ data, chartTitle = "Booking Trends" }) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white shadow-lg rounded-lg p-6 text-center text-gray-500">
        No data available to display chart.
      </div>
    );
  }

  // Placeholder for actual chart implementation
  // In a real scenario, you'd use a library like Recharts, Chart.js, or Victory here.
  // For example, with Recharts:
  // import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
  // <ResponsiveContainer width="100%" height={300}>
  //   <LineChart data={data}>
  //     <CartesianGrid strokeDasharray="3 3" />
  //     <XAxis dataKey="date" />
  //     <YAxis yAxisId="left" dataKey="bookings" />
  //     <YAxis yAxisId="right" orientation="right" dataKey="revenue" />
  //     <Tooltip />
  //     <Legend />
  //     <Line yAxisId="left" type="monotone" dataKey="bookings" stroke="#8884d8" activeDot={{ r: 8 }} />
  //     <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#82ca9d" />
  //   </LineChart>
  // </ResponsiveContainer>

  return (
    <div className="bg-white shadow-lg rounded-lg p-6">
      <h3 className="text-xl font-semibold text-gray-700 mb-4">{chartTitle}</h3>
      <div className="w-full h-64 flex items-center justify-center bg-gray-100 rounded">
        <p className="text-gray-500">
          [Chart Placeholder: Displaying {data.length} data points]
        </p>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bookings</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.slice(-5).map((item, index) => ( // Display last 5 points as a sample
              <tr key={index}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.date}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.bookings}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${item.revenue.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
         {data.length > 5 && <p className="text-xs text-gray-400 mt-1">Showing last 5 of {data.length} data points in table.</p>}
      </div>
    </div>
  );
};

export default BookingTrendsChart;
