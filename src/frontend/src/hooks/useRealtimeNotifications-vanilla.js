/**
 * Realtime Notifications Manager
 * Manages WebSocket connections for real-time chat notifications
 * Vanilla JS version
 */

class RealtimeNotifications {
  constructor() {
    this.token = null;
    this.summary = null;
    this.visible = false;
    this.maxMessageId = 0;
    this.ws = null;
    this.listeners = [];
    this.STORAGE_KEY = 'lastDismissedMessageId';
    this.API_URL = 'http://127.0.0.1:8000';
  }

  /**
   * Initialize with authentication token
   * @param {string} token - JWT token
   */
  init(token) {
    this.token = token;
    if (token) {
      this.fetchInitial();
      this.connectWebSocket();
    } else {
      this.disconnect();
    }
  }

  /**
   * Fetch initial unread summary from REST API
   */
  async fetchInitial() {
    if (!this.token) return;

    try {
      const response = await fetch(`${this.API_URL}/api/chat/unread-summary`, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.error('Failed to fetch initial summary:', response.status);
        return;
      }

      const data = await response.json();
      this.summary = data;
      this.maxMessageId = data.max_message_id;

      const lastDismissed = Number(localStorage.getItem(this.STORAGE_KEY) || '0');

      if (data.total_unread > 0 && data.max_message_id > lastDismissed) {
        this.setVisible(true);
      } else {
        this.setVisible(false);
      }

      this.notifyListeners();
    } catch (error) {
      console.error('Error fetching initial summary:', error);
    }
  }

  /**
   * Connect to WebSocket for real-time updates
   */
  connectWebSocket() {
    if (!this.token) return;

    const wsUrl = this.API_URL
      .replace('http://', 'ws://')
      .replace('https://', 'wss://');

    const url = `${wsUrl}/ws/notifications?token=${this.token}`;

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleWebSocketMessage(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        // Attempt reconnection after 5 seconds
        setTimeout(() => {
          if (this.token) {
            this.connectWebSocket();
          }
        }, 5000);
      };
    } catch (error) {
      console.error('Error creating WebSocket:', error);
    }
  }

  /**
   * Handle incoming WebSocket messages
   * @param {Object} data - Message data
   */
  handleWebSocketMessage(data) {
    if (data.type === 'unread_summary') {
      this.summary = data.data;
      this.maxMessageId = data.data.max_message_id;

      const lastDismissed = Number(localStorage.getItem(this.STORAGE_KEY) || '0');

      if (data.data.total_unread > 0 && data.data.max_message_id > lastDismissed) {
        this.setVisible(true);
      }

      this.notifyListeners();
    }
  }

  /**
   * Set visibility and notify listeners
   * @param {boolean} visible - Visibility state
   */
  setVisible(visible) {
    this.visible = visible;
    this.notifyListeners();
  }

  /**
   * Dismiss notifications
   */
  dismiss() {
    if (this.maxMessageId > 0) {
      localStorage.setItem(this.STORAGE_KEY, String(this.maxMessageId));
    }
    this.setVisible(false);
  }

  /**
   * Add state change listener
   * @param {Function} callback - Callback function
   */
  addListener(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  /**
   * Notify all listeners of state change
   */
  notifyListeners() {
    const state = {
      summary: this.summary,
      visible: this.visible,
      maxMessageId: this.maxMessageId
    };
    this.listeners.forEach(callback => callback(state));
  }

  /**
   * Disconnect WebSocket and reset state
   */
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.token = null;
    this.summary = null;
    this.visible = false;
    this.maxMessageId = 0;
    this.notifyListeners();
  }

  /**
   * Get current state
   * @returns {Object} Current state
   */
  getState() {
    return {
      summary: this.summary,
      visible: this.visible,
      maxMessageId: this.maxMessageId
    };
  }
}

// Export singleton instance
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { RealtimeNotifications };
}
