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

/** Recursively validate SSE response: format (data: ...) and JSON event shape. */
function validateSSELine(line: string): { valid: true; data: string } | { valid: false; reason: string } {
  const trimmed = line.trim();
  if (!trimmed) {
    return { valid: false, reason: 'empty line' };
  }
  if (!trimmed.startsWith('data: ')) {
    return { valid: false, reason: 'missing data: prefix' };
  }
  const data = trimmed.slice(6).trim();
  if (!data) {
    return { valid: false, reason: 'empty data payload' };
  }
  return { valid: true, data };
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Recursively validate event JSON: type required; for new_sale require known fields. */
function validateEventPayload(obj: unknown): { valid: true; event: Record<string, unknown> } | { valid: false; reason: string } {
  if (!isPlainObject(obj)) {
    return { valid: false, reason: 'event is not an object' };
  }
  if (typeof obj.type !== 'string' || !obj.type) {
    return { valid: false, reason: 'missing or invalid event.type' };
  }
  const type = obj.type as string;
  if (type === 'connected') {
    return { valid: true, event: obj };
  }
  if (type === 'new_sale') {
    if (typeof obj.saleId !== 'number') {
      return { valid: false, reason: 'new_sale.saleId must be a number' };
    }
    if (typeof obj.productName !== 'string') {
      return { valid: false, reason: 'new_sale.productName must be a string' };
    }
    if (typeof obj.quantity !== 'number') {
      return { valid: false, reason: 'new_sale.quantity must be a number' };
    }
    if (typeof obj.totalPrice !== 'number') {
      return { valid: false, reason: 'new_sale.totalPrice must be a number' };
    }
    if (typeof obj.currency !== 'string') {
      return { valid: false, reason: 'new_sale.currency must be a string' };
    }
    if (typeof obj.sellerName !== 'string') {
      return { valid: false, reason: 'new_sale.sellerName must be a string' };
    }
    if (typeof obj.createdAt !== 'string') {
      return { valid: false, reason: 'new_sale.createdAt must be a string' };
    }
    if (obj.branchName !== undefined && typeof obj.branchName !== 'string') {
      return { valid: false, reason: 'new_sale.branchName must be string if present' };
    }
    return { valid: true, event: obj };
  }
  return { valid: false, reason: `unknown event type: ${type}` };
}

class SSEClient {
  private eventSource: EventSource | null = null;
  private abortController: AbortController | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private isConnected = false;
  private isConnecting = false;

  connect(): void {
    if (this.isConnected && this.eventSource) {
      return;
    }
    if (this.isConnecting) {
      return; // Prevent overlapping connections (self-DDoS)
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

      this.disconnect(); // Abort any existing fetch and clear state

      this.isConnecting = true;
      const controller = new AbortController();
      this.abortController = controller;

      const url = `${API_BASE_URL}/sales/events`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'text/event-stream',
          'Cache-Control': 'no-cache',
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`SSE connection failed: ${response.status}`);
      }

      this.isConnected = true;
      this.isConnecting = false;
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
            buffer = lines.pop() || '';

            for (const line of lines) {
              const lineResult = validateSSELine(line);
              if (!lineResult.valid) {
                if (line.trim()) {
                  console.warn('SSE validation (line):', lineResult.reason);
                }
                continue;
              }
              try {
                const parsed = JSON.parse(lineResult.data) as unknown;
                const eventResult = validateEventPayload(parsed);
                if (!eventResult.valid) {
                  console.warn('SSE validation (payload):', eventResult.reason);
                  continue;
                }
                this.handleMessage(lineResult.data, eventResult.event);
              } catch (e) {
                console.warn('SSE JSON parse error:', e);
              }
            }
          }
        } catch (error: unknown) {
          if (error instanceof Error && error.name === 'AbortError') {
            this.isConnected = false;
            this.isConnecting = false;
            return; // User disconnect, do not reconnect
          }
          console.error('Error reading SSE stream:', error);
          this.isConnected = false;
          this.scheduleReconnect();
        } finally {
          this.isConnecting = false;
        }
      };

      readChunk();
    } catch (error: unknown) {
      this.isConnecting = false;
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      console.error('Error connecting to SSE:', error);
      this.isConnected = false;
      this.scheduleReconnect();
    }
  }

  private handleMessage(rawData: string, event: Record<string, unknown>): void {
    const type = event.type as string;
    if (type === 'connected') {
      console.log('SSE connected successfully');
      return;
    }
    if (type === 'new_sale') {
      this.handleSaleEvent(event as unknown as SaleEvent);
    }
  }

  private async handleSaleEvent(event: SaleEvent): Promise<void> {
    console.log('New sale event received:', event);

    const title = 'New Sale Recorded';
    const body = `${event.sellerName} sold ${event.quantity} ${event.productName} for ${event.currency} ${event.totalPrice.toFixed(2)}`;

    await scheduleNotification(title, body, {
      type: 'sale',
      saleId: event.saleId.toString(),
      productName: event.productName,
    });

    const notificationStore = useNotificationStore.getState();
    notificationStore.addNotification({
      type: 'sale',
      title,
      message: body,
      relatedId: event.saleId.toString(),
    });
    // Do not call pollUnreadCount() here — addNotification already bumps unread locally; avoids extra API load per event
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnect attempts reached. Stopping SSE client.');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * this.reconnectAttempts;

    console.log(
      `Scheduling SSE reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`
    );

    setTimeout(() => {
      this.establishConnection();
    }, delay);
  }

  disconnect(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.isConnected = false;
    this.isConnecting = false;
    this.reconnectAttempts = 0;
  }

  isConnectedToServer(): boolean {
    return this.isConnected;
  }
}

export const sseClient = new SSEClient();
