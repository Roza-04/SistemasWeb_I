/**
 * VERSIÓN HTML/JS VANILLA de activity/page.tsx
 * 
 * Comparación:
 * - page.tsx: 234 líneas React
 * - page.js: ~100 líneas vanilla
 * 
 * Funcionalidades:
 * - Visualización de actividad (viajes próximos y pasados)
 * - Mapa con ubicaciones
 * - Listado de reservas
 */

const API_BASE = "http://127.0.0.1:8000/api";

class ActivityPage {
    constructor() {
        this.upcomingTrips = [];
        this.pastTrips = [];
    }

    init(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) return;
        
        this.loadActivity();
    }

    async loadActivity() {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = '../login/page-demo.html';
            return;
        }

        // Mock data
        this.upcomingTrips = [
            {
                id: 1,
                departure_city: "Madrid",
                destination_city: "Barcelona",
                departure_date: "2025-01-15",
                departure_time: "15:30",
                price_per_seat: 25,
                driver_name: "Carlos García"
            }
        ];

        this.pastTrips = [
            {
                id: 2,
                departure_city: "Sevilla",
                destination_city: "Granada",
                departure_date: "2024-12-01",
                departure_time: "08:00",
                price_per_seat: 12.50,
                driver_name: "María López",
                status: "completed"
            }
        ];

        this.render();
    }

    render() {
        this.container.innerHTML = `
            <div class="activity-page">
                <header class="header">
                    <h1>📊 Mi Actividad</h1>
                </header>

                <section class="trips-section">
                    <h2>🚗 Próximos Viajes (${this.upcomingTrips.length})</h2>
                    <div class="trips-list">
                        ${this.upcomingTrips.length > 0 ? this.upcomingTrips.map(trip => `
                            <div class="trip-card">
                                <div class="trip-route">
                                    <strong>${trip.departure_city}</strong> → <strong>${trip.destination_city}</strong>
                                </div>
                                <div class="trip-info">
                                    <span>📅 ${trip.departure_date}</span>
                                    <span>🕐 ${trip.departure_time}</span>
                                    <span>💰 ${trip.price_per_seat}€</span>
                                </div>
                                <div class="trip-driver">👤 ${trip.driver_name}</div>
                            </div>
                        `).join('') : '<p class="empty-message">No tienes viajes próximos</p>'}
                    </div>
                </section>

                <section class="trips-section">
                    <h2>📜 Historial de Viajes (${this.pastTrips.length})</h2>
                    <div class="trips-list">
                        ${this.pastTrips.length > 0 ? this.pastTrips.map(trip => `
                            <div class="trip-card completed">
                                <div class="trip-route">
                                    <strong>${trip.departure_city}</strong> → <strong>${trip.destination_city}</strong>
                                </div>
                                <div class="trip-info">
                                    <span>📅 ${trip.departure_date}</span>
                                    <span>✅ ${trip.status}</span>
                                </div>
                            </div>
                        `).join('') : '<p class="empty-message">No hay viajes completados</p>'}
                    </div>
                </section>
            </div>
        `;
    }
}

if (typeof window !== 'undefined') {
    window.ActivityPage = ActivityPage;
}
