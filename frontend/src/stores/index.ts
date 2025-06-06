/**
 * Stores Index
 * 
 * This module exports all Zustand stores for easy importing
 * following SlotWise patterns and conventions.
 */

// Zustand Stores
export * from './authStore';
export * from './businessStore';
export * from './uiStore';

// Store utilities
export { default as useAuthStore } from './authStore';
export { default as useBusinessStore } from './businessStore';
export { default as useUiStore } from './uiStore';

