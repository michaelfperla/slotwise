package client

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"time"

	"github.com/slotwise/scheduling-service/internal/config"
	// Standardized logger path
)

// NotificationServiceClient handles communication with the notification service.
type NotificationServiceClient struct {
	httpClient *http.Client
	baseURL    string
}

// NewNotificationServiceClient creates a new client for the notification service.
func NewNotificationServiceClient(cfg *config.Config) *NotificationServiceClient {
	return &NotificationServiceClient{
		httpClient: &http.Client{
			Timeout: 10 * time.Second, // Sensible timeout
		},
		baseURL: cfg.NotificationServiceURL,
	}
}

// SendNotificationRequest defines the payload for sending an immediate notification.
type SendNotificationRequest struct {
	Type           string                 `json:"type"` // e.g., "booking_confirmation"
	RecipientEmail string                 `json:"recipientEmail"`
	TemplateData   map[string]interface{} `json:"templateData"`
	Subject        *string                `json:"subject,omitempty"` // Optional subject override
}

// ScheduleNotificationRequest defines the payload for scheduling a notification.
type ScheduleNotificationRequest struct {
	Type           string                 `json:"type"` // e.g., "booking_reminder"
	RecipientEmail string                 `json:"recipientEmail"`
	TemplateData   map[string]interface{} `json:"templateData"`
	Subject        *string                `json:"subject,omitempty"` // Optional subject override
	ScheduledFor   time.Time              `json:"scheduledFor"`      // ISO 8601 format expected by notification service
	BookingID      string                 `json:"bookingId"`
}

// NotificationResponse defines the expected response from the notification service.
type NotificationResponse struct {
	Success                 bool    `json:"success"`
	Message                 string  `json:"message"`
	MessageID               *string `json:"messageId,omitempty"`               // For send
	ScheduledNotificationID *string `json:"scheduledNotificationId,omitempty"` // For schedule
	Error                   *string `json:"error,omitempty"`
}

