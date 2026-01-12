import { API_BASE_URL, getAuthToken } from '@/lib/api/config';
import { scheduleNotification } from './notificationService';
import { useNotificationStore } from '@/store/notificationStore';

export interface SaleEvent {
  type: string;
  saleId: number;
  productName: string;
  quantity: number;
  totalPrice: number;
  currency: string;
  sellerName: string;
  branchName?: string;
  createdAt: string;
}

class SSEClient {
  private eventSource: EventSource | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000; // 3 seconds
  private isConnected = false;

  connect(): void {
    if (this.isConnected && this.eventSource) {
      return; // Already connected
    }

    this.establishConnection();
  }

  private async establishConnection(): Promise<void> {
    try {
      const token = await getAuthToken();
      if (!token) {
        console.warn('No auth token available for SSE connection');
        return;
      }

      // Close existing connection if any
      this.disconnect();

      const url = `${API_BASE_URL}/sales/events`;
      
      // Note: EventSource doesn't support custom headers in browser
      // For React Native, we'll need to use fetch with streaming or a library
      // For now, we'll use a workaround with query parameter (not ideal for production)
      // In production, you might want to use a library like react-native-sse
      
      // Using fetch with streaming for React Native compatibility
      this.connectWithFetch(url, token);
    } catch (error) {
      console.error('Error establishing SSE connection:', error);
      this.scheduleReconnect();
    }
  }

  private async connectWithFetch(url: string, token: string): Promise<void> {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache',
        },
      });

      if (!response.ok) {
        throw new Error(`SSE connection failed: ${response.status}`);
      }

      this.isConnected = true;
      this.reconnectAttempts = 0;

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('Response body is not readable');
      }

      let buffer = '';

      const readChunk = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            
            if (done) {
              console.log('SSE stream ended');
              this.isConnected = false;
              this.scheduleReconnect();
              break;
            }

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep incomplete line in buffer

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6); // Remove 'data: ' prefix
                if (data.trim()) {
                  this.handleMessage(data);
                }
              }
            }
          }
        } catch (error) {
          console.error('Error reading SSE stream:', error);
          this.isConnected = false;
          this.scheduleReconnect();
        }
      };

      readChunk();
    } catch (error) {
      console.error('Error connecting to SSE:', error);
      this.isConnected = false;
      this.scheduleReconnect();
    }
  }

  private handleMessage(data: string): void {
    try {
      const event = JSON.parse(data);
      
      if (event.type === 'connected') {
        console.log('SSE connected successfully');
        return;
      }

      if (event.type === 'new_sale') {
        this.handleSaleEvent(event as SaleEvent);
      }
    } catch (error) {
      console.error('Error parsing SSE message:', error);
    }
  }

  private async handleSaleEvent(event: SaleEvent): Promise<void> {
    console.log('New sale event received:', event);

    // Show push notification
    const title = 'New Sale Recorded';
    const body = `${event.sellerName} sold ${event.quantity} ${event.productName} for ${event.currency} ${event.totalPrice.toFixed(2)}`;
    
    await scheduleNotification(title, body, {
      type: 'sale',
      saleId: event.saleId.toString(),
      productName: event.productName,
    });

    // Update notification store
    const notificationStore = useNotificationStore.getState();
    notificationStore.addNotification({
      type: 'sale',
      title,
      message: body,
      relatedId: event.saleId.toString(),
    });

    // Update unread count
    notificationStore.pollUnreadCount();
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnect attempts reached. Stopping SSE client.');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * this.reconnectAttempts; // Exponential backoff

    console.log(`Scheduling SSE reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(() => {
      this.establishConnection();
    }, delay);
  }

  disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.isConnected = false;
    this.reconnectAttempts = 0;
  }

  isConnectedToServer(): boolean {
    return this.isConnected;
  }
}

// Singleton instance
export const sseClient = new SSEClient();
