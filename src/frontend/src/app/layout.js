/**
 * VERSIÓN HTML/JS VANILLA de layout.tsx
 * 
 * Comparación:
 * - layout.tsx: React component para layout global (Next.js RootLayout)
 * - layout.js: No aplica directamente en vanilla JS (cada HTML tiene su propio layout)
 * 
 * Este archivo documenta cómo se estructura un layout en HTML/JS vanilla:
 * - Cada página HTML tiene su propia estructura completa
 * - Los estilos se pueden compartir en archivos CSS externos
 * - JavaScript se carga al final del body
 * - No hay concepto de "children" como en React
 */

/**
 * Plantilla de layout HTML básico para UniGO
 * Usar esta estructura en cada página:
 */
const LAYOUT_TEMPLATE = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>UniGO - Carsharing Universitario</title>
    <meta name="description" content="Plataforma de carsharing para estudiantes universitarios">
    <link rel="stylesheet" href="/styles/global.css">
</head>
<body>
    <!-- Header común -->
    <header class="site-header">
        <div class="logo">🚗 UniGO</div>
        <nav class="main-nav">
            <!-- Navegación -->
        </nav>
    </header>

    <!-- Contenido específico de cada página -->
    <main id="pageContent">
        <!-- El contenido se inyecta aquí -->
    </main>

    <!-- Footer común -->
    <footer class="site-footer">
        <p>&copy; 2024 UniGO - Carsharing Universitario</p>
    </footer>

    <!-- Scripts -->
    <script src="/scripts/page.js"></script>
</body>
</html>
`;

/**
 * En React/Next.js:
 * - layout.tsx envuelve todas las páginas automáticamente
 * - Los children se renderizan dentro del layout
 * - Metadata se define en el layout
 * 
 * En HTML/JS vanilla:
 * - Cada HTML es autónomo
 * - Se puede usar templating con JavaScript
 * - O incluir headers/footers con JavaScript
 * - O usar Server Side Includes (SSI)
 */

class LayoutManager {
    /**
     * Crea un header común para todas las páginas
     */
    static createHeader(isLoggedIn = false) {
        return `
            <header class="site-header">
                <div class="header-content">
                    <div class="logo">
                        <span class="logo-icon">🚗</span>
                        <h1>UniGO</h1>
                    </div>
                    <nav class="main-nav">
                        ${isLoggedIn ? `
                            <a href="/app/page-demo.html">Buscar Viajes</a>
                            <a href="/app/my-rides/page-demo.html">Mis Viajes</a>
                            <a href="/app/profile/page-demo.html">Perfil</a>
                            <a href="/app/post-ride/page-demo.html" class="btn-primary">Publicar Viaje</a>
                        ` : `
                            <a href="/app/login/page-demo.html">Iniciar Sesión</a>
                            <a href="/app/register/page-demo.html" class="btn-primary">Registrarse</a>
                        `}
                    </nav>
                </div>
            </header>
        `;
    }

    /**
     * Crea un footer común para todas las páginas
     */
    static createFooter() {
        return `
            <footer class="site-footer">
                <div class="footer-content">
                    <p>&copy; 2024 UniGO - Carsharing Universitario</p>
                    <div class="footer-links">
                        <a href="#">Términos y Condiciones</a>
                        <a href="#">Política de Privacidad</a>
                        <a href="#">Contacto</a>
                    </div>
                </div>
            </footer>
        `;
    }

    /**
     * Ejemplo de uso en una página:
     * 
     * <body>
     *     <div id="headerContainer"></div>
     *     <main id="pageContent"></main>
     *     <div id="footerContainer"></div>
     *     
     *     <script>
     *         const isLoggedIn = !!localStorage.getItem('token');
     *         document.getElementById('headerContainer').innerHTML = LayoutManager.createHeader(isLoggedIn);
     *         document.getElementById('footerContainer').innerHTML = LayoutManager.createFooter();
     *     </script>
     * </body>
     */
}

if (typeof window !== 'undefined') {
    window.LayoutManager = LayoutManager;
}

console.log('📄 Layout vanilla JS - Diferencias con React:');
console.log('- React: layout.tsx envuelve children automáticamente');
console.log('- Vanilla: Cada HTML define su propia estructura completa');
console.log('- Solución: Usar LayoutManager para crear header/footer compartidos');
