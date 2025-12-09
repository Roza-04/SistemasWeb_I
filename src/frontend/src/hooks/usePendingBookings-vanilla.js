/**
 * Pending Bookings Manager
 * Manages polling and state for pending booking requests
 * Vanilla JS version
 */

class PendingBookingsManager {
  constructor() {
    this.summary = null;
    this.visible = false;
    this.token = null;
    this.intervalId = null;
    this.listeners = [];
    this.POLLING_INTERVAL = 5000; // 5 seconds
    this.API_URL = 'http://127.0.0.1:8000';
  }

  /**
   * Initialize with authentication token
   * @param {string} token - JWT token
   */
  init(token) {
    this.token = token;
    
    if (token) {
      this.startPolling();
    } else {
      this.stopPolling();
      this.reset();
    }
  }

  /**
   * Start polling for pending bookings
   */
  startPolling() {
    // Initial fetch
    this.fetchSummary();

    // Set up polling interval
    this.intervalId = setInterval(() => {
      this.fetchSummary();
    }, this.POLLING_INTERVAL);
  }

  /**
   * Stop polling
   */
  stopPolling() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Fetch pending bookings summary from API
   */
  async fetchSummary() {
    if (!this.token) {
      console.log('PendingBookingsManager: No token, skipping fetch');
      this.reset();
      return;
    }

    try {
      const response = await fetch(`${this.API_URL}/api/bookings/pending-summary`, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.error('Failed to fetch pending summary:', response.status);
        this.reset();
        return;
      }

      const data = await response.json();
      this.summary = data;

      // Show banner if there are pending bookings
      if (data.total_pending > 0) {
        this.setVisible(true);
      } else {
        this.setVisible(false);
      }

      this.notifyListeners();
    } catch (error) {
      console.error('Error fetching pending summary:', error);
      this.reset();
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
   * Dismiss the banner
   */
  dismiss() {
    this.setVisible(false);
  }

  /**
   * Refresh data immediately
   */
  refresh() {
    this.fetchSummary();
  }

  /**
   * Reset state
   */
  reset() {
    this.summary = null;
    this.visible = false;
    this.notifyListeners();
  }

  /**
   * Add state change listener
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
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
      visible: this.visible
    };
    this.listeners.forEach(callback => callback(state));
  }

  /**
   * Get current state
   * @returns {Object} Current state
   */
  getState() {
    return {
      summary: this.summary,
      visible: this.visible
    };
  }

  /**
   * Cleanup
   */
  destroy() {
    this.stopPolling();
    this.reset();
    this.listeners = [];
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PendingBookingsManager };
}
