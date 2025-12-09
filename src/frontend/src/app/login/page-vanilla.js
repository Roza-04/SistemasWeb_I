/**
 * VERSIÓN HTML/JS VANILLA de login/page.tsx
 * 
 * Este archivo demuestra cómo crear una página de login
 * con JavaScript puro (sin React ni TypeScript ni Next.js).
 * 
 * Comparación:
 * - page.tsx: React component con hooks useState, useRouter (254 líneas)
 * - page.js: JavaScript puro con DOM manipulation (~200 líneas)
 * 
 * Funcionalidades implementadas:
 * - Formulario de login con validación
 * - Manejo de estado (loading, errors)
 * - Autenticación contra API
 * - Almacenamiento de token en localStorage
 * - Redirección después de login exitoso
 * - Mensajes de error user-friendly
 * 
 * Para ver en acción: page-demo.html
 */

const API_BASE = "http://127.0.0.1:8000/api";

/**
 * Clase LoginPage - Gestiona la lógica de la página de login
 */
class LoginPage {
    constructor() {
        this.email = "";
        this.password = "";
        this.loading = false;
        this.message = null;
        this.messageType = null; // 'error' o 'success'
    }

    /**
     * Inicializa la página de login
     * @param {string} containerId - ID del contenedor donde renderizar
     */
    init(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error(`Container ${containerId} not found`);
            return;
        }
        
        this.render();
        this.attachEventListeners();
        
