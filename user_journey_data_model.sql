-- Database Schema for Storing User Journey Maps and Related Application Entities

-- --------------------------------------------------------------------------------
-- Tables for User Journey Mapping
-- --------------------------------------------------------------------------------

-- UserJourneyMap: Stores the overall description of a user journey.
CREATE TABLE UserJourneyMap (
    id INT PRIMARY KEY AUTO_INCREMENT,
    journey_name VARCHAR(255) NOT NULL,
    journey_description TEXT,
    persona_goal TEXT,         -- Goal of the persona for this journey
    overall_scenario TEXT      -- Overall scenario for the journey
);

-- UserPersona: Details specific personas associated with a journey.
CREATE TABLE UserPersona (
    id INT PRIMARY KEY AUTO_INCREMENT,
    persona_name VARCHAR(255) NOT NULL,
    role_description TEXT,     -- e.g., "Owner of SereneScape Massage Therapy"
    tech_savviness VARCHAR(100),
    user_journey_id INT,
    FOREIGN KEY (user_journey_id) REFERENCES UserJourneyMap(id) ON DELETE CASCADE
);

-- KeyFlow: Breaks down a journey into distinct key flows.
-- This table might be redundant if FlowStep directly links to UserJourneyMap
-- and has a 'phase_name' or similar. For simplicity, we'll keep it for now
-- to represent distinct phases within a larger journey map as presented.
CREATE TABLE KeyFlow (
    id INT PRIMARY KEY AUTO_INCREMENT,
    flow_name VARCHAR(255) NOT NULL, -- e.g., "Registration/Account Creation"
    user_journey_id INT,
    sequence_order INT, -- To order the flows within a journey
    FOREIGN KEY (user_journey_id) REFERENCES UserJourneyMap(id) ON DELETE CASCADE
);

-- FlowStep: Contains the individual steps within each KeyFlow/Phase.
CREATE TABLE FlowStep (
    id INT PRIMARY KEY AUTO_INCREMENT,
    key_flow_id INT,
    step_number INT,            -- Sequence of the step within the flow/phase
    step_name VARCHAR(255),     -- Short name for the step/phase e.g., "1. Registration/Account Creation"
    actions TEXT,               -- User's actions
    user_thoughts TEXT,         -- What the user might be thinking
    user_emotions TEXT,         -- User's feelings/emotions
    pain_points TEXT,           -- Potential difficulties or frustrations
    opportunities TEXT,         -- How SlotWise can improve the experience
    FOREIGN KEY (key_flow_id) REFERENCES KeyFlow(id) ON DELETE CASCADE
);


-- --------------------------------------------------------------------------------
-- Core Application Entities (Simplified for context - a full ERD would be more detailed)
-- These are referenced by the journey maps to show how user interactions
-- relate to the application's data structures.
-- --------------------------------------------------------------------------------

-- User: Stores user account information (both business owners and clients).
CREATE TABLE User (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    role ENUM('BUSINESS_OWNER', 'END_USER', 'STAFF_MEMBER', 'ADMIN') NOT NULL,
    is_email_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Business: Information about the business registered on SlotWise.
CREATE TABLE Business (
    id INT PRIMARY KEY AUTO_INCREMENT,
    owner_user_id INT NOT NULL,
    business_name VARCHAR(255) NOT NULL,
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    address TEXT,
    subdomain VARCHAR(255) UNIQUE, -- e.g., serenescape.slotwise.com
    business_type VARCHAR(100), -- e.g., "Massage Therapy", "Salon"
    logo_url VARCHAR(2048),
    banner_image_url VARCHAR(2048),
    description TEXT,
    operating_hours TEXT, -- Could be JSON or a separate table for more structure
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_user_id) REFERENCES User(id) ON DELETE CASCADE
);

-- Service: Details of services offered by a business.
CREATE TABLE Service (
    id INT PRIMARY KEY AUTO_INCREMENT,
    business_id INT NOT NULL,
    service_name VARCHAR(255) NOT NULL,
    description TEXT,
    duration_minutes INT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    buffer_time_before_minutes INT DEFAULT 0,
    buffer_time_after_minutes INT DEFAULT 0,
    category VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    allow_online_booking BOOLEAN DEFAULT TRUE,
    color_hex VARCHAR(7), -- For calendar display
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (business_id) REFERENCES Business(id) ON DELETE CASCADE
);

