/**
 * VERSIÓN HTML/JS VANILLA del componente RideCard.tsx
 * 
 * Este archivo demuestra cómo crear una tarjeta de viaje (ride card)
 * con JavaScript puro (sin React ni TypeScript).
 * 
 * Comparación:
 * - RideCard.tsx: React component con state, props, hooks (224 líneas)
 * - RideCard.js: Función JavaScript pura con DOM manipulation (~150 líneas)
 * 
 * Funcionalidades implementadas:
 * - Renderizado de información del viaje
 * - Formato de fechas y horas
 * - Avatar del conductor con fallback
 * - Badge de estado (activo/inactivo)
 * - Valoración con estrellas
 * - Click handler
 * - Estilos inline y clases CSS
 * 
 * Para ver en acción: RideCard-demo.html
 */

/**
 * Crea una tarjeta de viaje (ride card) en HTML vanilla
 * @param {Object} ride - Datos del viaje
 * @param {Function} onClick - Callback al hacer click
 * @returns {HTMLElement} Elemento DOM de la tarjeta
 */
function createRideCard(ride, onClick) {
    // Crear contenedor principal
    const card = document.createElement('div');
    card.className = 'ride-card';
    card.style.cssText = `
        background: white;
        border-radius: 12px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.05);
        border: 1px solid #e0e0e0;
        padding: 24px;
        cursor: pointer;
        transition: all 0.3s;
        margin-bottom: 16px;
    `;
    
    // Hover effect
    card.addEventListener('mouseenter', () => {
        card.style.boxShadow = '0 4px 20px rgba(0,0,0,0.1)';
        card.style.transform = 'translateY(-2px)';
    });
    card.addEventListener('mouseleave', () => {
        card.style.boxShadow = '0 2px 10px rgba(0,0,0,0.05)';
        card.style.transform = 'translateY(0)';
    });
    
    card.addEventListener('click', () => onClick(ride));
    
    // Badge de estado
    const statusBadge = document.createElement('div');
    statusBadge.style.marginBottom = '16px';
    statusBadge.innerHTML = ride.is_active
        ? '<span style="display: inline-flex; align-items: center; padding: 6px 12px; border-radius: 9999px; font-size: 0.875rem; font-weight: 600; background: #e8f5e9; color: #2e7d32;">Publicado</span>'
        : '<span style="display: inline-flex; align-items: center; padding: 6px 12px; border-radius: 9999px; font-size: 0.875rem; font-weight: 600; background: #ffebee; color: #c62828;">Inactivo</span>';
    card.appendChild(statusBadge);
    
    // Contenedor principal de información
    const mainInfo = document.createElement('div');
    mainInfo.style.cssText = 'display: flex; align-items: center; gap: 24px; margin-bottom: 16px; flex-wrap: wrap;';
    
    // Hora de salida
    const departureTime = document.createElement('div');
    departureTime.style.cssText = 'font-size: 2rem; font-weight: bold; color: #333;';
    departureTime.textContent = formatTime(ride.departure_time);
    mainInfo.appendChild(departureTime);
    
    // Información de salida
    const departureInfo = document.createElement('div');
    departureInfo.innerHTML = `
        <div style="font-size: 1.5rem; font-weight: bold; color: #111;">${escapeHtml(ride.departure_city)}</div>
        <div style="font-size: 0.875rem; color: #666;">${formatDate(ride.departure_date)}</div>
    `;
    mainInfo.appendChild(departureInfo);
    
    // Flecha
    const arrow = document.createElement('div');
    arrow.innerHTML = `
        <svg style="width: 24px; height: 24px; color: #999;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
    `;
    mainInfo.appendChild(arrow);
    
    // Información de destino
    const destinationInfo = document.createElement('div');
    destinationInfo.style.display = 'flex';
    destinationInfo.style.alignItems = 'center';
    destinationInfo.style.gap = '12px';
    
    const destCity = document.createElement('div');
    destCity.style.cssText = 'font-size: 1.5rem; font-weight: bold; color: #111;';
    destCity.textContent = ride.destination_city;
    destinationInfo.appendChild(destCity);
    
    if (ride.arrival_time) {
        const arrivalTime = document.createElement('div');
        arrivalTime.style.cssText = 'font-size: 2rem; font-weight: bold; color: #333;';
        arrivalTime.textContent = formatTime(ride.arrival_time);
        destinationInfo.appendChild(arrivalTime);
    }
    mainInfo.appendChild(destinationInfo);
    
    // Información del conductor (a la derecha)
    const driverInfo = document.createElement('div');
    driverInfo.style.cssText = 'margin-left: auto; display: flex; align-items: center; gap: 12px;';
    
    // Avatar
    const avatar = document.createElement('div');
    avatar.style.cssText = 'width: 40px; height: 40px; border-radius: 50%; background: #e0e0e0; display: flex; align-items: center; justify-content: center; overflow: hidden;';
    
    if (ride.driver_avatar_url) {
        const img = document.createElement('img');
        img.src = getAvatarUrl(ride.driver_avatar_url);
        img.alt = ride.driver_name;
        img.style.cssText = 'width: 100%; height: 100%; object-fit: cover;';
        img.onerror = () => {
            avatar.innerHTML = `
                <svg style="width: 20px; height: 20px; color: #666;" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd"/>
                </svg>
            `;
        };
        avatar.appendChild(img);
    } else {
        avatar.innerHTML = `
            <svg style="width: 20px; height: 20px; color: #666;" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd"/>
            </svg>
        `;
    }
    driverInfo.appendChild(avatar);
    
    // Nombre y rating del conductor
    const driverDetails = document.createElement('div');
    let driverHTML = `<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
        <span style="font-size: 0.875rem; font-weight: 600; color: #111;">${escapeHtml(ride.driver_name)}</span>`;
    
    if (ride.driver_average_rating != null) {
        driverHTML += `
            <div style="display: flex; align-items: center; gap: 4px;">
                <svg style="width: 16px; height: 16px; color: #ffc107;" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span style="font-size: 0.75rem; font-weight: 600; color: #555;">${ride.driver_average_rating.toFixed(1)}</span>
            </div>`;
    }
    driverHTML += '</div>';
    
    if (ride.driver_university) {
        driverHTML += `<div style="font-size: 0.75rem; color: #666;">${escapeHtml(ride.driver_university)}</div>`;
    }
    
    if (ride.driver_completed_trips != null) {
        driverHTML += `<div style="font-size: 0.875rem; color: #666; margin-top: 4px;">🚗 ${ride.driver_completed_trips} viajes</div>`;
    }
    
    driverDetails.innerHTML = driverHTML;
    driverInfo.appendChild(driverDetails);
    
    mainInfo.appendChild(driverInfo);
    card.appendChild(mainInfo);
    
    // Detalles adicionales
    const details = document.createElement('div');
    details.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; font-size: 0.875rem; color: #666; border-top: 1px solid #e0e0e0; padding-top: 16px;';
    
    details.innerHTML = `
        <div><span style="font-weight: 600; color: #111;">Asientos:</span> ${ride.available_seats}/${ride.total_seats || ride.available_seats} disponibles</div>
        <div><span style="font-weight: 600; color: #111;">Precio:</span> ${ride.price_per_seat.toFixed(2)} €</div>
        ${ride.estimated_duration_minutes ? `<div><span style="font-weight: 600; color: #111;">Duración:</span> ${formatDuration(ride.estimated_duration_minutes)}</div>` : ''}
        <div><span style="font-weight: 600; color: #111;">Vehículo:</span> ${ride.vehicle_brand || ride.vehicle_color ? [ride.vehicle_brand, ride.vehicle_color].filter(Boolean).join(' ') : 'N/A'}</div>
    `;
    
    card.appendChild(details);
    
    return card;
}

// Funciones auxiliares
function formatTime(timeString) {
    return timeString; // Ya viene en formato HH:MM
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', { 
        weekday: 'short', 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

function formatDuration(minutes) {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins === 0 ? `${hours} h` : `${hours} h ${mins} min`;
}

function getAvatarUrl(avatarUrl) {
    if (!avatarUrl) return null;
    if (avatarUrl.startsWith('http')) return avatarUrl;
    const baseUrl = 'http://127.0.0.1:8000';
    if (avatarUrl.startsWith('/static/avatars/')) return baseUrl + avatarUrl;
    return `${baseUrl}/static/avatars/${avatarUrl}`;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.createRideCard = createRideCard;
}
