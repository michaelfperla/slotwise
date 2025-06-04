package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"github.com/slotwise/scheduling-service/internal/realtime"
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

// WebSocketHandler handles WebSocket connections.
type WebSocketHandler struct {
	Upgrader websocket.Upgrader
	Manager  *realtime.SubscriptionManager
	Logger   *logger.Logger
}

// NewWebSocketHandler creates a new WebSocketHandler.
func NewWebSocketHandler(manager *realtime.SubscriptionManager, logger *logger.Logger) *WebSocketHandler {
	return &WebSocketHandler{
		Upgrader: websocket.Upgrader{
			ReadBufferSize:  1024,
			WriteBufferSize: 1024,
			CheckOrigin: func(r *http.Request) bool {
				// Allow all connections for now. In production, you might want to check r.Header.Get("Origin")
				// against a whitelist of allowed origins.
				return true
			},
		},
		Manager: manager,
		Logger:  logger,
	}
}

// SubscriptionMessage defines the structure for messages from the client.
type SubscriptionMessage struct {
	Type       string `json:"type"`
	BusinessID string `json:"businessId,omitempty"`
	// Add other fields like serviceId, date filters if needed for more granular subscriptions
}

// HandleConnections upgrades HTTP requests to WebSocket connections and manages them.
func (h *WebSocketHandler) HandleConnections(c *gin.Context) {
	conn, err := h.Upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		h.Logger.Error("Failed to upgrade WebSocket connection", "error", err)
		// Gin automatically sends a 400 Bad Request if Upgrade fails
		return
	}
	h.Logger.Info("WebSocket connection upgraded")

	client := &realtime.Client{
		ID:      realtime.GenerateClientID(),
		Conn:    conn,
		Send:    make(chan []byte, 256), // Buffered channel
		Manager: h.Manager,
	}

	// Register client with the manager (via manager's register channel)
	// The manager's Run method will handle the actual registration in its own goroutine.
	h.Manager.EnqueueClientRegistration(client)

	// Allow collection of memory referenced by the caller by doing all work in new goroutines.
	go h.writePump(client)
	go h.readPump(client)
}

// readPump pumps messages from the WebSocket connection to the hub.
// The application runs readPump in a per-connection goroutine. The application
// ensures that there is at most one reader on a connection by executing all
// reads from this goroutine.
func (h *WebSocketHandler) readPump(client *realtime.Client) {
	defer func() {
		client.Manager.UnregisterClient(client) // Use the method that sends to the unregister channel
		if err := client.Conn.Close(); err != nil {
			h.Logger.Error("Error closing WebSocket connection on readPump exit", "clientId", client.ID, "error", err)
		}
		h.Logger.Info("WebSocket readPump exited, client unregistered", "clientId", client.ID)
	}()

	client.Conn.SetReadLimit(maxMessageSize)
	if err := client.Conn.SetReadDeadline(time.Now().Add(pongWait)); err != nil {
		h.Logger.Error("Failed to set read deadline for WebSocket", "clientId", client.ID, "error", err)
		return // Return here as connection might be already broken
	}
	client.Conn.SetPongHandler(func(string) error {
		if err := client.Conn.SetReadDeadline(time.Now().Add(pongWait)); err != nil {
			h.Logger.Error("Failed to set read deadline on pong for WebSocket", "clientId", client.ID, "error", err)
			// Do not return here, let the main read loop handle the error if read fails
		}
		h.Logger.Debug("Pong received", "clientId", client.ID)
		return nil
	})

	for {
		_, message, err := client.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				h.Logger.Error("WebSocket read error (unexpected close)", "clientId", client.ID, "error", err)
			} else {
				h.Logger.Info("WebSocket closed (expected)", "clientId", client.ID, "error", err) // e.g. client closed tab
			}
			break // Exit loop on any read error
		}

		// Attempt to parse the message as a SubscriptionMessage
		var msg SubscriptionMessage
		if err := json.Unmarshal(message, &msg); err != nil {
			h.Logger.Warn("Failed to unmarshal message from client", "clientId", client.ID, "message", string(message), "error", err)
			// Could send an error message back to client here if desired
			continue
		}

		h.Logger.Info("Received message from client", "clientId", client.ID, "type", msg.Type, "businessId", msg.BusinessID)

		switch msg.Type {
		case "subscribe":
			if msg.BusinessID != "" {
				// Manager's RegisterClient method handles adding to subscriptions map
				client.Manager.RegisterClient(client, msg.BusinessID)
			} else {
				h.Logger.Warn("Subscription message missing businessId", "clientId", client.ID)
				// Optionally send error back to client
			}
		// Handle other message types if needed, e.g., "unsubscribe"
		default:
			h.Logger.Info("Unknown message type from client", "clientId", client.ID, "type", msg.Type)
		}
		// Reset read deadline after successful read
		if err := client.Conn.SetReadDeadline(time.Now().Add(pongWait)); err != nil {
			h.Logger.Error("Failed to set read deadline after message read", "clientId", client.ID, "error", err)
			break
		}
	}
}

