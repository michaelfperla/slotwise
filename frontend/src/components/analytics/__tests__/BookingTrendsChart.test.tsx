import React from 'react';
import { render, screen } from '@testing-library/react';
import BookingTrendsChart from '../BookingTrendsChart'; // Adjust path as needed
import { TrendsDataPoint } from '@/utils/analytics'; // Import type

describe('BookingTrendsChart Component', () => {
  const mockData: TrendsDataPoint[] = [
    { date: '2024-01-01', bookings: 10, revenue: 1000 },
    { date: '2024-01-02', bookings: 15, revenue: 1500 },
    { date: '2024-01-03', bookings: 8, revenue: 800 },
    { date: '2024-01-04', bookings: 12, revenue: 1200 },
    { date: '2024-01-05', bookings: 20, revenue: 2000 },
    { date: '2024-01-06', bookings: 18, revenue: 1800 },
  ];

  it('should render the chart title', () => {
    render(<BookingTrendsChart data={mockData} chartTitle="Test Trends" />);
    expect(screen.getByText('Test Trends')).toBeInTheDocument();
  });

  it('should render default title if none provided', () => {
    render(<BookingTrendsChart data={mockData} />);
    expect(screen.getByText('Booking Trends')).toBeInTheDocument(); // Default title
  });

  it('should render the placeholder message when chart is present', () => {
    render(<BookingTrendsChart data={mockData} />);
    expect(screen.getByText(`[Chart Placeholder: Displaying ${mockData.length} data points]`)).toBeInTheDocument();
  });

  it('should display "No data available" if data is empty or undefined', () => {
    render(<BookingTrendsChart data={[]} />);
    expect(screen.getByText('No data available to display chart.')).toBeInTheDocument();

    // Test with undefined data (though TypeScript might prevent this if props are mandatory)
    // If data prop is optional: render(<BookingTrendsChart data={undefined} />);
    // expect(screen.getByText('No data available to display chart.')).toBeInTheDocument();
  });

  it('should render a table with a sample of data (last 5 points)', () => {
    render(<BookingTrendsChart data={mockData} />);

    // Check for table headers
    expect(screen.getByText('Date')).toBeInTheDocument();
    expect(screen.getByText('Bookings')).toBeInTheDocument();
    expect(screen.getByText('Revenue')).toBeInTheDocument();

    // Check for data from the last 5 points (mockData has 6 points)
    // The component slices the last 5.
    const displayedData = mockData.slice(-5);

    displayedData.forEach(item => {
      expect(screen.getByText(item.date)).toBeInTheDocument();
      expect(screen.getByText(item.bookings.toString())).toBeInTheDocument();
      // Revenue is formatted as $XXX.YY
      expect(screen.getByText(`$${item.revenue.toFixed(2)}`)).toBeInTheDocument();
    });

    // Ensure that the first data point (which is not in the last 5) is NOT in the table
    expect(screen.queryByText(mockData[0].date)).not.toBeInTheDocument();
    //This check assumes the table only shows the last 5 for mockData.length > 5

    // Check for the note about showing subset of data
    expect(screen.getByText(`Showing last 5 of ${mockData.length} data points in table.`)).toBeInTheDocument();
  });

  it('should render table without subset note if data length is <= 5', () => {
    const shortData = mockData.slice(0, 3);
    render(<BookingTrendsChart data={shortData} />);

    shortData.forEach(item => {
      expect(screen.getByText(item.date)).toBeInTheDocument();
    });
    expect(screen.queryByText(/Showing last \d+ of \d+ data points in table./)).not.toBeInTheDocument();
  });
});
