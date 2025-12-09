/**
 * VERSIÓN HTML/JS VANILLA de post-ride/page.tsx
 * 
 * Comparación:
 * - page.tsx: React component con hooks y validación compleja (1005 líneas)
 * - page.js: JavaScript puro simplificado (~200 líneas)
 * 
 * Funcionalidades:
 * - Formulario para publicar viaje
 * - Selección de origen/destino
 * - Fecha, hora, precio, asientos
 * - Información del vehículo
 */

const API_BASE = "http://127.0.0.1:8000/api";

const CAR_BRANDS = ["Audi", "BMW", "Citroën", "Fiat", "Ford", "Honda", "Hyundai", 
                    "KIA", "Mazda", "Mercedes-Benz", "Nissan", "Opel", "Peugeot", 
                    "Renault", "SEAT", "Škoda", "Toyota", "Volkswagen", "Volvo"];

const CAR_COLORS = ["Blanco", "Negro", "Plateado", "Gris", "Azul", "Rojo", 
                    "Verde", "Marrón", "Beige", "Amarillo"];

class PostRidePage {
    constructor() {
        this.rideData = {
            departure_city: '',
            destination_city: '',
            departure_date: '',
            departure_time: '',
            price_per_seat: 10,
            total_seats: 4,
            vehicle_brand: '',
            vehicle_color: '',
            notes: ''
        };
    }

    init(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) return;
        
        this.render();
        this.attachEventListeners();
    }

    render() {
        this.container.innerHTML = `
            <div class="post-ride-page">
                <header class="header">
                    <div class="logo">
                        <div class="logo-icon">🚗</div>
                        <h1>UniGO</h1>
                    </div>
                    <h2>Publicar Viaje</h2>
                </header>

                <div class="form-container">
                    <form id="postRideForm" class="ride-form">
                        <section class="form-section">
                            <h3>📍 Ruta del viaje</h3>
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="departure_city">Ciudad de origen *</label>
                                    <input type="text" id="departure_city" placeholder="Madrid" required />
                                </div>
                                <div class="form-group">
                                    <label for="destination_city">Ciudad de destino *</label>
                                    <input type="text" id="destination_city" placeholder="Barcelona" required />
                                </div>
                            </div>
                        </section>

                        <section class="form-section">
                            <h3>🕐 Fecha y hora</h3>
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="departure_date">Fecha de salida *</label>
                                    <input type="date" id="departure_date" required />
                                </div>
                                <div class="form-group">
                                    <label for="departure_time">Hora de salida *</label>
                                    <input type="time" id="departure_time" required />
                                </div>
                            </div>
                        </section>

                        <section class="form-section">
                            <h3>💰 Precio y plazas</h3>
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="price_per_seat">Precio por asiento (€) *</label>
                                    <input type="number" id="price_per_seat" min="1" max="100" value="10" step="0.5" required />
                                </div>
                                <div class="form-group">
                                    <label for="total_seats">Plazas disponibles *</label>
                                    <select id="total_seats" required>
                                        <option value="1">1 plaza</option>
                                        <option value="2">2 plazas</option>
                                        <option value="3">3 plazas</option>
                                        <option value="4" selected>4 plazas</option>
                                    </select>
                                </div>
                            </div>
                        </section>

                        <section class="form-section">
                            <h3>🚗 Vehículo</h3>
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="vehicle_brand">Marca del vehículo</label>
                                    <select id="vehicle_brand">
                                        <option value="">Seleccionar...</option>
                                        ${CAR_BRANDS.map(brand => `<option value="${brand}">${brand}</option>`).join('')}
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label for="vehicle_color">Color del vehículo</label>
                                    <select id="vehicle_color">
                                        <option value="">Seleccionar...</option>
                                        ${CAR_COLORS.map(color => `<option value="${color}">${color}</option>`).join('')}
                                    </select>
                                </div>
                            </div>
                        </section>

                        <section class="form-section">
                            <h3>📝 Notas adicionales</h3>
                            <div class="form-group">
                                <label for="notes">Información adicional (opcional)</label>
                                <textarea 
                                    id="notes" 
                                    rows="4" 
                                    placeholder="Ej: Puedo llevar equipaje grande, acepto mascotas, hago paradas, etc."
                                ></textarea>
                            </div>
                        </section>

                        <div id="errorContainer" style="display: none;"></div>

                        <button type="submit" id="submitButton" class="submit-button">
                            🚀 Publicar Viaje
                        </button>
                    </form>
                </div>
            </div>
        `;
    }

    attachEventListeners() {
        const form = document.getElementById('postRideForm');
        form.addEventListener('submit', (e) => this.handleSubmit(e));

        // Set min date to today
        const dateInput = document.getElementById('departure_date');
        const today = new Date().toISOString().split('T')[0];
        dateInput.min = today;
    }

    async handleSubmit(e) {
        e.preventDefault();

        // Collect form data
        this.rideData = {
            departure_city: document.getElementById('departure_city').value,
            destination_city: document.getElementById('destination_city').value,
            departure_date: document.getElementById('departure_date').value,
            departure_time: document.getElementById('departure_time').value,
            price_per_seat: parseFloat(document.getElementById('price_per_seat').value),
            total_seats: parseInt(document.getElementById('total_seats').value),
            vehicle_brand: document.getElementById('vehicle_brand').value || null,
            vehicle_color: document.getElementById('vehicle_color').value || null,
            notes: document.getElementById('notes').value || null
        };

        console.log('📤 Datos del viaje a publicar:', this.rideData);

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('Debes iniciar sesión para publicar un viaje');
            }

            // Simular llamada a API
            console.log('✅ Viaje publicado exitosamente (simulado)');
            alert('¡Viaje publicado exitosamente!\\n\\nEn la app real, esto crearía el viaje en la base de datos.');
            
            // Reset form
            document.getElementById('postRideForm').reset();

        } catch (error) {
            this.showError(error.message);
        }
    }

    showError(message) {
        const errorContainer = document.getElementById('errorContainer');
        errorContainer.style.display = 'block';
        errorContainer.className = 'error-box';
        errorContainer.textContent = message;
    }
}

if (typeof window !== 'undefined') {
    window.PostRidePage = PostRidePage;
}
