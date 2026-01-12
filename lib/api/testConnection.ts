import { API_BASE_URL } from './config';

/**
 * Test connectivity to the backend server
 * This can be called from the app to verify the connection
 */
export async function testConnection(): Promise<{ success: boolean; message: string }> {
  try {
    console.log('🧪 Testing connection to:', API_BASE_URL);
    
    const response = await fetch(`${API_BASE_URL.replace('/api/v1', '')}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Connection test successful:', data);
      return {
        success: true,
        message: `Successfully connected to ${API_BASE_URL}`,
      };
    } else {
      console.warn('⚠️ Connection test returned status:', response.status);
      return {
        success: false,
        message: `Server responded with status ${response.status}`,
      };
    }
  } catch (error: any) {
    console.error('❌ Connection test failed:', error);
    return {
      success: false,
      message: `Failed to connect: ${error.message || 'Network request failed'}`,
    };
  }
}
