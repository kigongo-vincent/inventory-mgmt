import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Get API base URL from .env.dev file
 * The URL is loaded via app.config.js which reads from .env.dev
 * This is the single source of truth for the API base URL
 */
const getApiBaseUrl = (): string => {
  // Get API URL from app.config.js (which reads from .env.dev)
  // This is the centralized location - always comes from .env.dev
  const apiUrl =
    Constants.expoConfig?.extra?.apiBaseUrl ||
    (__DEV__ ? 'http://192.168.1.11:8080/api/v1' : 'https://your-api-domain.com/api/v1');

  // Log the API URL being used (only in development)
  if (__DEV__) {
    const source = Constants.expoConfig?.extra?.apiBaseUrl
      ? '.env.dev (via app.config.js)'
      : 'fallback default';
    console.log('═══════════════════════════════════════');
    console.log(`🔗 API Configuration`);
    console.log(`   Base URL: ${apiUrl}`);
    console.log(`   Source: ${source}`);
    if (!Constants.expoConfig?.extra?.apiBaseUrl) {
      console.warn('⚠️  API_BASE_URL not found in .env.dev, using fallback');
    }
    console.log('═══════════════════════════════════════');
  }

  return apiUrl;
};

/**
 * API Base URL - Centralized configuration
 * 
 * This value comes from .env.dev file via app.config.js
 * To change the API URL, update API_BASE_URL in .env.dev
 * 
 * For physical devices, use your machine's IP address instead of localhost
 * Example: API_BASE_URL=http://192.168.1.100:8080/api/v1
 */
export const API_BASE_URL = getApiBaseUrl();

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface ApiError {
  error: string;
  message?: string;
  code?: string;
  details?: string;
}

// Callback for handling authentication errors (401)
let onAuthError: (() => void) | null = null;

export function setAuthErrorHandler(handler: () => void) {
  onAuthError = handler;
}

// Helper function to handle API responses
export async function handleResponse<T>(response: Response, endpoint?: string): Promise<T> {
  const contentType = response.headers.get('content-type');

  if (__DEV__) {
    console.log('🔍 Response Status:', response.status, response.statusText);
    console.log('🔍 Response OK:', response.ok);
    console.log('🔍 Content-Type:', contentType);
  }

  if (!response.ok) {
    let errorMessage = 'An error occurred';
    let errorCode: string | undefined;
    let errorData: any = null;

    if (contentType?.includes('application/json')) {
      const error: ApiError = await response.json();
      errorData = error;
      errorMessage = error.error || error.message || errorMessage;
      errorCode = error.code;
      
      if (__DEV__) {
        console.error('❌ API Error Response:', JSON.stringify(error, null, 2));
      }
    } else {
      const textError = await response.text();
      errorMessage = textError || errorMessage;
      errorData = textError;
      
      if (__DEV__) {
        console.error('❌ API Error Response (text):', textError);
      }
    }
    
    if (__DEV__) {
      console.error('❌ API Error Details:', {
        status: response.status,
        statusText: response.statusText,
        errorMessage,
        errorCode,
        errorData,
      });
    }

    // Handle 401 Unauthorized - token expired or invalid
    if (response.status === 401) {
      // Only trigger auto-logout for actual authentication failures, not resource-specific errors
      // Resource errors like "user not found" or "product not found" shouldn't trigger logout
      // Also, don't trigger logout for login endpoint failures (user is trying to authenticate)
      const isLoginEndpoint = endpoint?.includes('/users/login') || false;
      const isResourceError = errorMessage?.toLowerCase().includes('not found') ||
                             errorCode === 'USER_NOT_FOUND' ||
                             errorCode === 'PRODUCT_NOT_FOUND' ||
                             errorCode === 'BRANCH_NOT_FOUND';
      const isAuthFailure = !isLoginEndpoint && !isResourceError && (
        errorCode === 'MISSING_AUTH_HEADER' || 
        errorCode === 'UNAUTHORIZED' || 
        errorMessage?.toLowerCase().includes('authorization') ||
        errorMessage?.toLowerCase().includes('token') ||
        (errorMessage?.toLowerCase().includes('unauthorized') && !errorMessage?.toLowerCase().includes('invalid credentials'))
      );
      
      if (isAuthFailure && onAuthError) {
        // Only logout on actual authentication failures (not login attempts or resource errors)
        onAuthError();
      }

      // Create a specific error for auth failures
      const authError = new Error(errorMessage);
      (authError as any).code = errorCode || 'UNAUTHORIZED';
      (authError as any).status = 401;
      throw authError;
    }

    const apiError = new Error(errorMessage);
    (apiError as any).code = errorCode;
    (apiError as any).status = response.status;
    throw apiError;
  }

  if (contentType?.includes('application/json')) {
    const jsonData = await response.json();
    if (__DEV__) {
      console.log('✅ API Response Body:', JSON.stringify(jsonData, null, 2));
    }
    return jsonData;
  }

  const textData = await response.text();
  if (__DEV__) {
    console.log('✅ API Response Body (text):', textData);
  }
  return textData as unknown as T;
}

// Helper function to get auth token from storage
export async function getAuthToken(): Promise<string | null> {
  try {
    const token = await AsyncStorage.getItem('auth_token');
    if (__DEV__ && !token) {
      console.warn('⚠️ No auth token found in storage');
    }
    return token;
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
}

// Helper function to set auth token in storage
export async function setAuthToken(token: string): Promise<void> {
  try {
    await AsyncStorage.setItem('auth_token', token);
  } catch (error) {
    console.error('Error setting auth token:', error);
  }
}

// Helper function to remove auth token from storage
export async function removeAuthToken(): Promise<void> {
  try {
    await AsyncStorage.removeItem('auth_token');
  } catch (error) {
    console.error('Error removing auth token:', error);
  }
}

// Helper function to make API requests
export async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  // Don't send auth token for login endpoint (it's a public route)
  const isLoginEndpoint = endpoint === '/users/login';
  const token = isLoginEndpoint ? null : await getAuthToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  } else if (__DEV__ && !isLoginEndpoint) {
    console.warn('⚠️ No auth token found for API request:', endpoint);
  }

  const fullUrl = `${API_BASE_URL}${endpoint}`;

  // Log request details in development
  if (__DEV__) {
    console.log(`🌐 API Request: ${options.method || 'GET'} ${fullUrl}`);
    if (token) {
      console.log('🔑 Auth token present:', token.substring(0, 20) + '...');
    } else {
      console.warn('⚠️ No auth token for request:', endpoint);
    }
    if (options.body) {
      try {
        const bodyObj = JSON.parse(options.body as string);
        console.log('📦 Request Body:', JSON.stringify(bodyObj, null, 2));
      } catch (e) {
        console.log('📦 Request Body (raw):', options.body);
      }
    }
  }

  try {
    const response = await fetch(fullUrl, {
      ...options,
      headers,
    });

    if (__DEV__) {
      console.log(`📡 API Response: ${response.status} ${response.statusText} for ${fullUrl}`);
    }
    
    return handleResponse<T>(response, endpoint);
  } catch (error: any) {
    // Enhanced error logging
    if (__DEV__) {
      console.error(`❌ API Request Failed:`, {
        url: fullUrl,
        method: options.method || 'GET',
        error: error.message,
        errorType: error.name,
        stack: error.stack,
      });
    }

    // Re-throw with more context
    const enhancedError = new Error(error.message || 'Network request failed') as any;
    enhancedError.originalError = error;
    enhancedError.url = fullUrl;
    enhancedError.method = options.method || 'GET';
    throw enhancedError;
  }
}