// writePump pumps messages from the hub to the WebSocket connection.
// A goroutine running writePump is started for each connection. The
// application ensures that there is at most one writer to a connection by
// executing all writes from this goroutine.
func (h *WebSocketHandler) writePump(client *realtime.Client) {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		// No need to call UnregisterClient here as readPump's defer handles it.
		// Closing the connection here might be redundant if readPump also closes,
		// but it's safe to call multiple times.
		if err := client.Conn.Close(); err != nil {
			h.Logger.Error("Error closing WebSocket connection on writePump exit", "clientId", client.ID, "error", err)
		}
		h.Logger.Info("WebSocket writePump exited", "clientId", client.ID)
	}()

	for {
		select {
		case message, ok := <-client.Send:
			if err := client.Conn.SetWriteDeadline(time.Now().Add(writeWait)); err != nil {
				h.Logger.Error("Failed to set write deadline for WebSocket", "clientId", client.ID, "error", err)
				// Do not return, attempt to write the message if channel is still open
			}
			if !ok {
				// The hub closed the channel.
				h.Logger.Info("Client send channel closed by manager", "clientId", client.ID)
				if err := client.Conn.WriteMessage(websocket.CloseMessage, []byte{}); err != nil {
					h.Logger.Error("Error writing close message on channel close", "clientId", client.ID, "error", err)
				}
				return // Exit goroutine
			}

			w, err := client.Conn.NextWriter(websocket.TextMessage)
			if err != nil {
				h.Logger.Error("Failed to get next writer for WebSocket", "clientId", client.ID, "error", err)
				return // Exit goroutine
			}
			if _, err := w.Write(message); err != nil {
				h.Logger.Error("Error writing message to WebSocket", "clientId", client.ID, "error", err)
				// Return might be too aggressive here, could try to continue.
				// However, if write fails, connection is likely compromised.
			}

			// For text messages with multiple parts, you might write more to w.
			// Here, we assume one message per client.Send item.
			if err := w.Close(); err != nil {
				h.Logger.Error("Error closing message writer for WebSocket", "clientId", client.ID, "error", err)
				return // Exit goroutine
			}
		case <-ticker.C:
			if err := client.Conn.SetWriteDeadline(time.Now().Add(writeWait)); err != nil {
				h.Logger.Error("Failed to set write deadline for ping", "clientId", client.ID, "error", err)
				// If setting deadline fails, connection might be bad.
				return
			}
			h.Logger.Debug("Sending ping to client", "clientId", client.ID)
			if err := client.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				h.Logger.Error("Error writing ping message to WebSocket", "clientId", client.ID, "error", err)
				return // Exit goroutine if ping fails
			}
		}
	}
}

// In manager.go, the SubscriptionManager.register field is a channel.
// To send a client to this channel, it should be:
// client.Manager.register <- client
// This was a note for myself to correct in the HandleConnections method.
// The `Register` method should be:
// func (m *SubscriptionManager) Register(client *Client) {
//	 m.register <- client
// }
// And similar for unregister.

// Let's make sure the Client struct has a Manager field
// And the SubscriptionManager has Register and Unregister methods that send to the channel.

// Corrected call in HandleConnections:
// client.Manager.Register(client) -> this needs to be a method on SubscriptionManager that sends to the channel.

// Let's refine the SubscriptionManager's Register and Unregister methods in manager.go
// and ensure the call in websocket.go is correct.

// In manager.go:
// func (m *SubscriptionManager) EnqueueRegister(client *Client) {
// 	  m.register <- client
// }
// func (m *SubscriptionManager) EnqueueUnregister(client *Client) {
// 	  m.unregister <- client
// }

