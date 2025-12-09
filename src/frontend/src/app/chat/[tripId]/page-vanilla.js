/**
 * VERSIÓN HTML/JS VANILLA de chat/[tripId]/page.tsx
 * 
 * Comparación:
 * - page.tsx: React component con WebSocket (127 líneas)
 * - page.js: JavaScript puro (~100 líneas)
 * 
 * Funcionalidades:
 * - Chat en tiempo real simulado
 * - Envío y recepción de mensajes
 * - Interfaz de mensajería
 */

class ChatPage {
    constructor() {
        this.tripId = null;
        this.messages = [];
        this.currentUser = { id: 1, name: "Tú" };
        this.otherUser = { id: 2, name: "Carlos García" };
    }

    init(containerId, tripId = 123) {
        this.container = document.getElementById(containerId);
        this.tripId = tripId;
        
        // Mock messages
        this.messages = [
            { id: 1, sender_id: 2, text: "Hola! Acabo de reservar plaza en tu viaje", timestamp: "10:30" },
            { id: 2, sender_id: 1, text: "Genial! Nos vemos mañana entonces", timestamp: "10:32" },
            { id: 3, sender_id: 2, text: "¿Dónde quedamos exactamente?", timestamp: "10:35" },
        ];
        
        this.render();
        this.attachEventListeners();
        this.scrollToBottom();
    }

    render() {
        this.container.innerHTML = `
            <div class="chat-page">
                <header class="chat-header">
                    <button class="back-btn" onclick="window.history.back()">←</button>
                    <div class="chat-title">
                        <h2>${this.otherUser.name}</h2>
                        <p>Viaje #${this.tripId}</p>
                    </div>
                </header>

                <div class="messages-container" id="messagesContainer">
                    ${this.messages.map(msg => `
                        <div class="message ${msg.sender_id === this.currentUser.id ? 'message-sent' : 'message-received'}">
                            <div class="message-bubble">
                                <p>${msg.text}</p>
                                <span class="message-time">${msg.timestamp}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>

                <form id="messageForm" class="message-form">
                    <input 
                        type="text" 
                        id="messageInput" 
                        placeholder="Escribe un mensaje..." 
                        required 
                    />
                    <button type="submit">📤</button>
                </form>
            </div>
        `;
    }

    attachEventListeners() {
        const form = document.getElementById('messageForm');
        form.addEventListener('submit', (e) => this.handleSendMessage(e));
    }

    handleSendMessage(e) {
        e.preventDefault();
        
        const input = document.getElementById('messageInput');
        const text = input.value.trim();
        
        if (!text) return;
        
        const newMessage = {
            id: this.messages.length + 1,
            sender_id: this.currentUser.id,
            text: text,
            timestamp: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
        };
        
        this.messages.push(newMessage);
        input.value = '';
        
        this.renderMessages();
        this.scrollToBottom();
        
        // Simular respuesta automática
        setTimeout(() => this.simulateResponse(), 2000);
    }

    simulateResponse() {
        const responses = [
            "Perfecto, gracias!",
            "De acuerdo",
            "Nos vemos allí",
            "Vale, genial!"
        ];
        
        const response = {
            id: this.messages.length + 1,
            sender_id: this.otherUser.id,
            text: responses[Math.floor(Math.random() * responses.length)],
            timestamp: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
        };
        
        this.messages.push(response);
        this.renderMessages();
        this.scrollToBottom();
    }

    renderMessages() {
        const container = document.getElementById('messagesContainer');
        container.innerHTML = this.messages.map(msg => `
            <div class="message ${msg.sender_id === this.currentUser.id ? 'message-sent' : 'message-received'}">
                <div class="message-bubble">
                    <p>${msg.text}</p>
                    <span class="message-time">${msg.timestamp}</span>
                </div>
            </div>
        `).join('');
    }

    scrollToBottom() {
        setTimeout(() => {
            const container = document.getElementById('messagesContainer');
            container.scrollTop = container.scrollHeight;
        }, 100);
    }
}

if (typeof window !== 'undefined') {
    window.ChatPage = ChatPage;
}
