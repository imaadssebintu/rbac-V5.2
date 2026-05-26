
export const APP_NAME = 'Voya';
export const APP_VERSION = '1.0.0';

// User roles
export const USER_ROLES = {
  ADMIN: 'admin',
  WALKER: 'walker',
  WALKEE: 'walkee'
};

// Task status
export const TASK_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

// Payment status
export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  FAILED: 'failed',
  REFUNDED: 'refunded'
};

// Notification types
export const NOTIFICATION_TYPES = {
  NEW_TASK: 'new_task',
  TASK_ACCEPTED: 'task_accepted',
  TASK_COMPLETED: 'task_completed',
  NEW_MESSAGE: 'new_message',
  NEW_REVIEW: 'new_review',
  PAYMENT_RECEIVED: 'payment_received',
  SYSTEM: 'system'
};

// Theme modes
export const THEME_MODES = {
  LIGHT: 'light',
  DARK: 'dark'
};

// Map defaults
export const MAP_DEFAULTS = {
  DEFAULT_CENTER: [40.7128, -74.0060], // NYC
  DEFAULT_ZOOM: 12,
  MIN_ZOOM: 10,
  MAX_ZOOM: 18,
  SEARCH_RADIUS: 10 // miles
};

// API endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    ME: '/auth/me',
    LOGOUT: '/auth/logout'
  },
  TASKS: {
    BASE: '/tasks',
    NEARBY: '/tasks/nearby',
    MINE: '/tasks/mine'
  },
  USERS: {
    BASE: '/users',
    PROFILE: '/users/profile',
    UPLOAD_IMAGE: '/users/upload-image'
  },
  MESSAGES: {
    BASE: '/messages',
    CONVERSATIONS: '/messages/conversations'
  },
  PAYMENTS: {
    BASE: '/payments',
    CREATE_INTENT: '/payments/create-intent',
    CONFIRM: '/payments/confirm'
  },
  RATINGS: {
    BASE: '/ratings',
    WALKER: '/ratings/walker'
  }
};

// Validation constants
export const VALIDATION = {
  EMAIL_MAX_LENGTH: 255,
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 100,
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 100,
  TITLE_MIN_LENGTH: 5,
  TITLE_MAX_LENGTH: 200,
  DESCRIPTION_MAX_LENGTH: 2000
};

// File upload constants
export const UPLOAD = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  MAX_IMAGES_PER_POST: 10,
  MAX_IMAGES_PER_TASK: 5
};

// Price constants
export const PRICING = {
  MIN_WALK_PRICE: 10,
  MAX_WALK_PRICE: 200,
  PLATFORM_FEE_PERCENTAGE: 15,
  MIN_WALK_DURATION: 15, // minutes
  MAX_WALK_DURATION: 240 // minutes
};

// Date formats
export const DATE_FORMATS = {
  DISPLAY_DATE: 'MMM dd, yyyy',
  DISPLAY_TIME: 'h:mm a',
  DISPLAY_DATETIME: 'MMM dd, yyyy h:mm a',
  API_DATE: 'yyyy-MM-dd',
  API_DATETIME: "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"
};

// Social constants
export const SOCIAL = {
  POST_CHAR_LIMIT: 2000,
  COMMENT_CHAR_LIMIT: 500,
  MAX_TAGS_PER_POST: 30,
  MAX_MENTIONS_PER_POST: 10
};

// Local storage keys
export const STORAGE_KEYS = {
  TOKEN: 'walker_token',
  USER: 'walker_user',
  THEME: 'walker_theme',
  LOCATION: 'walker_location'
};

// Colors (Instagram-like palette)
export const COLORS = {
  PRIMARY: '#E4405F',
  PRIMARY_LIGHT: '#FF7AA2',
  PRIMARY_DARK: '#B32E4B',
  SECONDARY: '#4A90E2',
  SECONDARY_LIGHT: '#7BB4FF',
  SECONDARY_DARK: '#2C6FB7',
  SUCCESS: '#2ECC71',
  WARNING: '#F39C12',
  ERROR: '#E74C3C',
  INFO: '#3498DB',
  BACKGROUND_LIGHT: '#FAFAFA',
  BACKGROUND_DARK: '#121212',
  TEXT_LIGHT: '#262626',
  TEXT_DARK: '#FFFFFF',
  BORDER_LIGHT: '#DBDBDB',
  BORDER_DARK: '#363636',
  INSTAGRAM_GRADIENT: ['#405DE6', '#5851DB', '#833AB4', '#C13584', '#E1306C', '#FD1D1D']
};

// Rating constants
export const RATING = {
  MIN: 1,
  MAX: 5,
  STEP: 0.5,
  LABELS: {
    1: 'Poor',
    2: 'Fair',
    3: 'Good',
    4: 'Very Good',
    5: 'Excellent'
  }
};

// Navigation routes
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  PROFILE: '/profile',
  TASKS: '/tasks',
  MESSAGES: '/messages',
  SETTINGS: '/settings',
  EXPLORE: '/explore',
  NOTIFICATIONS: '/notifications',
  ANALYTICS: '/analytics',
  SCHEDULE: '/schedule',
  SOCIAL: '/social',
  ADMIN_WEBHOOKS: '/admin/webhooks'
};

export default {
  APP_NAME,
  USER_ROLES,
  TASK_STATUS,
  PAYMENT_STATUS,
  NOTIFICATION_TYPES,
  THEME_MODES,
  MAP_DEFAULTS,
  API_ENDPOINTS,
  VALIDATION,
  UPLOAD,
  PRICING,
  DATE_FORMATS,
  SOCIAL,
  STORAGE_KEYS,
  COLORS,
  RATING,
  ROUTES
};
