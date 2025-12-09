/**
 * VERSIÓN HTML/JS VANILLA de registro/page.tsx
 * 
 * Comparación:
 * - page.tsx: 535 líneas React (historial de viajes con valoraciones)
 * - page.js: ~80 líneas vanilla (versión simplificada)
 * 
 * Nota: Esta página en el original muestra el historial completo de viajes
 * con sistema de valoraciones. La versión vanilla es una simplificación.
 */

class RegistroPage {
    constructor() {
        this.history = [];
    }

    init(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) return;
        
        this.loadHistory();
    }

    loadHistory() {
        // Mock data
        this.history = [
            {
                id: 1,
                departure_city: "Madrid",
                destination_city: "Barcelona",
                departure_date: "2024-12-01",
                status: "completed",
                role: "passenger",
                driver_name: "Carlos García"
            },
            {
                id: 2,
                departure_city: "Sevilla",
                destination_city: "Granada",
                departure_date: "2024-11-15",
                status: "completed",
                role: "driver",
                passengers_count: 3
            }
        ];
        
        this.render();
    }

    render() {
        this.container.innerHTML = `
            <div class="registro-page">
                <header class="header">
                    <h1>📜 Historial y Valoraciones</h1>
                    <p>Registro completo de tus viajes</p>
                </header>

                <div class="history-list">
                    ${this.history.map(trip => `
                        <div class="history-card">
                            <div class="trip-badge ${trip.role}">${trip.role === 'driver' ? '🚗 Conductor' : '🪑 Pasajero'}</div>
                            <div class="trip-route">
                                <strong>${trip.departure_city}</strong> → <strong>${trip.destination_city}</strong>
                            </div>
                            <div class="trip-info">
                                <span>📅 ${trip.departure_date}</span>
                                <span>✅ ${trip.status}</span>
                                ${trip.role === 'passenger' ? `<span>👤 ${trip.driver_name}</span>` : ''}
                                ${trip.role === 'driver' ? `<span>👥 ${trip.passengers_count} pasajeros</span>` : ''}
                            </div>
                            <button class="rate-btn" onclick="alert('Valorar usuario')">⭐ Valorar</button>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
}

if (typeof window !== 'undefined') {
    window.RegistroPage = RegistroPage;
}
