/**
 * VERSIÓN HTML/JS VANILLA del hook useWebSocket.ts
 * 
 * Este archivo demuestra la conexión WebSocket con Socket.io
 * usando JavaScript puro (sin React hooks ni TypeScript).
 * 
 * Comparación:
 * - useWebSocket.ts: React hook con estado y efectos (80 líneas)
 * - useWebSocket.js: Clase JavaScript con eventos (100 líneas)
 * 
 * Funcionalidades implementadas:
 * - Conexión WebSocket con Socket.io
 * - Autenticación con token
 * - Reconexión automática (5 intentos)
 * - Event listeners personalizados
 * - Estados de conexión
 * 
 * Para ver en acción: useWebSocket-demo.html
 */

class WebSocketConnection {
    constructor(wsUrl, token) {
        this.wsUrl = wsUrl || 'http://127.0.0.1:8000';
        this.token = token;
        this.socket = null;
        this.isConnected = false;
        this.reconnectionAttempts = 0;
        this.maxReconnectionAttempts = 5;
        this.reconnectionDelay = 1000;
        this.eventCallbacks = {};
    }
    
    /**
     * Conectar al servidor WebSocket
     */
    connect() {
        if (!window.io) {
            console.error('❌ Socket.io no está cargado');
            return;
        }
        
        if (!this.token) {
            console.error('❌ Token no proporcionado');
            return;
        }
        
        console.log('🔌 Conectando a WebSocket...', this.wsUrl);
        
        // Crear conexión
        this.socket = io(this.wsUrl, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: this.reconnectionDelay,
            reconnectionAttempts: this.maxReconnectionAttempts,
        });
        
        // Configurar event listeners
        this.setupEventListeners();
    }
    
    /**
     * Configurar listeners de eventos del socket
     */
    setupEventListeners() {
        // Evento: Conexión exitosa
        this.socket.on('connect', () => {
            console.log('✅ WebSocket conectado');
            this.isConnected = true;
            this.reconnectionAttempts = 0;
            
            // Autenticar
            this.socket.emit('authenticate', { token: this.token });
            
            // Llamar callback personalizado
            this.trigger('connect');
        });
        
        // Evento: Desconexión
        this.socket.on('disconnect', () => {
            console.log('🔌 WebSocket desconectado');
            this.isConnected = false;
            this.trigger('disconnect');
        });
        
        // Evento: Autenticación exitosa
        this.socket.on('authenticated', (data) => {
            console.log('✅ WebSocket autenticado:', data);
            this.trigger('authenticated', data);
        });
        
        // Evento: Error
        this.socket.on('error', (error) => {
            console.error('❌ WebSocket error:', error);
            this.trigger('error', error);
        });
        
        // Evento: Intento de reconexión
        this.socket.on('reconnect_attempt', (attemptNumber) => {
            console.log(`🔄 Intento de reconexión ${attemptNumber}/${this.maxReconnectionAttempts}`);
            this.reconnectionAttempts = attemptNumber;
            this.trigger('reconnect_attempt', attemptNumber);
        });
        
        // Evento: Reconexión fallida
        this.socket.on('reconnect_failed', () => {
            console.error('❌ Falló la reconexión después de todos los intentos');
            this.trigger('reconnect_failed');
        });
    }
    
    /**
     * Registrar callback para un evento
     * @param {string} event - Nombre del evento
     * @param {function} callback - Función callback
     */
    on(event, callback) {
        if (!this.eventCallbacks[event]) {
            this.eventCallbacks[event] = [];
        }
        this.eventCallbacks[event].push(callback);
        
        // Si es un evento personalizado del socket, registrarlo
        if (this.socket && !['connect', 'disconnect', 'authenticated', 'error', 'reconnect_attempt', 'reconnect_failed'].includes(event)) {
            this.socket.on(event, callback);
        }
    }
    
    /**
     * Emitir evento al servidor
     * @param {string} event - Nombre del evento
     * @param {object} data - Datos a enviar
     */
    emit(event, data) {
        if (this.socket && this.isConnected) {
            this.socket.emit(event, data);
        } else {
            console.warn('⚠️ Socket no conectado, no se puede emitir evento:', event);
        }
    }
    
    /**
     * Disparar callbacks registrados para un evento
     * @param {string} event - Nombre del evento
     * @param {any} data - Datos del evento
     */
    trigger(event, data) {
        if (this.eventCallbacks[event]) {
            this.eventCallbacks[event].forEach(callback => callback(data));
        }
    }
    
    /**
     * Desconectar del servidor
     */
    disconnect() {
        if (this.socket) {
            console.log('🔌 Desconectando WebSocket...');
            this.socket.disconnect();
            this.socket = null;
            this.isConnected = false;
        }
    }
    
    /**
     * Obtener estado de conexión
     * @returns {boolean}
     */
    getConnectionStatus() {
        return this.isConnected;
    }
    
    /**
     * Obtener socket instance (para uso avanzado)
     * @returns {Socket|null}
     */
    getSocket() {
        return this.socket;
    }
}

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.WebSocketConnection = WebSocketConnection;
}

// Exportar para Node.js (si aplica)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WebSocketConnection;
}
