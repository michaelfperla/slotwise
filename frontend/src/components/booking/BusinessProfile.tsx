interface BusinessProfileProps {
  business: {
    name: string;
    description: string;
  };
}

const BusinessProfile: React.FC<BusinessProfileProps> = ({ business }) => {
  if (!business) {
    return <div className="p-4 text-center text-gray-500">Loading business information...</div>;
  }
  return (
    <div className="p-4 md:p-6 text-center">
      <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">{business.name}</h1>
      <p className="text-md md:text-lg text-gray-600">{business.description}</p>
    </div>
  );
};

export default BusinessProfile;