// In websocket.go HandleConnections:
// client.Manager.EnqueueRegister(client)

// In websocket.go readPump defer:
// client.Manager.EnqueueUnregister(client)

// The current code in manager.go for RegisterClient and UnregisterClient methods performs direct map manipulation.
// The Run loop handles `register` and `unregister` channels.
// So, from HandleConnections, we should send to `manager.register` channel.
// And from readPump defer, send to `manager.unregister` channel.

// Corrected in HandleConnections:
// h.Manager.GetRegisterChannel() <- client // Or add a method to manager to send to channel
// No, it should be: client.Manager.register <- client

// The Client struct has `Manager *SubscriptionManager`.
// So `client.Manager.register <- client` is the correct way to send to the channel from `HandleConnections`.
// And `client.Manager.unregister <- client` from `readPump` defer.

// The methods `RegisterClient` (for businessID subscription) and `UnregisterClient` (for map cleanup)
// in `SubscriptionManager` are for specific logic handled by the manager itself, often called by `readPump`
// for subscriptions or by the `Run` loop for cleanup.

// The current structure:
// HandleConnections -> client.Manager.register <- client (sends client to manager's main registration channel)
// readPump (on message) -> client.Manager.RegisterClient(client, businessID) (adds client to specific businessID subscription map)
// readPump (on exit) -> client.Manager.unregister <- client (sends client to manager's main unregistration channel)

// This looks correct. The `Register` method I noted as a "correction" would be redundant.
// The client is first registered with the manager's main list via the `register` channel,
// then `readPump` handles specific business ID subscriptions by calling `manager.RegisterClient`.
// When client disconnects, `readPump`'s defer sends to `manager.unregister` for full cleanup.
// This is a good flow.
// The previous `client.Manager.Register(client)` was a mental note during generation, the actual code uses the channel send.
// The actual code in `HandleConnections` should be:
// `h.Manager.register <- client`
// And in `readPump` defer:
// `client.Manager.unregister <- client`
// Because `client.Manager` is available, but `h.Manager` is also available in `HandleConnections`.
// Let's use `h.Manager.register <- client` for consistency in `HandleConnections`.
// And `client.Manager.unregister <- client` in `readPump` is fine as `h` is not in scope there.

// Final check on HandleConnections:
// `h.Manager.register <- client` is indeed what it should be. The current template has `client.Manager.Register(client)`
// which is calling a method not sending to a channel. I'll fix this in the generated code.

// The client needs a reference to the manager to send to the unregister channel from readPump.
// `client.Manager *SubscriptionManager` is already in the Client struct in `manager.go`.

// The line `client.Manager.Register(client)` in `HandleConnections` is the one needing correction.
// It should be `h.Manager.register <- client`.
// The `UnregisterClient` method in `SubscriptionManager` already sends to the `unregister` channel,
// so `client.Manager.UnregisterClient(client)` in `readPump`'s defer is correct.
// The method `SubscriptionManager.RegisterClient` is for adding to business subscriptions, which is fine.
// So the only direct channel send needed from handler is for initial registration to the manager's main loop.
// Or, I can add a method to `SubscriptionManager` like `EnqueueClientRegistration(client *Client)`
// which then sends to `m.register <- client`. This is cleaner.

// Let's add EnqueueClientRegistration to manager.go
// And use that from HandleConnections.
// The existing UnregisterClient method in manager.go already sends to the channel, so that's fine.

// In manager.go, add:
// func (m *SubscriptionManager) EnqueueClientRegistration(client *Client) {
// 	  m.register <- client
// }
// In websocket.go's HandleConnections:
// h.Manager.EnqueueClientRegistration(client)
// This is cleaner.
// The rest of the logic seems sound.The `websocket.go` handler file has been created.
During generation, I noted a small refinement for how the client is passed to the manager's registration channel.
In `HandleConnections`, instead of `client.Manager.Register(client)` (which was a placeholder comment and not an actual method for sending to the channel), it should ideally be a method on the manager that sends to its internal `register` channel.

I will first add this helper method `EnqueueClientRegistration` to `services/scheduling-service/internal/realtime/manager.go`.
Then, I will ensure `services/scheduling-service/internal/handlers/websocket.go` uses this method in `HandleConnections`.

Let's modify `manager.go`.
