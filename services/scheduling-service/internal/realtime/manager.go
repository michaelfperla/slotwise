package realtime

import (
	"sync"
	"time"

	"encoding/json"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"github.com/slotwise/scheduling-service/pkg/events" // Added for NATS subscriber
	"github.com/slotwise/scheduling-service/pkg/logger"
)

const (
	// Time allowed to write a message to the peer.
	writeWait = 10 * time.Second
	// Time allowed to read the next pong message from the peer.
	pongWait = 60 * time.Second
	// Send pings to peer with this period. Must be less than pongWait.
	pingPeriod = (pongWait * 9) / 10
	// Maximum message size allowed from peer.
	maxMessageSize = 512
)

// Client is a middleman between the websocket connection and the hub.
type Client struct {
	ID string
	// The websocket connection.
	Conn *websocket.Conn
	// Buffered channel of outbound messages.
	Send chan []byte
	// BusinessID this client is subscribed to for targeted updates.
	// A client might subscribe to one specific business's updates.
	BusinessID string
	// Reference to the manager.
	Manager *SubscriptionManager
}

// SubscriptionManager maintains the set of active clients and broadcasts messages.
type SubscriptionManager struct {
	// Registered clients.
	clients map[*Client]bool
	// Inbound messages from the clients. (broadcast is a placeholder, actual message handling is more complex)
	broadcast chan []byte // Placeholder, not used directly for targeted business messages
	// Register requests from the clients.
	register chan *Client
	// Unregister requests from clients.
	unregister chan *Client
	// Subscriptions: businessID -> set of clients.
	subscriptions map[string]map[*Client]bool
	// Logger
	Logger *logger.Logger
	// NATS Event Subscriber
	Subscriber *events.Subscriber // Added field
	// Mutex for protecting concurrent access to clients and subscriptions maps.
	mu sync.RWMutex
}

// NewSubscriptionManager creates a new SubscriptionManager.
func NewSubscriptionManager(logger *logger.Logger, subscriber *events.Subscriber) *SubscriptionManager { // Added subscriber
	return &SubscriptionManager{
		broadcast:     make(chan []byte),
		register:      make(chan *Client),
		unregister:    make(chan *Client),
		clients:       make(map[*Client]bool),
		subscriptions: make(map[string]map[*Client]bool),
		Logger:        logger,
		Subscriber:    subscriber, // Store subscriber
	}
}

// EnqueueClientRegistration sends a client to the manager's register channel
// for initial registration into the main client list.
func (m *SubscriptionManager) EnqueueClientRegistration(client *Client) {
	m.register <- client
}

// Run starts the subscription manager's event loop.
// This should be run in a goroutine.
func (m *SubscriptionManager) Run() {
	m.Logger.Info("SubscriptionManager Run loop started")
	for {
		select {
		case client := <-m.register:
			m.mu.Lock()
			m.clients[client] = true
			m.Logger.Info("Client registered", "clientId", client.ID)
			m.mu.Unlock()
		case client := <-m.unregister:
			m.mu.Lock()
			if _, ok := m.clients[client]; ok {
				delete(m.clients, client)
				close(client.Send)
				// Remove from all subscriptions
				for businessID, clients := range m.subscriptions {
					if _, subscribed := clients[client]; subscribed {
						delete(m.subscriptions[businessID], client)
						if len(m.subscriptions[businessID]) == 0 {
							delete(m.subscriptions, businessID)
						}
						m.Logger.Info("Client unregistered from business", "clientId", client.ID, "businessId", businessID)
					}
				}
				m.Logger.Info("Client unregistered", "clientId", client.ID)
			}
			m.mu.Unlock()
			// Example of broadcasting to all clients (not used for targeted business messages)
			// case message := <-m.broadcast:
			// 	m.mu.RLock()
			// 	for client := range m.clients {
			// 		select {
			// 		case client.Send <- message:
			// 		default:
			// 			close(client.Send)
			// 			delete(m.clients, client) // Consider moving to unregister logic
			// 			m.Logger.Warn("Client send channel full or closed, removing client", "clientId", client.ID)
			// 		}
			// 	}
			// 	m.mu.RUnlock()
		}
	}
}

// RegisterClient associates a client with a specific businessID for targeted messages.
func (m *SubscriptionManager) RegisterClient(client *Client, businessID string) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if client == nil {
		m.Logger.Error("Attempted to register a nil client")
		return
	}

	client.BusinessID = businessID // Assign businessID to client

	if _, ok := m.subscriptions[businessID]; !ok {
		m.subscriptions[businessID] = make(map[*Client]bool)
	}
	m.subscriptions[businessID][client] = true
	m.Logger.Info("Client subscribed to business", "clientId", client.ID, "businessId", businessID)
}

// UnregisterClient removes a client from all its subscriptions and the manager.
// This is typically called when a client disconnects.
func (m *SubscriptionManager) UnregisterClient(client *Client) {
	// Send to the unregister channel to handle removal in the Run goroutine
	// to avoid race conditions with the select loop.
	m.unregister <- client
}

// SendToBusiness sends a message to all clients subscribed to a specific businessID.
func (m *SubscriptionManager) SendToBusiness(businessID string, message []byte) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	if subscribers, ok := m.subscriptions[businessID]; ok {
		m.Logger.Info("Sending message to business", "businessId", businessID, "numSubscribers", len(subscribers))
		for client := range subscribers {
			// Non-blocking send: if client's send buffer is full, drop the message for this client.
			// This prevents one slow client from blocking message delivery to others.
			select {
			case client.Send <- message:
				m.Logger.Debug("Message sent to client", "clientId", client.ID, "businessId", businessID)
			default:
				// Client's channel is full. We might log this, or decide to unregister
				// the client if this happens too often, assuming it's unresponsive.
				// For now, just log it. The writePump for the client will handle closing if writes fail.
				m.Logger.Warn("Client send channel full, message dropped", "clientId", client.ID, "businessId", businessID)
			}
		}
	} else {
		m.Logger.Info("No subscribers for business to send message", "businessId", businessID)
	}
}

