package logger

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"strings"
	"time"
)

// Logger interface defines the logging methods
type Logger interface {
	Debug(msg string, args ...interface{})
	Info(msg string, args ...interface{})
	Warn(msg string, args ...interface{})
	Error(msg string, args ...interface{})
	Fatal(msg string, args ...interface{})
	With(args ...interface{}) Logger
	WithContext(ctx context.Context) Logger
}

// logger implements the Logger interface using slog
type logger struct {
	slog *slog.Logger
	ctx  context.Context
}

// New creates a new logger instance
func New(level string) Logger {
	var logLevel slog.Level
	switch strings.ToLower(level) {
	case "debug":
		logLevel = slog.LevelDebug
	case "info":
		logLevel = slog.LevelInfo
	case "warn", "warning":
		logLevel = slog.LevelWarn
	case "error":
		logLevel = slog.LevelError
	default:
		logLevel = slog.LevelInfo
	}

	// Create a structured logger with JSON output
	opts := &slog.HandlerOptions{
		Level: logLevel,
		ReplaceAttr: func(groups []string, a slog.Attr) slog.Attr {
			// Customize timestamp format
			if a.Key == slog.TimeKey {
				return slog.Attr{
					Key:   "timestamp",
					Value: slog.StringValue(time.Now().UTC().Format(time.RFC3339)),
				}
			}
			return a
		},
	}

	handler := slog.NewJSONHandler(os.Stdout, opts)
	slogger := slog.New(handler)

	return &logger{
		slog: slogger,
		ctx:  context.Background(),
	}
}

// Debug logs a debug message
func (l *logger) Debug(msg string, args ...interface{}) {
	l.slog.DebugContext(l.ctx, msg, l.convertArgs(args...)...)
}

// Info logs an info message
func (l *logger) Info(msg string, args ...interface{}) {
	l.slog.InfoContext(l.ctx, msg, l.convertArgs(args...)...)
}

// Warn logs a warning message
func (l *logger) Warn(msg string, args ...interface{}) {
	l.slog.WarnContext(l.ctx, msg, l.convertArgs(args...)...)
}

// Error logs an error message
func (l *logger) Error(msg string, args ...interface{}) {
	l.slog.ErrorContext(l.ctx, msg, l.convertArgs(args...)...)
}

// Fatal logs a fatal message and exits
func (l *logger) Fatal(msg string, args ...interface{}) {
	l.slog.ErrorContext(l.ctx, msg, l.convertArgs(args...)...)
	os.Exit(1)
}

// With returns a new logger with additional fields
func (l *logger) With(args ...interface{}) Logger {
	return &logger{
		slog: l.slog.With(l.convertArgs(args...)...),
		ctx:  l.ctx,
	}
}

// WithContext returns a new logger with context
func (l *logger) WithContext(ctx context.Context) Logger {
	return &logger{
		slog: l.slog,
		ctx:  ctx,
	}
}

// convertArgs converts variadic arguments to slog.Attr
func (l *logger) convertArgs(args ...interface{}) []any {
	if len(args) == 0 {
		return nil
	}

	// If args length is odd, add a nil value to make it even
	if len(args)%2 != 0 {
		args = append(args, nil)
	}

	result := make([]any, 0, len(args))
	for i := 0; i < len(args); i += 2 {
		key := args[i]
		value := args[i+1]

		// Convert key to string
		var keyStr string
		if k, ok := key.(string); ok {
			keyStr = k
		} else {
			keyStr = fmt.Sprintf("%v", key)
		}

		result = append(result, keyStr, value)
	}

	return result
}

// RequestLogger creates a logger with request-specific fields
func RequestLogger(baseLogger Logger, requestID, method, path string) Logger {
	return baseLogger.With(
		"request_id", requestID,
		"method", method,
		"path", path,
	)
}

// ErrorLogger creates a logger with error-specific fields
func ErrorLogger(baseLogger Logger, err error, operation string) Logger {
	return baseLogger.With(
		"error", err.Error(),
		"operation", operation,
	)
}

// UserLogger creates a logger with user-specific fields
func UserLogger(baseLogger Logger, userID, email string) Logger {
	return baseLogger.With(
		"user_id", userID,
		"email", email,
	)
}

// ServiceLogger creates a logger with service-specific fields
func ServiceLogger(baseLogger Logger, service, version string) Logger {
	return baseLogger.With(
		"service", service,
		"version", version,
	)
}

// DatabaseLogger creates a logger with database-specific fields
func DatabaseLogger(baseLogger Logger, operation, table string, duration time.Duration) Logger {
	return baseLogger.With(
		"db_operation", operation,
		"db_table", table,
		"duration_ms", duration.Milliseconds(),
	)
}

// HTTPLogger creates a logger with HTTP-specific fields
func HTTPLogger(baseLogger Logger, statusCode int, duration time.Duration, userAgent string) Logger {
	return baseLogger.With(
		"status_code", statusCode,
		"duration_ms", duration.Milliseconds(),
		"user_agent", userAgent,
	)
}

// SecurityLogger creates a logger with security-specific fields
func SecurityLogger(baseLogger Logger, event, userID, ipAddress string) Logger {
	return baseLogger.With(
		"security_event", event,
		"user_id", userID,
		"ip_address", ipAddress,
	)
}

// PerformanceLogger creates a logger with performance-specific fields
func PerformanceLogger(baseLogger Logger, operation string, duration time.Duration, success bool) Logger {
	return baseLogger.With(
		"performance_operation", operation,
		"duration_ms", duration.Milliseconds(),
		"success", success,
	)
}

// Default logger instance
var defaultLogger Logger

// init initializes the default logger
func init() {
	defaultLogger = New("info")
}

// SetDefault sets the default logger
func SetDefault(l Logger) {
	defaultLogger = l
}

// Default returns the default logger
func Default() Logger {
	return defaultLogger
}

// Package-level convenience functions
func Debug(msg string, args ...interface{}) {
	defaultLogger.Debug(msg, args...)
}

func Info(msg string, args ...interface{}) {
	defaultLogger.Info(msg, args...)
}

func Warn(msg string, args ...interface{}) {
	defaultLogger.Warn(msg, args...)
}

func Error(msg string, args ...interface{}) {
	defaultLogger.Error(msg, args...)
}

func Fatal(msg string, args ...interface{}) {
	defaultLogger.Fatal(msg, args...)
}

func With(args ...interface{}) Logger {
	return defaultLogger.With(args...)
}

func WithContext(ctx context.Context) Logger {
	return defaultLogger.WithContext(ctx)
}