-- Staff: Information about staff members of a business.
CREATE TABLE Staff (
    id INT PRIMARY KEY AUTO_INCREMENT,
    business_id INT NOT NULL,
    user_id INT UNIQUE, -- Optional: if staff can log in
    staff_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(50),
    role_description VARCHAR(255), -- e.g., "Senior Therapist"
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (business_id) REFERENCES Business(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES User(id) ON DELETE SET NULL
);

-- ServiceStaffAssignment: Many-to-Many relationship for services and staff.
CREATE TABLE ServiceStaffAssignment (
    service_id INT NOT NULL,
    staff_id INT NOT NULL,
    PRIMARY KEY (service_id, staff_id),
    FOREIGN KEY (service_id) REFERENCES Service(id) ON DELETE CASCADE,
    FOREIGN KEY (staff_id) REFERENCES Staff(id) ON DELETE CASCADE
);

-- WorkingHours: Defines working hours for staff members (more structured).
CREATE TABLE WorkingHours (
    id INT PRIMARY KEY AUTO_INCREMENT,
    staff_id INT NOT NULL,
    day_of_week ENUM('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY') NOT NULL,
    start_time TIME,
    end_time TIME,
    is_off BOOLEAN DEFAULT FALSE, -- True if the staff member is off on this day
    FOREIGN KEY (staff_id) REFERENCES Staff(id) ON DELETE CASCADE,
    UNIQUE (staff_id, day_of_week) -- Ensure one entry per staff per day
);

-- AvailabilityOverride: For specific date overrides (e.g., holidays, special hours).
CREATE TABLE AvailabilityOverride (
    id INT PRIMARY KEY AUTO_INCREMENT,
    staff_id INT NOT NULL,
    override_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    is_unavailable BOOLEAN DEFAULT FALSE, -- True if staff is completely unavailable on this date
    reason VARCHAR(255),
    FOREIGN KEY (staff_id) REFERENCES Staff(id) ON DELETE CASCADE
);

-- Booking: Records of appointments made.
CREATE TABLE Booking (
    id INT PRIMARY KEY AUTO_INCREMENT,
    business_id INT NOT NULL,
    service_id INT NOT NULL,
    staff_id INT, -- Can be NULL if "Any Available"
    client_user_id INT, -- If client is a registered user
    client_name VARCHAR(255) NOT NULL, -- Required even for guest bookings
    client_email VARCHAR(255) NOT NULL,
    client_phone VARCHAR(50),
    client_notes TEXT,
    booking_time_start DATETIME NOT NULL,
    booking_time_end DATETIME NOT NULL,
    status ENUM('PENDING_CONFIRMATION', 'CONFIRMED', 'CANCELLED_BY_CLIENT', 'CANCELLED_BY_BUSINESS', 'COMPLETED', 'NO_SHOW') NOT NULL,
    payment_status ENUM('UNPAID', 'PENDING', 'PAID', 'REFUNDED') DEFAULT 'UNPAID',
    booking_reference VARCHAR(100) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (business_id) REFERENCES Business(id) ON DELETE CASCADE,
    FOREIGN KEY (service_id) REFERENCES Service(id) ON DELETE CASCADE,
    FOREIGN KEY (staff_id) REFERENCES Staff(id) ON DELETE SET NULL,
    FOREIGN KEY (client_user_id) REFERENCES User(id) ON DELETE SET NULL
);

-- BusinessSettings: Configurable settings for each business.
CREATE TABLE BusinessSettings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    business_id INT UNIQUE NOT NULL,
    booking_policy TEXT,
    cancellation_policy TEXT,
    advance_booking_limit_days INT DEFAULT 90, -- How far in advance clients can book
    min_booking_notice_hours INT DEFAULT 1, -- Minimum time before a slot can be booked
    auto_confirm_bookings BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (business_id) REFERENCES Business(id) ON DELETE CASCADE
);

-- NotificationPreference: User preferences for receiving notifications.
CREATE TABLE NotificationPreference (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    notification_type ENUM('BOOKING_CONFIRMATION', 'BOOKING_REMINDER', 'BOOKING_CANCELLATION', 'MARKETING') NOT NULL,
    channel ENUM('EMAIL', 'SMS', 'IN_APP') NOT NULL,
    is_enabled BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (user_id) REFERENCES User(id) ON DELETE CASCADE,
    UNIQUE (user_id, notification_type, channel)
);

-- Payment: Records of payments made for bookings.
CREATE TABLE Payment (
    id INT PRIMARY KEY AUTO_INCREMENT,
    booking_id INT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status ENUM('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED') NOT NULL,
    payment_gateway_transaction_id VARCHAR(255),
    payment_method VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES Booking(id) ON DELETE CASCADE
);

-- Adding placeholder for authApi to avoid errors in the authStore.ts if it were to be directly used.
-- This is a conceptual placeholder and would actually be part of the application code.
-- For the SQL file, this is just a comment.
-- /*
-- const authApi = {
--   login: async (credentials) => { /* ... */ },
--   logout: async () => { /* ... */ }
-- };
-- */
-- Note: The User, Business, Service, Staff, Booking tables are simplified representations.
-- A full production schema would include more attributes, indexes, and constraints.
-- The focus here is on how the User Journey Map data might be structured in relation to them.
```
This schema defines tables for storing user journey maps, personas, key flows, and flow steps. It also includes simplified versions of core application entity tables (User, Business, Service, etc.) to provide context on how the journey map data could relate to a real application's database. The foreign keys help link these concepts together. For example, a UserPersona is linked to a UserJourneyMap, and FlowSteps are linked to a KeyFlow, which in turn is linked to a UserJourneyMap.
The core application entity tables are placeholders and would be much more detailed in a full ERD for SlotWise.