// Helper function to generate unique client IDs
func GenerateClientID() string {
	return uuid.New().String()
}

// WebSocketMessage defines the structure for messages sent to clients.
type WebSocketMessage struct {
	Type    string      `json:"type"`
	Payload interface{} `json:"payload"`
}

// handleBookingEvent processes booking-related NATS events and forwards them to relevant WebSocket clients.
func (m *SubscriptionManager) handleBookingEvent(data []byte, eventType string) {
	m.Logger.Info("Handling booking event via NATS", "eventType", eventType, "dataLength", len(data))
	var eventData map[string]interface{}
	if err := json.Unmarshal(data, &eventData); err != nil {
		m.Logger.Error("Failed to unmarshal booking event data from NATS", "eventType", eventType, "error", err, "rawData", string(data))
		return
	}

	businessID, ok := eventData["businessId"].(string)
	if !ok {
		m.Logger.Error("businessId missing or not a string in booking event data", "eventType", eventType, "eventData", eventData)
		return
	}

	// Construct WebSocket message payload
	// Example: {"bookingId": "...", "serviceId": "...", "startTime": "...", "endTime": "...", "status": "..."}
	// Ensure all necessary fields are present in eventData from the publisher
	wsPayload := eventData // Use the whole event data as payload for now, can be more specific

	wsMessage := WebSocketMessage{
		Type:    eventType, // e.g., "booking_confirmed", "booking_cancelled"
		Payload: wsPayload,
	}

	jsonMessage, err := json.Marshal(wsMessage)
	if err != nil {
		m.Logger.Error("Failed to marshal WebSocket message for booking event", "eventType", eventType, "error", err)
		return
	}

	m.Logger.Info("Sending booking update to business via WebSocket", "businessId", businessID, "eventType", eventType)
	m.SendToBusiness(businessID, jsonMessage)
}

// handleAvailabilityRuleEvent processes availability rule update NATS events.
func (m *SubscriptionManager) handleAvailabilityRuleEvent(data []byte) {
	m.Logger.Info("Handling availability rule event via NATS", "dataLength", len(data))
	var eventData map[string]interface{}
	if err := json.Unmarshal(data, &eventData); err != nil {
		m.Logger.Error("Failed to unmarshal availability rule event data from NATS", "error", err, "rawData", string(data))
		return
	}

	businessID, ok := eventData["businessId"].(string)
	if !ok {
		m.Logger.Error("businessId missing or not a string in availability rule event", "eventData", eventData)
		return
	}

	// Default message if not provided in event
	messageText := "Availability rules have been updated. Please refresh."
	if msg, found := eventData["message"].(string); found && msg != "" {
		messageText = msg
	}

	wsPayload := map[string]interface{}{
		"businessId": businessID,
		"message":    messageText,
	}
	wsMessage := WebSocketMessage{
		Type:    "availability_updated",
		Payload: wsPayload,
	}

	jsonMessage, err := json.Marshal(wsMessage)
	if err != nil {
		m.Logger.Error("Failed to marshal WebSocket message for availability rule event", "error", err)
		return
	}

	m.Logger.Info("Sending availability update to business via WebSocket", "businessId", businessID)
	m.SendToBusiness(businessID, jsonMessage)
}

// StartEventSubscriptions sets up NATS subscriptions for the SubscriptionManager.
func (m *SubscriptionManager) StartEventSubscriptions() {
	if m.Subscriber == nil {
		m.Logger.Error("NATS Subscriber is not initialized in SubscriptionManager. Cannot start event subscriptions.")
		return
	}
	m.Logger.Info("Starting NATS event subscriptions for SubscriptionManager")

	err := m.Subscriber.Subscribe(events.BookingConfirmedEvent, func(data []byte) error {
		// NATS handler func expects error return, but our internal handler doesn't. Adapt if needed.
		// Aligning with problem description: NATS BookingConfirmedEvent maps to WS "booking_created" type.
		m.handleBookingEvent(data, "booking_created")
		return nil
	})
	if err != nil {
		m.Logger.Error("Failed to subscribe to NATS BookingConfirmedEvent", "error", err)
	} else {
		m.Logger.Info("Subscribed to NATS BookingConfirmedEvent")
	}

	err = m.Subscriber.Subscribe(events.BookingCancelledEvent, func(data []byte) error {
		// For cancellations, "booking_updated" or "booking_cancelled" are suitable.
		// Let's use "booking_updated" for generic status changes, or keep "booking_cancelled" if specific.
		// Sticking to "booking_cancelled" for now as it's specific and clear.
		m.handleBookingEvent(data, "booking_cancelled")
		return nil
	})
	if err != nil {
		m.Logger.Error("Failed to subscribe to NATS BookingCancelledEvent", "error", err)
	} else {
		m.Logger.Info("Subscribed to NATS BookingCancelledEvent")
	}

	// The comment block below is now addressed by the change above for BookingConfirmedEvent.
	// A generic "booking_updated" could be used for other status changes if needed.

	err = m.Subscriber.Subscribe(events.AvailabilityRuleUpdatedEvent, func(data []byte) error {
		m.handleAvailabilityRuleEvent(data)
		return nil
	})
	if err != nil {
		m.Logger.Error("Failed to subscribe to NATS AvailabilityRuleUpdatedEvent", "error", err)
	} else {
		m.Logger.Info("Subscribed to NATS AvailabilityRuleUpdatedEvent")
	}
}
