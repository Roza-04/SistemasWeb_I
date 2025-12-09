/**
 * Toast Notification System
 * Simple toast notification manager for vanilla JS
 * Based on useToast hook
 */

class ToastManager {
  constructor() {
    this.container = null;
    this.activeToast = null;
    this.defaultDuration = 3000;
    this.init();
  }

  /**
   * Initialize toast container
   */
  init() {
    if (typeof document === 'undefined') return;

    // Create container if it doesn't exist
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      this.container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        display: flex;
        flex-direction: column;
        gap: 10px;
        pointer-events: none;
      `;
      document.body.appendChild(this.container);
    }
  }

  /**
   * Show a toast notification
   * @param {string} message - Message to display
   * @param {Object} options - Toast options
   * @param {number} options.duration - Duration in milliseconds
   * @param {string} options.type - Toast type (warning, success, error, info)
   */
  show(message, options = {}) {
    const {
      duration = this.defaultDuration,
      type = 'warning'
    } = options;

    // Remove previous toast if exists
    if (this.activeToast) {
      this.hide();
    }

    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.style.cssText = `
      background: white;
      padding: 16px 20px;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 300px;
      max-width: 500px;
      pointer-events: auto;
      animation: slideIn 0.3s ease;
      border-left: 4px solid ${this.getColor(type)};
    `;

    // Add icon
    const icon = document.createElement('span');
    icon.textContent = this.getIcon(type);
    icon.style.cssText = `
      font-size: 24px;
      flex-shrink: 0;
    `;

    // Add message
    const messageEl = document.createElement('span');
    messageEl.textContent = message;
    messageEl.style.cssText = `
      flex: 1;
      color: #333;
      font-size: 14px;
      line-height: 1.5;
    `;

    // Add close button
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.style.cssText = `
      background: none;
      border: none;
      font-size: 24px;
      color: #999;
      cursor: pointer;
      padding: 0;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: color 0.2s;
    `;
    closeBtn.onmouseover = () => closeBtn.style.color = '#333';
    closeBtn.onmouseout = () => closeBtn.style.color = '#999';
    closeBtn.onclick = () => this.hide();

    // Assemble toast
    toast.appendChild(icon);
    toast.appendChild(messageEl);
    toast.appendChild(closeBtn);

    // Add to container
    this.container.appendChild(toast);
    this.activeToast = toast;

    // Auto hide after duration
    if (duration > 0) {
      setTimeout(() => this.hide(), duration);
    }

    return toast;
  }

  /**
   * Hide active toast
   */
  hide() {
    if (this.activeToast) {
      this.activeToast.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => {
        if (this.activeToast && this.activeToast.parentNode) {
          this.activeToast.parentNode.removeChild(this.activeToast);
        }
        this.activeToast = null;
      }, 300);
    }
  }

  /**
   * Show warning toast
   * @param {string} message
   * @param {number} duration
   */
  warning(message, duration) {
    return this.show(message, { type: 'warning', duration });
  }

  /**
   * Show success toast
   * @param {string} message
   * @param {number} duration
   */
  success(message, duration) {
    return this.show(message, { type: 'success', duration });
  }

  /**
   * Show error toast
   * @param {string} message
   * @param {number} duration
   */
  error(message, duration) {
    return this.show(message, { type: 'error', duration });
  }

  /**
   * Show info toast
   * @param {string} message
   * @param {number} duration
   */
  info(message, duration) {
    return this.show(message, { type: 'info', duration });
  }

  /**
   * Get icon for toast type
   * @param {string} type
   * @returns {string}
   */
  getIcon(type) {
    const icons = {
      warning: '⚠️',
      success: '✅',
      error: '❌',
      info: 'ℹ️'
    };
    return icons[type] || icons.info;
  }

  /**
   * Get color for toast type
   * @param {string} type
   * @returns {string}
   */
  getColor(type) {
    const colors = {
      warning: '#ffc107',
      success: '#28a745',
      error: '#dc3545',
      info: '#17a2b8'
    };
    return colors[type] || colors.info;
  }
}

// Add CSS animations
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateX(100px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }

    @keyframes slideOut {
      from {
        opacity: 1;
        transform: translateX(0);
      }
      to {
        opacity: 0;
        transform: translateX(100px);
      }
    }
  `;
  document.head.appendChild(style);
}

// Create singleton instance
const toast = new ToastManager();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ToastManager, toast };
}
