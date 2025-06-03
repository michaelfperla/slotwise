'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

// Matches Prisma DayOfWeek enum and payload structure
enum DayOfWeek {
  SUNDAY = 'SUNDAY',
  MONDAY = 'MONDAY',
  TUESDAY = 'TUESDAY',
  WEDNESDAY = 'WEDNESDAY',
  THURSDAY = 'THURSDAY',
  FRIDAY = 'FRIDAY',
  SATURDAY = 'SATURDAY',
}

interface AvailabilityRule {
  id?: string; // Optional if new, present if fetched
  dayOfWeek: DayOfWeek;
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
}

export default function ManageAvailabilityPage() {
  const router = useRouter();
  const [rules, setRules] = useState<AvailabilityRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state for adding/editing a rule (could be a separate modal)
  const [currentRule, setCurrentRule] = useState<Partial<AvailabilityRule>>({
    dayOfWeek: DayOfWeek.MONDAY,
    startTime: '09:00',
    endTime: '17:00',
  });
  const [isEditing, setIsEditing] = useState<string | null>(null); // Stores ID of rule being edited or null for new

  // TODO: Replace with actual businessId from user context, JWT, or props
  // This is critical and needs to be obtained from the authenticated user's session/context
  const [businessId, setBusinessId] = useState<string | null>(null);

  useEffect(() => {
    // Simulate fetching businessId from JWT or context after login
    // In a real app, this would come from a global state/context or decoded JWT
    const fetchBusinessContext = async () => {
      const token = localStorage.getItem('authToken');
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          if (payload.businessId) {
            // Assuming businessId is in JWT after owner login/registration
            setBusinessId(payload.businessId);
          } else {
            // Fallback or fetch from a /me/business endpoint
            setError(
              'Business ID not found in token. Please ensure you are logged in as a business owner.'
            );
            setIsLoading(false);
          }
        } catch {
          setError('Failed to parse auth token.');
          setIsLoading(false);
        }
      } else {
        router.push('/login');
      }
    };
    fetchBusinessContext();
  }, [router]); // router is stable, this runs once effectively to get businessId

  useEffect(() => {
    if (!businessId) {
      // Don't fetch if businessId isn't set
      if (!isLoading && !error && !businessId) {
        // Check businessId again before setting error
        setError('Business context not loaded.');
      }
      return;
    }

    const token = localStorage.getItem('authToken');
    // Token presence already checked by businessId effect, but good for direct access attempts
    if (!token) {
      router.push('/login');
      return;
    }

    setIsLoading(true);
    fetch(`/api/v1/businesses/${businessId}/availability`, {
      // Business Service GET endpoint
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async res => {
        if (!res.ok) {
          const errorData = await res
            .json()
            .catch(() => ({ message: `Failed to fetch availability: ${res.statusText}` }));
          throw new Error(errorData.message);
        }
        return res.json();
      })
      .then(result => {
        setRules(result.data || []);
      })
      .catch(err => setError(err.message))
      .finally(() => setIsLoading(false));
  }, [businessId, router, isLoading, error]); // Added isLoading, error

  const handleRuleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setCurrentRule(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleAddOrUpdateRule = (e: FormEvent) => {
    e.preventDefault();
    if (!currentRule.dayOfWeek || !currentRule.startTime || !currentRule.endTime) {
      alert('All fields for the rule are required.');
      return;
    }
    if (currentRule.startTime >= currentRule.endTime) {
      alert('Start time must be before end time.');
      return;
    }

    let updatedRules;
    if (isEditing !== null) {
      // Updating existing rule (identified by a temporary client-side ID or index)
      updatedRules = rules.map((rule, index) =>
        index.toString() === isEditing ? ({ ...rule, ...currentRule } as AvailabilityRule) : rule
      );
    } else {
      // Adding new rule
      updatedRules = [...rules, { ...currentRule, id: `temp-${Date.now()}` } as AvailabilityRule];
    }
    setRules(updatedRules);
    setCurrentRule({ dayOfWeek: DayOfWeek.MONDAY, startTime: '09:00', endTime: '17:00' }); // Reset form
    setIsEditing(null);
    // Note: This is client-side only. 'Save All Changes' will persist to backend.
  };

  const handleEditRule = (index: number) => {
    const ruleToEdit = rules[index];
    setCurrentRule(ruleToEdit);
    setIsEditing(index.toString()); // Use index as temporary ID for editing
  };

  const handleDeleteRule = (indexToDelete: number) => {
    if (!window.confirm('Are you sure you want to delete this rule?')) return;
    setRules(rules.filter((_, index) => index !== indexToDelete));
    // Note: This is client-side only. 'Save All Changes' will persist to backend.
  };

  const handleSaveAllAvailability = async () => {
    if (!businessId) {
      setError('Business ID not available to save availability.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    const token = localStorage.getItem('authToken');

    try {
      const payload = {
        rules: rules.map(rule => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { id, ...ruleWithoutId } = rule;
          return ruleWithoutId;
        }), // Remove id from payload
      };
      const response = await fetch(`/api/v1/businesses/${businessId}/availability`, {
        // Business Service POST endpoint
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ message: `Failed to save availability: ${response.statusText}` }));
        throw new Error(errorData.message);
      }
      const result = await response.json();
      setRules(result.data || []); // Update with data from server (e.g., with proper IDs)
      alert('Availability saved successfully!');
    } catch (err: unknown) {
      // Changed from any to unknown
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage || 'An unexpected error occurred while saving.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!businessId && !error && isLoading) return <p>Loading business context...</p>;
  if (error) return <p style={{ color: 'red' }}>Error: {error}</p>;

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: 'auto' }}>
      <h1>Manage Availability</h1>
      <p>
        Define your working hours. All times are relative to your business timezone (
        {/* TODO: Display timezone from business profile */}).
      </p>

      <form
        onSubmit={handleAddOrUpdateRule}
        style={{
          marginBottom: '20px',
          padding: '15px',
          border: '1px solid #eee',
          borderRadius: '5px',
        }}
      >
        <h3>{isEditing !== null ? 'Edit Rule' : 'Add New Rule'}</h3>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
          <div style={{ flexGrow: 1 }}>
            <label htmlFor="dayOfWeek" style={labelStyle}>
              Day:
            </label>
            <select
              name="dayOfWeek"
              id="dayOfWeek"
              value={currentRule.dayOfWeek}
              onChange={handleRuleChange}
              style={inputStyle}
            >
              {Object.values(DayOfWeek).map(day => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </select>
          </div>
          <div style={{ flexGrow: 1 }}>
            <label htmlFor="startTime" style={labelStyle}>
              Start Time:
            </label>
            <input
              type="time"
              name="startTime"
              id="startTime"
              value={currentRule.startTime}
              onChange={handleRuleChange}
              style={inputStyle}
            />
          </div>
          <div style={{ flexGrow: 1 }}>
            <label htmlFor="endTime" style={labelStyle}>
              End Time:
            </label>
            <input
              type="time"
              name="endTime"
              id="endTime"
              value={currentRule.endTime}
              onChange={handleRuleChange}
              style={inputStyle}
            />
          </div>
          <button type="submit" style={{ ...buttonStyle, height: '40px', whiteSpace: 'nowrap' }}>
            {isEditing !== null ? 'Update Rule' : 'Add Rule'}
          </button>
          {isEditing !== null && (
            <button
              type="button"
              onClick={() => {
                setIsEditing(null);
                setCurrentRule({
                  dayOfWeek: DayOfWeek.MONDAY,
                  startTime: '09:00',
                  endTime: '17:00',
                });
              }}
              style={{ ...buttonStyle, backgroundColor: '#ccc', height: '40px' }}
            >
              Cancel Edit
            </button>
          )}
        </div>
      </form>

      <h2>Current Rules:</h2>
      {isLoading && !businessId && <p>Loading availability rules...</p>}
      {!isLoading && rules.length === 0 && (
        <p>No availability rules defined yet. Add rules using the form above.</p>
      )}

      {rules.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {rules.map((rule, index) => (
            <li
              key={rule.id || `rule-${index}`}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px',
                borderBottom: '1px solid #eee',
              }}
            >
              <span>
                {rule.dayOfWeek}: {rule.startTime} - {rule.endTime}
              </span>
              <div>
                <button
                  onClick={() => handleEditRule(index)}
                  style={{ ...actionButtonStyle, marginRight: '5px' }}
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteRule(index)}
                  style={{ ...actionButtonStyle, backgroundColor: 'red' }}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'space-between' }}>
        <button
          onClick={() => router.back()}
          style={{ ...buttonStyle, backgroundColor: '#6c757d' }}
          disabled={isSubmitting}
        >
          Back to Dashboard
        </button>
        <button
          onClick={handleSaveAllAvailability}
          style={buttonStyle}
          disabled={isSubmitting || isLoading || rules.length === 0}
        >
          {isSubmitting ? 'Saving...' : 'Save All Changes to Server'}
        </button>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: '5px',
  fontWeight: 'bold',
};
const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px',
  border: '1px solid #ddd',
  borderRadius: '4px',
  boxSizing: 'border-box',
  height: '40px',
};
const buttonStyle: React.CSSProperties = {
  padding: '10px 15px',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  backgroundColor: '#0070f3',
  color: 'white',
  fontWeight: 'bold',
};
const actionButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  fontSize: '0.9em',
  padding: '5px 10px',
};
