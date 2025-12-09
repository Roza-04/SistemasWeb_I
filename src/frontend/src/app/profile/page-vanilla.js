/**
 * VERSIÓN HTML/JS VANILLA de profile/page.tsx
 * 
 * Comparación:
 * - page.tsx: React component complejo (634 líneas)
 * - page.js: JavaScript puro (~150 líneas)
 * 
 * Funcionalidades:
 * - Visualización de perfil de usuario
 * - Edición de datos personales
 * - Subida de avatar
 * - Información universitaria
 */

const API_BASE = "http://127.0.0.1:8000/api";

class ProfilePage {
    constructor() {
        this.profile = null;
        this.editing = false;
    }

    init(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) return;
        
        this.loadProfile();
    }

    async loadProfile() {
        // Simular carga de perfil
        this.profile = {
            first_name: "Juan",
            last_name: "Pérez",
            email: "juan.perez@upm.es",
            university: "Universidad Politécnica de Madrid",
            degree: "Ingeniería Informática",
            course: 3,
            avatar_url: null,
            average_rating: 4.8,
            completed_trips: 47
        };
        
        this.render();
        this.attachEventListeners();
    }

    render() {
        this.container.innerHTML = `
            <div class="profile-page">
                <header class="header">
                    <div class="logo">🚗 <strong>UniGO</strong></div>
                    <h2>Mi Perfil</h2>
                </header>

                <div class="profile-container">
                    <!-- Avatar Section -->
                    <div class="avatar-section">
                        <div class="avatar-container">
                            ${this.profile.avatar_url ? 
                                `<img src="${this.profile.avatar_url}" alt="Avatar" class="avatar-img" />` :
                                `<div class="avatar-placeholder">
                                    <svg fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd"/>
                                    </svg>
                                </div>`
                            }
                        </div>
                        <button id="uploadAvatarBtn" class="upload-btn">📷 Cambiar foto</button>
                        <input type="file" id="avatarInput" accept="image/*" style="display: none;" />
                    </div>

                    <!-- Stats -->
                    <div class="stats-section">
                        <div class="stat-card">
                            <div class="stat-icon">⭐</div>
                            <div class="stat-value">${this.profile.average_rating.toFixed(1)}</div>
                            <div class="stat-label">Valoración</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon">🚗</div>
                            <div class="stat-value">${this.profile.completed_trips}</div>
                            <div class="stat-label">Viajes completados</div>
                        </div>
                    </div>

                    <!-- Profile Form -->
                    <form id="profileForm" class="profile-form">
                        <div class="form-section">
                            <h3>Información personal</h3>
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="first_name">Nombre *</label>
                                    <input type="text" id="first_name" value="${this.profile.first_name}" required ${!this.editing ? 'disabled' : ''} />
                                </div>
                                <div class="form-group">
                                    <label for="last_name">Apellidos *</label>
                                    <input type="text" id="last_name" value="${this.profile.last_name}" required ${!this.editing ? 'disabled' : ''} />
                                </div>
                            </div>
                            <div class="form-group">
                                <label for="email">Email</label>
                                <input type="email" id="email" value="${this.profile.email}" disabled />
                            </div>
                        </div>

                        <div class="form-section">
                            <h3>Información universitaria</h3>
                            <div class="form-group">
                                <label for="university">Universidad</label>
                                <input type="text" id="university" value="${this.profile.university}" disabled />
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="degree">Carrera *</label>
                                    <input type="text" id="degree" value="${this.profile.degree}" required ${!this.editing ? 'disabled' : ''} />
                                </div>
                                <div class="form-group">
                                    <label for="course">Curso *</label>
                                    <select id="course" ${!this.editing ? 'disabled' : ''}>
                                        ${[1,2,3,4,5,6].map(n => `<option value="${n}" ${this.profile.course === n ? 'selected' : ''}>${n}º</option>`).join('')}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div class="form-actions">
                            ${!this.editing ? 
                                `<button type="button" id="editBtn" class="btn-primary">✏️ Editar perfil</button>` :
                                `<button type="submit" class="btn-primary">💾 Guardar cambios</button>
                                 <button type="button" id="cancelBtn" class="btn-secondary">❌ Cancelar</button>`
                            }
                        </div>
                    </form>

                    <div class="danger-zone">
                        <button id="logoutBtn" class="btn-danger">🚪 Cerrar sesión</button>
                    </div>
                </div>
            </div>
        `;
    }

    attachEventListeners() {
        const editBtn = document.getElementById('editBtn');
        const cancelBtn = document.getElementById('cancelBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        const uploadAvatarBtn = document.getElementById('uploadAvatarBtn');
        const avatarInput = document.getElementById('avatarInput');
        const form = document.getElementById('profileForm');

        if (editBtn) editBtn.addEventListener('click', () => this.toggleEdit(true));
        if (cancelBtn) cancelBtn.addEventListener('click', () => this.toggleEdit(false));
        if (logoutBtn) logoutBtn.addEventListener('click', () => this.logout());
        if (uploadAvatarBtn) uploadAvatarBtn.addEventListener('click', () => avatarInput.click());
        if (avatarInput) avatarInput.addEventListener('change', (e) => this.handleAvatarUpload(e));
        if (form) form.addEventListener('submit', (e) => this.handleSubmit(e));
    }

    toggleEdit(editing) {
        this.editing = editing;
        this.render();
        this.attachEventListeners();
    }

    async handleSubmit(e) {
        e.preventDefault();
        console.log('💾 Guardando cambios...');
        
        this.profile.first_name = document.getElementById('first_name').value;
        this.profile.last_name = document.getElementById('last_name').value;
        this.profile.degree = document.getElementById('degree').value;
        this.profile.course = parseInt(document.getElementById('course').value);
        
        alert('¡Cambios guardados exitosamente! (simulado)');
        this.toggleEdit(false);
    }

    handleAvatarUpload(e) {
        const file = e.target.files[0];
        if (file) {
            console.log('📷 Subiendo avatar:', file.name);
            alert('Avatar actualizado (simulado)');
        }
    }

    logout() {
        if (confirm('¿Seguro que quieres cerrar sesión?')) {
            localStorage.removeItem('token');
            console.log('🚪 Sesión cerrada');
            window.location.href = '../login/page-demo.html';
        }
    }
}

if (typeof window !== 'undefined') {
    window.ProfilePage = ProfilePage;
}
