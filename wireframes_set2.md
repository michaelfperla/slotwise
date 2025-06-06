**Wireframe Set 2: Core Functional Screens**

**III. Business Owner Dashboard - Schedule/Calendar View**

*   **Screen Title:** Schedule / Calendar
*   **Layout:** Main calendar view with a sidebar for filters and quick actions.
*   **Header:** (Consistent with Dashboard Overview)
    *   Logo, Main Navigation (current page "Schedule" highlighted), User Profile.
*   **Sidebar (Left or Right):**
    *   **Date Picker:** Small calendar to quickly jump to a date/month/year.
    *   **View Toggles:** Buttons/Tabs for Day, Week, Month views.
    *   **Staff Filter:**
        *   Dropdown or list of checkboxes to select which staff members' schedules to view (e.g., "All Staff," "Sarah Chen," "Therapist 2"). Default to "All Staff" or logged-in staff if they are not an admin/owner.
    *   **Service Filter (Optional):** Dropdown to filter by service, showing only times when that service can be booked.
    *   **"Print Schedule" Button.**
    *   **"Block Time" Button.**
*   **Main Content Area: Calendar Display**
    *   **Day View:**
        *   Timeline format (e.g., hourly slots from opening to closing time).
        *   Booked appointments shown as colored blocks within the timeline.
            *   Block displays: Client Name, Service Name, Duration.
            *   Clicking a block opens a pop-up/modal with Booking Details (see Screen IV.B) or navigates to the booking details page.
        *   Empty slots are clearly visible. Clicking an empty slot could initiate a "New Booking" flow.
    *   **Week View:**
        *   Columns for each day of the week.
        *   Summarized appointment blocks.
        *   Ability to click on a day to switch to Day View or on an appointment to see details.
    *   **Month View:**
        *   Traditional calendar grid.
        *   Days show a summary of bookings (e.g., "5 Bookings") or color-coding for busyness.
        *   Clicking a day navigates to Day View for that day.
    *   **Navigation:** "Previous Day/Week/Month" and "Next Day/Week/Month" buttons. "Today" button.
*   **Footer:** (Consistent)

**IV. Business Owner Dashboard - Services Management Page**

*   **Screen Title:** Services
*   **Layout:** Main list area, with options to add/edit.
*   **Header:** (Consistent)
    *   Logo, Main Navigation (current page "Services" highlighted), User Profile.
*   **Sub-Header/Action Bar (Below main header):**
    *   "Add New Service" Button - Prominently placed.
    *   Search bar to find a service by name.
    *   Filter by category (if categories are implemented).
*   **Main Content Area: Service List**
    *   Table or Card layout.
    *   **For each service in the list:**
        *   Service Name
        *   Duration
        *   Price
        *   Category (if applicable)
        *   Status (Active/Inactive)
        *   Assigned Staff (briefly, e.g., "3 Staff Members" or icons)
        *   Actions:
            *   "Edit" button/icon
            *   "Deactivate/Activate" toggle/button
            *   "Delete" button/icon (with confirmation)
    *   If the list is empty, a message like "You haven't added any services yet. Click 'Add New Service' to get started."
*   **Modals/Forms (for Add/Edit Service):**
    *   **Fields:**
        *   Service Name (Text input)
        *   Description (Textarea)
        *   Category (Dropdown, if applicable)
        *   Duration (e.g., Dropdown for 15min, 30min, 1hr, 1.5hr, etc., or number input + unit selector)
        *   Price (Number input, currency symbol based on business settings)
        *   Buffer Time (Before/After service - optional, e.g., 15 min cleaning time)
        *   Online Booking (Checkbox: "Allow clients to book this service online")
        *   Assigned Staff (Multi-select list of staff members who can perform this service)
        *   Service Color (Color picker for calendar display - optional)
        *   Booking Policy (e.g., cancellation window, advance booking limits - could be global or per service)
    *   **Actions:** "Save Service," "Cancel"
*   **Footer:** (Consistent)

**V. Business Owner Dashboard - Booking List & Details View**

*   **A. Booking List Page**
    *   **Screen Title:** Bookings
    *   **Header:** (Consistent)
    *   **Sub-Header/Action Bar:**
        *   Search bar (search by client name, service name).
        *   Filters:
            *   Date Range (Upcoming, Past, Custom Range)
            *   Status (Confirmed, Pending, Cancelled, Completed, No-show)
            *   Staff Member
            *   Service
        *   "Export Bookings" Button (CSV/PDF)
    *   **Main Content Area: Bookings Table**
        *   Columns: Date & Time, Client Name, Service, Staff, Duration, Price, Status, Actions.
        *   Each row is clickable to go to Booking Details View.
        *   Actions column: "View Details," quick "Cancel" or "Confirm" (if applicable).
        *   Pagination if many bookings.
