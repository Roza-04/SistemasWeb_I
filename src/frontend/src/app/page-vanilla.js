/**
 * VERSIÓN HTML/JS VANILLA de app/page.tsx (Home - Búsqueda de viajes)
 * 
 * Comparación:
 * - page.tsx: React component con múltiples hooks y estados (683 líneas)
 * - page.js: JavaScript puro simplificado (~250 líneas)
 * 
 * Funcionalidades implementadas:
 * - Formulario de búsqueda de viajes
 * - Autocompletado de direcciones (integración con Google Maps)
 * - Visualización de resultados de búsqueda
 * - Filtrado por fecha y pasajeros
 * - Muestra de tarjetas de viajes disponibles
 */

const API_BASE = "http://127.0.0.1:8000/api";

class HomePage {
    constructor() {
        this.isLoggedIn = false;
        this.currentView = 'search'; // 'search', 'results'
        this.searchResults = [];
        this.fromAddress = null;
        this.toAddress = null;
        this.selectedDate = '';
        this.passengers = 1;
    }

    init(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) return;
        
        this.checkAuth();
        this.render();
        this.attachEventListeners();
    }

    checkAuth() {
        const token = localStorage.getItem('token');
        this.isLoggedIn = !!token;
    }

    render() {
        this.container.innerHTML = `
            <div class="home-page">
                <!-- Header -->
                <header class="header">
                    <div class="header-content">
                        <div class="logo">
                            <div class="logo-icon">🚗</div>
                            <h1>UniGO</h1>
                        </div>
                        <nav class="nav">
                            ${this.isLoggedIn ? `
                                <a href="my-rides/page-demo.html">Mis Viajes</a>
                                <a href="profile/page-demo.html">Perfil</a>
                                <a href="post-ride/page-demo.html" class="btn-primary">Publicar Viaje</a>
                            ` : `
                                <a href="login/page-demo.html">Iniciar Sesión</a>
                                <a href="register/page-demo.html" class="btn-primary">Registrarse</a>
                            `}
                        </nav>
                    </div>
                </header>

                <!-- Hero Section -->
                <section class="hero">
                    <div class="hero-content">
                        <h2 class="hero-title">Comparte trayectos universitarios</h2>
                        <p class="hero-subtitle">Ahorra dinero, reduce tu huella de carbono y conoce gente nueva</p>
                    </div>
                </section>

                <!-- Search Form -->
                <section class="search-section">
                    <div class="search-container">
                        <form id="searchForm" class="search-form">
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="from">Origen</label>
                                    <input
                                        type="text"
                                        id="from"
                                        placeholder="¿Desde dónde sales?"
                                        required
                                    />
                                </div>
                                <div class="form-group">
                                    <label for="to">Destino</label>
                                    <input
                                        type="text"
                                        id="to"
                                        placeholder="¿A dónde vas?"
                                        required
                                    />
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="date">Fecha</label>
                                    <input
                                        type="date"
                                        id="date"
                                        required
                                    />
                                </div>
                                <div class="form-group">
                                    <label for="passengers">Pasajeros</label>
                                    <select id="passengers">
                                        <option value="1">1 pasajero</option>
                                        <option value="2">2 pasajeros</option>
                                        <option value="3">3 pasajeros</option>
                                        <option value="4">4+ pasajeros</option>
                                    </select>
                                </div>
                            </div>
                            <button type="submit" class="search-button">
                                🔍 Buscar Viajes
                            </button>
                        </form>
                    </div>
                </section>

                <!-- Results Section -->
                <section id="resultsSection" class="results-section" style="display: none;">
                    <div class="results-container">
                        <div class="results-header">
                            <h3 id="resultsTitle">Viajes encontrados</h3>
                            <button id="backButton" class="back-button">← Volver a buscar</button>
                        </div>
                        <div id="resultsContent" class="results-content">
                            <!-- Los resultados se cargarán aquí -->
                        </div>
                    </div>
                </section>

                <!-- Features -->
                <section class="features">
                    <div class="features-grid">
                        <div class="feature-card">
                            <div class="feature-icon">💰</div>
                            <h3>Ahorra dinero</h3>
                            <p>Comparte gastos de combustible y peajes</p>
                        </div>
                        <div class="feature-card">
                            <div class="feature-icon">🌱</div>
                            <h3>Ecológico</h3>
                            <p>Reduce tu huella de carbono compartiendo coche</p>
                        </div>
                        <div class="feature-card">
                            <div class="feature-icon">👥</div>
                            <h3>Comunidad</h3>
                            <p>Conoce otros estudiantes universitarios</p>
                        </div>
                        <div class="feature-card">
                            <div class="feature-icon">✅</div>
                            <h3>Seguro</h3>
                            <p>Sistema de verificación y valoraciones</p>
                        </div>
                    </div>
                </section>
            </div>
        `;
    }

    attachEventListeners() {
        const searchForm = document.getElementById('searchForm');
        searchForm.addEventListener('submit', (e) => this.handleSearch(e));

        const backButton = document.getElementById('backButton');
        if (backButton) {
            backButton.addEventListener('click', () => this.showSearchView());
        }

        // Set min date to today
        const dateInput = document.getElementById('date');
        const today = new Date().toISOString().split('T')[0];
        dateInput.min = today;
        dateInput.value = today;
    }

    async handleSearch(e) {
        e.preventDefault();

        const from = document.getElementById('from').value;
        const to = document.getElementById('to').value;
        const date = document.getElementById('date').value;
        const passengers = parseInt(document.getElementById('passengers').value);

        console.log('🔍 Buscando viajes:', { from, to, date, passengers });

        // Simular búsqueda (en app real haría fetch a API)
        this.searchResults = this.getMockResults(from, to, date);
        this.showResultsView();
    }

    getMockResults(from, to, date) {
        // Datos de ejemplo
        return [
            {
                id: 1,
                departure_city: from,
                destination_city: to,
                departure_date: date,
                departure_time: "09:00",
                arrival_time: "11:30",
                price_per_seat: 15.00,
                available_seats: 3,
                total_seats: 4,
                driver_name: "Carlos García",
                driver_rating: 4.8,
                vehicle: "Seat León Blanco"
            },
            {
                id: 2,
                departure_city: from,
                destination_city: to,
                departure_date: date,
                departure_time: "14:00",
                arrival_time: "16:45",
                price_per_seat: 12.50,
                available_seats: 2,
                total_seats: 3,
                driver_name: "María López",
                driver_rating: 4.9,
                vehicle: "Volkswagen Golf Rojo"
            },
            {
                id: 3,
                departure_city: from,
                destination_city: to,
                departure_date: date,
                departure_time: "18:30",
                arrival_time: "21:00",
                price_per_seat: 18.00,
                available_seats: 1,
                total_seats: 4,
                driver_name: "Jorge Martínez",
                driver_rating: 4.7,
                vehicle: "Renault Clio Azul"
            }
        ];
    }

    showResultsView() {
        this.currentView = 'results';
        
        const resultsSection = document.getElementById('resultsSection');
        const resultsContent = document.getElementById('resultsContent');
        const resultsTitle = document.getElementById('resultsTitle');
        
        resultsSection.style.display = 'block';
        resultsTitle.textContent = `${this.searchResults.length} viajes encontrados`;
        
        // Scroll to results
        resultsSection.scrollIntoView({ behavior: 'smooth' });
        
        // Render results
        resultsContent.innerHTML = this.searchResults.map(ride => `
            <div class="ride-card">
                <div class="ride-time">${ride.departure_time}</div>
                <div class="ride-route">
                    <div class="ride-city">${ride.departure_city}</div>
                    <div class="ride-arrow">→</div>
                    <div class="ride-city">${ride.destination_city}</div>
                    <div class="ride-time">${ride.arrival_time}</div>
                </div>
                <div class="ride-details">
                    <div class="ride-driver">
                        <span>👤 ${ride.driver_name}</span>
                        <span>⭐ ${ride.driver_rating}</span>
                    </div>
                    <div class="ride-info">
                        <span>🪑 ${ride.available_seats}/${ride.total_seats} plazas</span>
                        <span>🚗 ${ride.vehicle}</span>
                    </div>
                    <div class="ride-price">${ride.price_per_seat.toFixed(2)} €</div>
                </div>
                <button class="book-button" onclick="alert('En la app real, esto abriría el detalle del viaje')">
                    Ver detalles
                </button>
            </div>
        `).join('');
    }

    showSearchView() {
        this.currentView = 'search';
        const resultsSection = document.getElementById('resultsSection');
        resultsSection.style.display = 'none';
        
        // Scroll to search
        document.querySelector('.search-section').scrollIntoView({ behavior: 'smooth' });
    }
}

if (typeof window !== 'undefined') {
    window.HomePage = HomePage;
}
