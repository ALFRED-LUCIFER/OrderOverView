// API Configuration constants

// Get API URL from environment variables with fallback
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// WebSocket URL for real-time communication
export const WEBSOCKET_URL = import.meta.env.VITE_WEBSOCKET_URL || 'ws://localhost:3001';

// Voice interface configuration
export const VOICE_ENABLED = import.meta.env.VITE_ENABLE_VOICE === 'true';

// ElevenLabs TTS configuration
export const ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY;

// Application constants
export const APP_NAME = 'Glass Order Management System';
export const APP_VERSION = '1.0.0';

// API endpoints
export const API_ENDPOINTS = {
  CUSTOMERS: '/api/customers',
  ORDERS: '/api/orders',
  REPORTS: '/api/reports',
  VOICE: '/api/voice',
  HEALTH: '/api/health'
} as const;

// Environment configuration
export const IS_DEVELOPMENT = import.meta.env.MODE === 'development';
export const IS_PRODUCTION = import.meta.env.PROD;

// Export default configuration
export default {
  API_BASE_URL,
  WEBSOCKET_URL,
  VOICE_ENABLED,
  ELEVENLABS_API_KEY,
  APP_NAME,
  APP_VERSION,
  IS_DEVELOPMENT,
  IS_PRODUCTION
};