// SendNotification sends a request to the notification service to dispatch an email immediately.
func (c *NotificationServiceClient) SendNotification(req SendNotificationRequest) (*NotificationResponse, error) {
	if c.baseURL == "" {
		slog.Warn("NotificationServiceClient: Base URL is not configured. Skipping notification.", "type", req.Type, "recipient", req.RecipientEmail)
		return nil, fmt.Errorf("notification service URL is not configured")
	}

	payloadBytes, err := json.Marshal(req)
	if err != nil {
		slog.Error("NotificationServiceClient: Failed to marshal SendNotificationRequest", "error", err, "request_type", req.Type)
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	url := fmt.Sprintf("%s/api/v1/notifications/send", c.baseURL)
	httpReq, err := http.NewRequest("POST", url, bytes.NewBuffer(payloadBytes))
	if err != nil {
		slog.Error("NotificationServiceClient: Failed to create HTTP request for send", "error", err, "url", url)
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")
	// TODO: Add authentication header if the notification service requires it (e.g., internal service token)

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		slog.Error("NotificationServiceClient: HTTP request to send notification failed", "error", err, "url", url)
		return nil, fmt.Errorf("request to notification service failed: %w", err)
	}
	defer resp.Body.Close()

	var notificationResp NotificationResponse
	if err := json.NewDecoder(resp.Body).Decode(&notificationResp); err != nil {
		slog.Error("NotificationServiceClient: Failed to decode send notification response", "error", err, "status_code", resp.StatusCode)
		return nil, fmt.Errorf("failed to decode response: %w (status: %d)", err, resp.StatusCode)
	}

	if resp.StatusCode >= 400 { // Includes 4xx and 5xx errors
		slog.Error("NotificationServiceClient: Send notification request failed with error code",
			"status_code", resp.StatusCode, "url", url, "response_message", notificationResp.Message, "response_error", notificationResp.Error)
		errMsg := fmt.Sprintf("notification service returned error (status %d)", resp.StatusCode)
		if notificationResp.Error != nil {
			errMsg = fmt.Sprintf("%s: %s", errMsg, *notificationResp.Error)
		} else if notificationResp.Message != "" {
			errMsg = fmt.Sprintf("%s: %s", errMsg, notificationResp.Message)
		}
		return &notificationResp, fmt.Errorf(errMsg)
	}

	slog.Info("NotificationServiceClient: Send notification request successful", "type", req.Type, "recipient", req.RecipientEmail, "message_id", notificationResp.MessageID)
	return &notificationResp, nil
}

// ScheduleNotification sends a request to schedule a notification for later delivery.
func (c *NotificationServiceClient) ScheduleNotification(req ScheduleNotificationRequest) (*NotificationResponse, error) {
	if c.baseURL == "" {
		slog.Warn("NotificationServiceClient: Base URL is not configured. Skipping scheduling.", "type", req.Type, "booking_id", req.BookingID)
		return nil, fmt.Errorf("notification service URL is not configured")
	}

	payloadBytes, err := json.Marshal(req)
	if err != nil {
		slog.Error("NotificationServiceClient: Failed to marshal ScheduleNotificationRequest", "error", err, "request_type", req.Type)
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	url := fmt.Sprintf("%s/api/v1/notifications/schedule", c.baseURL)
	httpReq, err := http.NewRequest("POST", url, bytes.NewBuffer(payloadBytes))
	if err != nil {
		slog.Error("NotificationServiceClient: Failed to create HTTP request for schedule", "error", err, "url", url)
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")
	// TODO: Add authentication header if needed

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		slog.Error("NotificationServiceClient: HTTP request to schedule notification failed", "error", err, "url", url)
		return nil, fmt.Errorf("request to notification service failed: %w", err)
	}
	defer resp.Body.Close()

	var notificationResp NotificationResponse
	if err := json.NewDecoder(resp.Body).Decode(&notificationResp); err != nil {
		slog.Error("NotificationServiceClient: Failed to decode schedule notification response", "error", err, "status_code", resp.StatusCode)
		return nil, fmt.Errorf("failed to decode response: %w (status: %d)", err, resp.StatusCode)
	}

	if resp.StatusCode >= 400 {
		slog.Error("NotificationServiceClient: Schedule notification request failed with error code",
			"status_code", resp.StatusCode, "url", url, "response_message", notificationResp.Message, "response_error", notificationResp.Error)
		errMsg := fmt.Sprintf("notification scheduling service returned error (status %d)", resp.StatusCode)
		if notificationResp.Error != nil {
			errMsg = fmt.Sprintf("%s: %s", errMsg, *notificationResp.Error)
		} else if notificationResp.Message != "" {
			errMsg = fmt.Sprintf("%s: %s", errMsg, notificationResp.Message)
		}
		return &notificationResp, fmt.Errorf(errMsg)
	}

	slog.Info("NotificationServiceClient: Schedule notification request successful", "type", req.Type, "booking_id", req.BookingID, "scheduled_id", notificationResp.ScheduledNotificationID)
	return &notificationResp, nil
}

// Ensure logger is initialized and available. If not, a placeholder can be used:
// var logger = struct {
//   Infow func(msg string, keysAndValues ...interface{})
//   Warnw func(msg string, keysAndValues ...interface{})
//   Errorw func(msg string, keysAndValues ...interface{})
// }{
//   Infow: func(msg string, keysAndValues ...interface{}) { fmt.Printf("INFO: %s %v\n", msg, keysAndValues) },
//   Warnw: func(msg string, keysAndValues ...interface{}) { fmt.Printf("WARN: %s %v\n", msg, keysAndValues) },
//   Errorw: func(msg string, keysAndValues ...interface{}) { fmt.Printf("ERROR: %s %v\n", msg, keysAndValues) },
// }
// This assumes the actual logger is in `github.com/slotwise-app/services/scheduling-service/internal/utils/logger`
// and has Infow, Warnw, Errorw methods.
// The actual logger setup will be in the service's main or utils package.
// For now, this client assumes such a logger is available.
// The import path for logger might need adjustment based on actual project structure.
// If using a standard library logger like "log", replace logger calls accordingly.
// e.g., log.Printf("ERROR: Failed to marshal: %v", err)
// For this task, I'm assuming a structured logger like Zap or Logr is in use via the logger package.
// The `utils/logger` path seems plausible for a structured logger.
// The `config.NotificationServiceURL` also needs to be added to `config.go`.
