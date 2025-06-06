/**
 * UI Store - Zustand State Management
 * 
 * This store manages global UI state including loading states, modals,
 * notifications, and other UI-related state.
 */

import { create } from 'zustand';

// Notification types
export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number; // in milliseconds, 0 for persistent
  action?: {
    label: string;
    onClick: () => void;
  };
  createdAt: Date;
}

// Modal types
export interface Modal {
  id: string;
  component: React.ComponentType<any>;
  props?: any;
  options?: {
    closable?: boolean;
    backdrop?: boolean;
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  };
}

interface UiState {
  // Loading states
  isGlobalLoading: boolean;
  loadingStates: Record<string, boolean>;
  
  // Notifications
  notifications: Notification[];
  
  // Modals
  modals: Modal[];
  
  // Sidebar state
  sidebarCollapsed: boolean;
  
  // Mobile menu state
  mobileMenuOpen: boolean;
  
  // Theme
  theme: 'light' | 'dark' | 'system';
  
  // Actions
  setGlobalLoading: (loading: boolean) => void;
  setLoading: (key: string, loading: boolean) => void;
  isLoading: (key: string) => boolean;
  
  // Notification actions
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt'>) => string;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  
  // Modal actions
  openModal: (modal: Omit<Modal, 'id'>) => string;
  closeModal: (id: string) => void;
  closeAllModals: () => void;
  
  // UI state actions
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleMobileMenu: () => void;
  setMobileMenuOpen: (open: boolean) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
}

export const useUiStore = create<UiState>((set, get) => ({
  // Initial state
  isGlobalLoading: false,
  loadingStates: {},
  notifications: [],
  modals: [],
  sidebarCollapsed: false,
  mobileMenuOpen: false,
  theme: 'system',

  // Loading state actions
  setGlobalLoading: (loading: boolean) => {
    set({ isGlobalLoading: loading });
  },

  setLoading: (key: string, loading: boolean) => {
    set((state) => ({
      loadingStates: {
        ...state.loadingStates,
        [key]: loading,
      },
    }));
  },

  isLoading: (key: string) => {
    return get().loadingStates[key] || false;
  },

  // Notification actions
  addNotification: (notification) => {
    const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newNotification: Notification = {
      ...notification,
      id,
      createdAt: new Date(),
      duration: notification.duration ?? 5000, // Default 5 seconds
    };

    set((state) => ({
      notifications: [...state.notifications, newNotification],
    }));

    // Auto-remove notification after duration
    if (newNotification.duration > 0) {
      setTimeout(() => {
        get().removeNotification(id);
      }, newNotification.duration);
    }

    return id;
  },

  removeNotification: (id: string) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    }));
  },

  clearNotifications: () => {
    set({ notifications: [] });
  },

  // Modal actions
  openModal: (modal) => {
    const id = `modal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newModal: Modal = {
      ...modal,
      id,
      options: {
        closable: true,
        backdrop: true,
        size: 'md',
        ...modal.options,
      },
    };

    set((state) => ({
      modals: [...state.modals, newModal],
    }));

    return id;
  },

  closeModal: (id: string) => {
    set((state) => ({
      modals: state.modals.filter((m) => m.id !== id),
    }));
  },

  closeAllModals: () => {
    set({ modals: [] });
  },

  // UI state actions
  toggleSidebar: () => {
    set((state) => ({
      sidebarCollapsed: !state.sidebarCollapsed,
    }));
  },

  setSidebarCollapsed: (collapsed: boolean) => {
    set({ sidebarCollapsed: collapsed });
  },

  toggleMobileMenu: () => {
    set((state) => ({
      mobileMenuOpen: !state.mobileMenuOpen,
    }));
  },

  setMobileMenuOpen: (open: boolean) => {
    set({ mobileMenuOpen: open });
  },

  setTheme: (theme: 'light' | 'dark' | 'system') => {
    set({ theme });
    
    // Apply theme to document
    if (typeof window !== 'undefined') {
      const root = window.document.documentElement;
      
      if (theme === 'system') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        root.classList.toggle('dark', systemTheme === 'dark');
      } else {
        root.classList.toggle('dark', theme === 'dark');
      }
      
      // Store theme preference
      localStorage.setItem('slotwise-theme', theme);
    }
  },
}));

// Utility functions for common notification patterns
export const notificationUtils = {
  success: (title: string, message?: string) => {
    return useUiStore.getState().addNotification({
      type: 'success',
      title,
      message,
    });
  },

  error: (title: string, message?: string) => {
    return useUiStore.getState().addNotification({
      type: 'error',
      title,
      message,
      duration: 0, // Persistent for errors
    });
  },

  warning: (title: string, message?: string) => {
    return useUiStore.getState().addNotification({
      type: 'warning',
      title,
      message,
      duration: 7000, // Longer duration for warnings
    });
  },

  info: (title: string, message?: string) => {
    return useUiStore.getState().addNotification({
      type: 'info',
      title,
      message,
    });
  },

  loading: (title: string, message?: string) => {
    return useUiStore.getState().addNotification({
      type: 'info',
      title,
      message,
      duration: 0, // Persistent until manually removed
    });
  },
};

// Initialize theme on app load
if (typeof window !== 'undefined') {
  const savedTheme = localStorage.getItem('slotwise-theme') as 'light' | 'dark' | 'system' | null;
  if (savedTheme) {
    useUiStore.getState().setTheme(savedTheme);
  } else {
    useUiStore.getState().setTheme('system');
  }

  // Listen for system theme changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    const currentTheme = useUiStore.getState().theme;
    if (currentTheme === 'system') {
      const root = window.document.documentElement;
      root.classList.toggle('dark', e.matches);
    }
  });
}

export default useUiStore;