*   **B. Booking Details Modal/Page (Opened from Calendar or Booking List)**
    *   **Title:** Booking Details
    *   **Content Sections:**
        *   **Client Information:** Name, Email, Phone, Client Notes (if any). Link to full client profile if CRM exists.
        *   **Booking Information:** Service Name, Date, Time, Duration, Staff Member assigned.
        *   **Pricing:** Service Price, Total Price (if extras/discounts apply).
        *   **Status:** (e.g., Confirmed, Pending) - Can be changed here by owner if permitted (e.g., confirm a pending booking).
        *   **Booking History/Log:** (Audit trail - e.g., Created, Confirmed by X, Reminder Sent).
        *   **Payment Status:** (e.g., Paid, Unpaid, Refunded - if payments are integrated).
    *   **Actions for Business Owner:**
        *   "Edit Booking" (e.g., reassign staff, change time if client called - might trigger notifications)
        *   "Reschedule"
        *   "Cancel Booking"
        *   "Mark as Completed"
        *   "Mark as No-Show"
        *   "Send Reminder Manually"
        *   "Add Note" (internal note for this booking)
*   **Footer:** (Consistent)

**VI. End User/Client - Booking Calendar/Slot Selection Page**

*   **Screen Title:** Book [Service Name] with [Business Name]
*   **Layout:** Typically a calendar view with available slots.
*   **Header:** (Consistent with Business Public Page)
    *   Business Logo & Name. May include a step indicator (e.g., "Step 2 of 3: Select Date & Time").
*   **Main Content Area:**
    *   **Selected Service Details (Recap):**
        *   Service Name, Duration, Price.
    *   **Staff Selection (If applicable and offered by business):**
        *   Dropdown: "Select Staff Member" (Options: "Any Available," [Staff Name 1], [Staff Name 2]). Default to "Any Available."
        *   Changing staff refreshes the availability calendar.
    *   **Availability Calendar:**
        *   Month view initially, with days showing "Available" or "Few Slots" or "Fully Booked."
        *   User clicks a date.
        *   Below or next to the calendar, available time slots for the selected date (and staff member) are displayed (e.g., "9:00 AM," "9:30 AM," "11:00 AM").
            *   Slots already booked or outside working hours are not shown or are greyed out.
        *   User clicks a time slot.
    *   **Navigation:** "Previous Month," "Next Month" for calendar.
    *   **Action:** "Next" or "Continue to Details" button (enabled after a slot is selected).
*   **Footer:** (Consistent)

**VII. End User/Client - Booking Confirmation & Details Page**

*   **Screen Title:** Enter Your Details / Confirm Your Booking
*   **Layout:** Form-based. Could be part of a multi-step booking process.
*   **Header:** (Consistent) Step indicator (e.g., "Step 3 of 3: Your Details").
*   **Main Content Area:**
    *   **Booking Summary (Recap):**
        *   Business Name
        *   Service Name, Date, Time, Duration
        *   Staff Member (if selected)
        *   Price
    *   **User Details Form:**
        *   Fields: First Name, Last Name, Email, Phone Number.
        *   Optional: "Notes for the business" (Textarea).
        *   Checkbox: "Save my details for next time" (if client accounts are supported).
        *   Checkbox: "I agree to the Booking Policy and Terms of Service" (Link to policies).
    *   **Payment Section (If service requires online payment):**
        *   Payment options (e.g., Credit Card form, PayPal button).
    *   **Action:** "Confirm Booking" or "Book & Pay" button.
*   **Post-Booking Confirmation Screen (after submission):**
    *   **Title:** Booking Confirmed!
    *   Message: "Your appointment for [Service Name] with [Business Name] on [Date] at [Time] is confirmed."
    *   Booking Reference Number.
    *   Option: "Add to Calendar" (iCal, Google Calendar links).
    *   Information: "You will receive an email confirmation shortly."
    *   Links: "View My Bookings" (if client account exists), "Back to [Business Name] Page."
*   **Footer:** (Consistent)

**VIII. End User/Client - "My Bookings" Page (Assumes Client Account)**

*   **Screen Title:** My Bookings
*   **Layout:** List of bookings.
*   **Header:** (Consistent, potentially a more generic SlotWise header if this page is not business-specific)
    *   Logo, Navigation (e.g., "My Profile," "My Bookings," "Logout").
*   **Main Content Area:**
    *   Tabs: "Upcoming Bookings," "Past Bookings."
    *   **For each booking in the list (Upcoming):**
        *   Business Name
        *   Service Name
        *   Date & Time
        *   Staff Member
        *   Status (e.g., Confirmed)
        *   Actions:
            *   "View Details"
            *   "Reschedule" (if allowed by policy and before cut-off time)
            *   "Cancel" (if allowed by policy and before cut-off time)
    *   **For each booking in the list (Past):**
        *   Similar details.
        *   Actions: "Book Again," "Leave a Review" (if reviews are a feature).
    *   If no bookings, a message like "You have no upcoming appointments."
*   **Footer:** (Consistent)
