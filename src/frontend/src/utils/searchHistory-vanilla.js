/**
 * VERSIÓN HTML/JS VANILLA del módulo searchHistory.ts
 * 
 * Este archivo demuestra la misma funcionalidad implementada
 * con JavaScript puro (sin TypeScript ni React).
 * 
 * Comparación:
 * - searchHistory.ts: TypeScript con tipos estáticos (95% JS puro)
 * - searchHistory.js: JavaScript vanilla idéntico (sin tipos)
 * 
 * Para ver este código en acción, abre: searchHistory-demo.html
 */

// Constantes
const SEARCH_HISTORY_KEY = 'unigo_search_history';
const MAX_HISTORY_ITEMS = 20;

/**
 * Obtener todo el historial de búsquedas
 * @returns {Array} Array de objetos con {address, placeId, lat, lng, timestamp, fieldType}
 */
function getSearchHistory() {
    if (typeof window === 'undefined') return [];
    
    try {
        const stored = localStorage.getItem(SEARCH_HISTORY_KEY);
        if (!stored) return [];
        
        const history = JSON.parse(stored);
        // Ordenar por timestamp (más recientes primero)
        return history.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
        console.error('Error al leer historial:', error);
        return [];
    }
}

/**
 * Obtener historial filtrado por tipo de campo
 * @param {string} fieldType - 'departure' o 'destination'
 * @returns {Array} Array filtrado (máximo 10 items)
 */
function getSearchHistoryByField(fieldType) {
    const allHistory = getSearchHistory();
    return allHistory
        .filter(item => item.fieldType === fieldType)
        .slice(0, 10);
}

/**
 * Agregar búsqueda al historial
 * @param {string} address - Dirección buscada
 * @param {string} fieldType - 'departure' o 'destination'
 * @param {string} placeId - ID de Google Places (opcional)
 * @param {number} lat - Latitud (opcional)
 * @param {number} lng - Longitud (opcional)
 */
function addToSearchHistory(address, fieldType, placeId = null, lat = null, lng = null) {
    if (typeof window === 'undefined') return;
    
    try {
        const history = getSearchHistory();
        
        // Eliminar duplicados (misma dirección y tipo)
        const filtered = history.filter(
            item => !(item.address === address && item.fieldType === fieldType)
        );
        
        // Crear nuevo item
        const newItem = {
            address: address,
            placeId: placeId,
            lat: lat,
            lng: lng,
            timestamp: Date.now(),
            fieldType: fieldType
        };
        
        // Agregar al inicio y limitar a MAX_HISTORY_ITEMS
        const updated = [newItem, ...filtered].slice(0, MAX_HISTORY_ITEMS);
        localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
    } catch (error) {
        console.error('Error al guardar historial:', error);
    }
}

/**
 * Limpiar todo el historial
 */
function clearSearchHistory() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(SEARCH_HISTORY_KEY);
}

// Exportar para uso en otros archivos (si se usa con módulos ES6)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getSearchHistory,
        getSearchHistoryByField,
        addToSearchHistory,
        clearSearchHistory
    };
}
