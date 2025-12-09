/**
 * VERSIÓN HTML/JS VANILLA de my-cards/page.tsx
 * 
 * Comparación:
 * - page.tsx: 433 líneas React
 * - page.js: ~120 líneas vanilla
 * 
 * Funcionalidades:
 * - Listado de tarjetas de pago
 * - Añadir/eliminar tarjetas
 * - Gestión de métodos de pago
 */

class MyCardsPage {
    constructor() {
        this.cards = [];
    }

    init(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) return;
        
        this.loadCards();
    }

    loadCards() {
        // Mock data
        this.cards = [
            { id: '1', brand: 'visa', last4: '4242', exp_month: 12, exp_year: 2026 },
            { id: '2', brand: 'mastercard', last4: '5555', exp_month: 8, exp_year: 2025 }
        ];
        
        this.render();
        this.attachEventListeners();
    }

    render() {
        this.container.innerHTML = `
            <div class="cards-page">
                <header class="header">
                    <h1>💳 Mis Tarjetas</h1>
                    <button id="addCardBtn" class="add-btn">➕ Añadir Tarjeta</button>
                </header>

                <div class="cards-list">
                    ${this.cards.length > 0 ? this.cards.map(card => `
                        <div class="card-item">
                            <div class="card-icon">${this.getCardIcon(card.brand)}</div>
                            <div class="card-info">
                                <div class="card-brand">${card.brand.toUpperCase()}</div>
                                <div class="card-number">•••• ${card.last4}</div>
                                <div class="card-expiry">Expira: ${card.exp_month}/${card.exp_year}</div>
                            </div>
                            <button class="delete-btn" onclick="deleteCard('${card.id}')">🗑️</button>
                        </div>
                    `).join('') : '<p class="empty-message">No tienes tarjetas guardadas</p>'}
                </div>

                <section class="bank-section">
                    <h2>🏦 Cuenta Bancaria</h2>
                    <p>Para recibir pagos como conductor, añade tu cuenta bancaria</p>
                    <button onclick="window.location.href='../bank-account/page-demo.html'" class="bank-btn">
                        Configurar cuenta bancaria
                    </button>
                </section>
            </div>
        `;
    }

    attachEventListeners() {
        const addBtn = document.getElementById('addCardBtn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.addCard());
        }
    }

    getCardIcon(brand) {
        const icons = {
            visa: '💳',
            mastercard: '💳',
            amex: '💳',
            discover: '💳'
        };
        return icons[brand] || '💳';
    }

    addCard() {
        alert('En la app real, aquí se abriría el modal de Stripe para añadir una tarjeta');
    }
}

function deleteCard(cardId) {
    if (confirm('¿Seguro que quieres eliminar esta tarjeta?')) {
        alert(`Tarjeta ${cardId} eliminada (simulado)`);
    }
}

if (typeof window !== 'undefined') {
    window.MyCardsPage = MyCardsPage;
    window.deleteCard = deleteCard;
}
