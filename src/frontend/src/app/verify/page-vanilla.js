/**
 * VERSIÓN HTML/JS VANILLA de verify/page.tsx
 * 
 * Comparación:
 * - page.tsx: 305 líneas React
 * - page.js: ~100 líneas vanilla
 * 
 * Funcionalidades:
 * - Verificación de código de 6 dígitos
 * - Auto-submit al completar
 * - Manejo de paste
 */

class VerifyPage {
    constructor() {
        this.code = ['', '', '', '', '', ''];
        this.email = '';
    }

    init(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) return;
        
        // Get email from URL
        const params = new URLSearchParams(window.location.search);
        this.email = params.get('email') || '';
        
        this.render();
        this.attachEventListeners();
        
        // Focus first input
        setTimeout(() => {
            document.getElementById('code-0')?.focus();
        }, 100);
    }

    render() {
        this.container.innerHTML = `
            <div class="verify-page">
                <div class="verify-container">
                    <div class="verify-header">
                        <div class="logo">🚗 <strong>UniGO</strong></div>
                        <h2>Verifica tu email</h2>
                        <p>Hemos enviado un código de 6 dígitos a:<br><strong>${this.email}</strong></p>
                    </div>

                    <div class="code-inputs">
                        ${[0,1,2,3,4,5].map(i => `
                            <input
                                type="text"
                                id="code-${i}"
                                class="code-input"
                                maxlength="1"
                                inputmode="numeric"
                                pattern="[0-9]"
                            />
                        `).join('')}
                    </div>

                    <div id="errorMessage" class="error-message" style="display: none;"></div>

                    <button id="submitBtn" class="submit-btn">Verificar</button>

                    <div class="footer-links">
                        <a href="../login/page-demo.html">← Volver al login</a>
                    </div>
                </div>
            </div>
        `;
    }

    attachEventListeners() {
        for (let i = 0; i < 6; i++) {
            const input = document.getElementById(`code-${i}`);
            
            input.addEventListener('input', (e) => {
                const value = e.target.value;
                
                // Only allow numbers
                if (value && !/^\d$/.test(value)) {
                    e.target.value = '';
                    return;
                }
                
                this.code[i] = value;
                
                // Auto-advance
                if (value && i < 5) {
                    document.getElementById(`code-${i + 1}`).focus();
                }
                
                // Auto-submit if all filled
                if (this.code.every(c => c !== '')) {
                    this.handleSubmit();
                }
            });
            
            input.addEventListener('keydown', (e) => {
                // Backspace handling
                if (e.key === 'Backspace' && !e.target.value && i > 0) {
                    document.getElementById(`code-${i - 1}`).focus();
                }
            });
            
            input.addEventListener('paste', (e) => {
                e.preventDefault();
                const pastedData = e.clipboardData.getData('text').slice(0, 6);
                const digits = pastedData.match(/\d/g) || [];
                
                digits.forEach((digit, idx) => {
                    if (idx < 6) {
                        this.code[idx] = digit;
                        document.getElementById(`code-${idx}`).value = digit;
                    }
                });
                
                if (digits.length === 6) {
                    this.handleSubmit();
                } else {
                    const nextIdx = Math.min(digits.length, 5);
                    document.getElementById(`code-${nextIdx}`).focus();
                }
            });
        }
        
        document.getElementById('submitBtn').addEventListener('click', () => this.handleSubmit());
    }

    async handleSubmit() {
        const codeString = this.code.join('');
        
        if (codeString.length !== 6) {
            this.showError('Por favor, completa el código de 6 dígitos');
            return;
        }
        
        console.log('✅ Verificando código:', codeString);
        
        // Simular verificación
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        alert('¡Email verificado exitosamente! (simulado)\\n\\nEn la app real, ahora irías a completar tu perfil.');
        window.location.href = '../profile/page-demo.html';
    }

    showError(message) {
        const errorDiv = document.getElementById('errorMessage');
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 3000);
    }
}

if (typeof window !== 'undefined') {
    window.VerifyPage = VerifyPage;
}
