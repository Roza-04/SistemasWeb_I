/**
 * VERSIÓN HTML/JS VANILLA de register/page.tsx
 * 
 * Comparación:
 * - page.tsx: React component con hooks (150 líneas)
 * - page.js: JavaScript puro (~120 líneas)
 * 
 * Funcionalidades:
 * - Formulario de registro
 * - Validación de email universitario
 * - Llamada a API de registro
 * - Redirección a verificación
 */

const API_BASE = "http://127.0.0.1:8000/api";

class RegisterPage {
    constructor() {
        this.email = "";
        this.password = "";
        this.loading = false;
        this.error = null;
    }

    init(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) return;
        
        this.render();
        this.attachEventListeners();
    }

    render() {
        this.container.innerHTML = `
            <div class="register-page">
                <div class="register-container">
                    <div class="register-header">
                        <div class="logo">
                            <div class="logo-icon">🚗</div>
                            <h1>UniGO</h1>
                        </div>
                        <h2>Registro</h2>
                        <p>Crea tu cuenta de UniGO</p>
                    </div>

                    <div id="errorContainer" style="display: none;"></div>

                    <form id="registerForm" class="register-form">
                        <div class="form-group">
                            <label for="email">Correo universitario</label>
                            <input
                                type="email"
                                id="email"
                                placeholder="tu@universidad.es"
                                required
                            />
                        </div>

                        <div class="form-group">
                            <label for="password">Contraseña</label>
                            <input
                                type="password"
                                id="password"
                                placeholder="••••••••"
                                required
                                minlength="6"
                            />
                        </div>

                        <button type="submit" id="submitButton" class="submit-button">
                            <span id="buttonText">Registrarse</span>
                        </button>
                    </form>

                    <div class="form-footer">
                        <p>
                            ¿Ya tienes cuenta?
                            <a href="../login/page-demo.html">Inicia sesión aquí</a>
                        </p>
                    </div>
                </div>
            </div>
        `;
    }

    attachEventListeners() {
        const form = document.getElementById('registerForm');
        form.addEventListener('submit', (e) => this.handleSubmit(e));
    }

    async handleSubmit(e) {
        e.preventDefault();
        
        this.email = document.getElementById('email').value;
        this.password = document.getElementById('password').value;
        
        this.clearError();
        this.setLoading(true);

        try {
            const response = await fetch(`${API_BASE}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: this.email,
                    password: this.password
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || 'Error al registrarse');
            }

            // Redirigir a verificación
            console.log('✅ Registro exitoso, redirigiendo a verificación');
            window.location.href = `../verify/page-demo.html?email=${encodeURIComponent(this.email)}`;

        } catch (error) {
            this.showError(error.message);
        } finally {
            this.setLoading(false);
        }
    }

    showError(message) {
        this.error = message;
        const errorContainer = document.getElementById('errorContainer');
        errorContainer.style.display = 'block';
        errorContainer.className = 'error-box';
        errorContainer.textContent = message;
    }

    clearError() {
        this.error = null;
        document.getElementById('errorContainer').style.display = 'none';
    }

    setLoading(isLoading) {
        this.loading = isLoading;
        const submitButton = document.getElementById('submitButton');
        const buttonText = document.getElementById('buttonText');
        
        submitButton.disabled = isLoading;
        buttonText.textContent = isLoading ? 'Registrando...' : 'Registrarse';
    }
}

if (typeof window !== 'undefined') {
    window.RegisterPage = RegisterPage;
}
