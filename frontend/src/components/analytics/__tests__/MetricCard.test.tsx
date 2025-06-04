import React from 'react';
import { render, screen } from '@testing-library/react';
import MetricCard from '../MetricCard'; // Adjust path as needed

describe('MetricCard Component', () => {
  it('should render title and value correctly', () => {
    const title = 'Total Revenue';
    const value = '$15,000';
    render(<MetricCard title={title} value={value} />);

    expect(screen.getByText(title)).toBeInTheDocument();
    expect(screen.getByText(value)).toBeInTheDocument();
  });

  it('should render numeric value correctly', () => {
    const title = 'Total Bookings';
    const value = 1250;
    render(<MetricCard title={title} value={value} />);

    expect(screen.getByText(title)).toBeInTheDocument();
    expect(screen.getByText(value.toString())).toBeInTheDocument();
  });

  it('should render description if provided', () => {
    const title = 'Conversion Rate';
    const value = '15%';
    const description = 'Last 30 days';
    render(<MetricCard title={title} value={value} description={description} />);

    expect(screen.getByText(title)).toBeInTheDocument();
    expect(screen.getByText(value)).toBeInTheDocument();
    expect(screen.getByText(description)).toBeInTheDocument();
  });

  it('should not render description if not provided', () => {
    const title = 'Avg. Booking Value';
    const value = '$60';
    render(<MetricCard title={title} value={value} />);

    // Check that no <p> element for description is rendered.
    // The value is in a <p>, title in <h3>.
    // If description is present, it's another <p>.
    // We can count the <p> elements or use queryByText.
    expect(screen.queryByText('Last 30 days')).not.toBeInTheDocument(); // Assuming 'Last 30 days' is a typical description

    // More robust: Check that only one <p> (for value) exists if no description
    // This depends on the exact HTML structure. The current MetricCard has:
    // <div><h3>title</h3><p>value</p>{description && <p>description</p>}</div>
    const valueParagraph = screen.getByText(value.toString()).tagName.toLowerCase();
    expect(valueParagraph).toBe('p');

    // Check if there's any other <p> element that is not the value.
    // This is a bit tricky. A simpler way is to ensure no non-value <p> exists.
    // Or, if we know a specific description text won't be there, like above.
    // The current test with queryByText for a non-existent description is sufficient.
  });
});
