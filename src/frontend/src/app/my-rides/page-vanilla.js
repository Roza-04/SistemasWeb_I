/**
 * VERSIÓN HTML/JS VANILLA de my-rides/page.tsx
 * 
 * Comparación:
 * - page.tsx: 1,246 líneas React (componente muy complejo)
 * - page.js: ~150 líneas vanilla (versión simplificada)
 * 
 * Funcionalidades:
 * - Pestañas: Como conductor / Como pasajero / Historial
 * - Listado de viajes publicados y reservas
 * - Cancelación de viajes/reservas
 */

class MyRidesPage {
    constructor() {
        this.activeTab = 'driver';
        this.driverRides = [];
        this.passengerRides = [];
        this.history = [];
    }

    init(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) return;
        
        this.loadData();
    }

    loadData() {
        // Mock data
        this.driverRides = [
            { id: 1, departure_city: "Madrid", destination_city: "Barcelona", departure_date: "2025-01-15", 
              departure_time: "15:30", available_seats: 2, total_seats: 4, price_per_seat: 25, is_active: true }
        ];
        
        this.passengerRides = [
            { id: 2, departure_city: "Sevilla", destination_city: "Granada", departure_date: "2025-01-20",
              departure_time: "08:00", driver_name: "María López", price_per_seat: 12.50 }
        ];
        
        this.history = [
            { id: 3, departure_city: "Valencia", destination_city: "Alicante", departure_date: "2024-12-01",
              status: "completed", role: "passenger" }
        ];
        
        this.render();
        this.attachEventListeners();
    }

    render() {
        this.container.innerHTML = `
            <div class="my-rides-page">
                <header class="header">
                    <h1>🚗 Mis Viajes</h1>
                </header>

                <div class="tabs">
                    <button class="tab ${this.activeTab === 'driver' ? 'active' : ''}" data-tab="driver">
                        Como Conductor (${this.driverRides.length})
                    </button>
                    <button class="tab ${this.activeTab === 'passenger' ? 'active' : ''}" data-tab="passenger">
                        Como Pasajero (${this.passengerRides.length})
                    </button>
                    <button class="tab ${this.activeTab === 'history' ? 'active' : ''}" data-tab="history">
                        Historial (${this.history.length})
                    </button>
                </div>

                <div class="tab-content">
                    ${this.renderTabContent()}
                </div>
            </div>
        `;
    }

    renderTabContent() {
        if (this.activeTab === 'driver') {
            return `
                <div class="rides-list">
                    ${this.driverRides.map(ride => `
                        <div class="ride-card">
                            <div class="ride-header">
                                <span class="badge ${ride.is_active ? 'active' : 'inactive'}">
                                    ${ride.is_active ? 'Activo' : 'Inactivo'}
                                </span>
                            </div>
                            <div class="ride-route">
                                <strong>${ride.departure_city}</strong> → <strong>${ride.destination_city}</strong>
                            </div>
                            <div class="ride-info">
                                <span>📅 ${ride.departure_date}</span>
                                <span>🕐 ${ride.departure_time}</span>
                                <span>🪑 ${ride.available_seats}/${ride.total_seats}</span>
                                <span>💰 ${ride.price_per_seat}€</span>
                            </div>
                            <div class="ride-actions">
                                <button class="btn-secondary" onclick="alert('Ver detalles')">Ver detalles</button>
                                <button class="btn-danger" onclick="cancelRide(${ride.id})">Cancelar</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        } else if (this.activeTab === 'passenger') {
            return `
                <div class="rides-list">
                    ${this.passengerRides.map(ride => `
                        <div class="ride-card">
                            <div class="ride-route">
                                <strong>${ride.departure_city}</strong> → <strong>${ride.destination_city}</strong>
                            </div>
                            <div class="ride-info">
                                <span>📅 ${ride.departure_date}</span>
                                <span>🕐 ${ride.departure_time}</span>
                                <span>👤 ${ride.driver_name}</span>
                                <span>💰 ${ride.price_per_seat}€</span>
                            </div>
                            <div class="ride-actions">
                                <button class="btn-secondary" onclick="alert('Ver detalles')">Ver detalles</button>
                                <button class="btn-danger" onclick="cancelBooking(${ride.id})">Cancelar reserva</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        } else {
            return `
                <div class="rides-list">
                    ${this.history.map(ride => `
                        <div class="ride-card completed">
                            <div class="ride-route">
                                <strong>${ride.departure_city}</strong> → <strong>${ride.destination_city}</strong>
                            </div>
                            <div class="ride-info">
                                <span>📅 ${ride.departure_date}</span>
                                <span>✅ ${ride.status}</span>
                                <span>📍 ${ride.role}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }
    }

    attachEventListeners() {
        const tabs = document.querySelectorAll('.tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.activeTab = e.target.dataset.tab;
                this.render();
                this.attachEventListeners();
            });
        });
    }
}

function cancelRide(id) {
    if (confirm('¿Seguro que quieres cancelar este viaje?')) {
        alert(`Viaje ${id} cancelado (simulado)`);
    }
}

function cancelBooking(id) {
    if (confirm('¿Seguro que quieres cancelar esta reserva?')) {
        alert(`Reserva ${id} cancelada (simulado)`);
    }
}

if (typeof window !== 'undefined') {
    window.MyRidesPage = MyRidesPage;
    window.cancelRide = cancelRide;
    window.cancelBooking = cancelBooking;
}