        console.log('🔍 API BASE URL:', API_BASE);
    }

    /**
     * Renderiza la interfaz de login
     */
    render() {
        this.container.innerHTML = `
            <div class="login-page">
                <div class="login-container">
                    <!-- Logo y header -->
                    <div class="login-header">
                        <div class="logo-container">
                            <div class="logo-icon">
                                <svg fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"/>
                                    <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1V8a1 1 0 00-1-1h-3z"/>
                                </svg>
                            </div>
                            <h1 class="logo-text">UniGO</h1>
                        </div>
                        <h2 class="login-title">Iniciar Sesión</h2>
                        <p class="login-subtitle">Bienvenido de vuelta</p>
                    </div>

                    <!-- Mensaje de estado -->
                    <div id="messageContainer" style="display: none;"></div>

                    <!-- Formulario -->
                    <form id="loginForm" class="login-form">
                        <div class="form-group">
                            <label for="email" class="form-label">
                                Correo electrónico universitario
                            </label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                class="form-input"
                                placeholder="tu.email@universidad.es"
                                required
                            />
                        </div>

                        <div class="form-group">
                            <label for="password" class="form-label">
                                Contraseña
                            </label>
                            <input
                                type="password"
                                id="password"
                                name="password"
                                class="form-input"
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            id="submitButton"
                            class="submit-button"
                            disabled
                        >
                            <span id="buttonText">Iniciar Sesión</span>
                            <span id="buttonSpinner" style="display: none;">
                                <svg class="spinner" viewBox="0 0 24 24">
                                    <circle class="spinner-circle" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"/>
                                </svg>
                            </span>
                        </button>
                    </form>

                    <!-- Enlaces adicionales -->
                    <div class="form-footer">
                        <p class="footer-text">
                            ¿No tienes cuenta?
                            <a href="../register/page-demo.html" class="footer-link">Regístrate aquí</a>
                        </p>
                        <p class="footer-text">
                            <a href="../page-demo.html" class="footer-link">Volver al inicio</a>
                        </p>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Adjunta event listeners al formulario
     */
    attachEventListeners() {
        const form = document.getElementById('loginForm');
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');

        form.addEventListener('submit', (e) => this.handleSubmit(e));
        
        // Limpiar mensaje al escribir
        emailInput.addEventListener('input', () => this.clearMessage());
        passwordInput.addEventListener('input', () => this.clearMessage());
    }

    /**
     * Maneja el envío del formulario
     * @param {Event} e - Evento del formulario
     */
    async handleSubmit(e) {
        e.preventDefault();
        
        this.email = document.getElementById('email').value;
        this.password = document.getElementById('password').value;
        
        this.clearMessage();
        this.setLoading(true);

        try {
            const response = await fetch(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: this.email,
                    password: this.password
                })
            });

            if (!response.ok) {
                let errorMessage = await this.parseErrorMessage(response);
                throw new Error(errorMessage);
            }

            const data = await response.json();
            
            // Guardar token en localStorage
            if (data.access_token) {
                localStorage.setItem('token', data.access_token);
                
                this.showMessage('¡Login exitoso! Redirigiendo...', 'success');
                
                // Simular redirección (en app real iría a home)
                setTimeout(() => {
                    console.log('✅ Login successful, would redirect to home');
                    this.showMessage('Login completado. En la app real redirigiría a la página principal.', 'success');
                }, 1500);
            } else {
                throw new Error('No se recibió el token de acceso');
            }

        } catch (error) {
            console.error('Login error:', error);
            this.showMessage(error.message, 'error');
        } finally {
            this.setLoading(false);
        }
    }

    /**
     * Parsea mensajes de error de la API
     * @param {Response} response - Respuesta HTTP
     * @returns {Promise<string>} Mensaje de error formateado
     */
    async parseErrorMessage(response) {
        let errorText = "";
        try {
            errorText = await response.text();
        } catch {
            errorText = `Error ${response.status}: ${response.statusText}`;
        }

        let errorMessage = errorText;
        try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.detail || errorJson.message || errorText;
        } catch {
            // No es JSON, usar texto tal cual
        }

        // Reemplazar errores genéricos con mensajes user-friendly
        if (errorMessage.includes("Load failed") || 
            errorMessage.includes("Failed to fetch") || 
            errorMessage.includes("TypeError")) {
            errorMessage = "Error de conexión. Por favor, verifica que el servidor esté funcionando.";
        } else if (errorMessage.includes("401") || 
                   errorMessage.includes("Invalid credentials") || 
                   errorMessage.includes("Incorrect")) {
            errorMessage = "Email o contraseña incorrectos. Por favor, verifica tus credenciales.";
        } else if (errorMessage.includes("Network")) {
            errorMessage = "Error de red. Verifica tu conexión a internet.";
        }

        return errorMessage;
    }

    /**
     * Muestra un mensaje al usuario
     * @param {string} message - Texto del mensaje
     * @param {string} type - Tipo: 'error' o 'success'
     */
    showMessage(message, type) {
        this.message = message;
        this.messageType = type;

        const messageContainer = document.getElementById('messageContainer');
        messageContainer.style.display = 'block';
        messageContainer.className = `message-box message-${type}`;
        messageContainer.innerHTML = `
            <div class="message-content">
                <span class="message-icon">
                    ${type === 'error' ? '⚠️' : '✓'}
                </span>
                <span class="message-text">${message}</span>
            </div>
        `;
    }

    /**
     * Limpia el mensaje mostrado
     */
    clearMessage() {
        this.message = null;
        this.messageType = null;
        const messageContainer = document.getElementById('messageContainer');
        messageContainer.style.display = 'none';
    }

    /**
     * Actualiza el estado de carga del botón
     * @param {boolean} isLoading - Si está cargando
     */
    setLoading(isLoading) {
        this.loading = isLoading;
        
        const submitButton = document.getElementById('submitButton');
        const buttonText = document.getElementById('buttonText');
        const buttonSpinner = document.getElementById('buttonSpinner');

        submitButton.disabled = isLoading;
        
        if (isLoading) {
            buttonText.style.display = 'none';
            buttonSpinner.style.display = 'inline-flex';
            submitButton.classList.add('loading');
        } else {
            buttonText.style.display = 'inline';
            buttonSpinner.style.display = 'none';
            submitButton.classList.remove('loading');
        }
    }
}

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.LoginPage = LoginPage;
}
