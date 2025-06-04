interface Service {
  id: string;
  name: string;
  description: string;
  duration: number;
  price: number;
  currency: string;
}

interface ServiceSelectionProps {
  services: Service[];
  onSelectService: (service: Service) => void;
}

const ServiceSelection: React.FC<ServiceSelectionProps> = ({ services, onSelectService }) => {
  if (!services || services.length === 0) {
    return <div className="p-4 text-center text-gray-500">No services available.</div>;
  }

  return (
    <div className="space-y-4">
      {services.map((service) => (
        <div
          key={service.id}
          className="p-4 border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow bg-white"
        >
          <div className="flex flex-col sm:flex-row justify-between sm:items-center">
            <div>
              <h3 className="text-xl font-semibold text-gray-700">{service.name}</h3>
              <p className="text-sm text-gray-500 mt-1 mb-2 sm:mb-0">{service.description}</p>
            </div>
            <button
              onClick={() => onSelectService(service)}
              className="mt-2 sm:mt-0 sm:ml-4 px-4 py-2 bg-blue-500 text-white font-medium rounded-md hover:bg-blue-600 transition-colors self-start sm:self-center whitespace-nowrap"
            >
              Select
            </button>
          </div>
          <div className="mt-2 pt-2 border-t border-gray-100 text-sm text-gray-600">
            <span>Duration: {service.duration} minutes</span>
            <span className="mx-2">|</span>
            <span>Price: ${service.price} {service.currency}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ServiceSelection;
