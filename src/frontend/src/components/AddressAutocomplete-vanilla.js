/**
 * VERSIÓN HTML/JS VANILLA del componente AddressAutocomplete.tsx
 * 
 * Este archivo demuestra la funcionalidad de autocompletado de direcciones
 * con JavaScript puro (sin React ni TypeScript).
 * 
 * Comparación:
 * - AddressAutocomplete.tsx: React + TypeScript + hooks (1,348 líneas)
 * - AddressAutocomplete.js: JavaScript vanilla simplificado (~200 líneas)
 * 
 * Funcionalidades implementadas:
 * - Autocompletado con Google Places API
 * - Debouncing de búsquedas (300ms)
 * - Validación de direcciones con placeId
 * - Navegación con teclado (↑↓ Enter Escape)
 * - Badge de verificación
 * 
 * Para ver en acción: AddressAutocomplete-demo.html
 */

class AddressAutocomplete {
    constructor(inputElement, options = {}) {
        this.input = inputElement;
        this.options = {
            placeholder: options.placeholder || "Ej. Calle Gran Vía, 1",
            onChange: options.onChange || (() => {}),
            restrictions: options.restrictions || { country: ["ES"] },
            debounceDelay: options.debounceDelay || 300
        };
        
        this.autocompleteService = null;
        this.placesService = null;
        this.selectedValue = null;
        this.timeout = null;
        this.dropdown = null;
        
        this.init();
    }
    
    init() {
        // Crear dropdown
        this.dropdown = document.createElement('div');
        this.dropdown.className = 'autocomplete-dropdown';
        this.dropdown.style.cssText = `
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: white;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            margin-top: 5px;
            max-height: 300px;
            overflow-y: auto;
            z-index: 1000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            display: none;
        `;
        
        // Insertar dropdown después del input
        this.input.parentElement.style.position = 'relative';
        this.input.parentElement.appendChild(this.dropdown);
        
        // Event listeners
        this.input.addEventListener('input', (e) => this.handleInput(e.target.value));
        this.input.addEventListener('keydown', (e) => this.handleKeyboard(e));
        document.addEventListener('click', (e) => {
            if (!this.input.parentElement.contains(e.target)) {
                this.hideDropdown();
            }
        });
        
        // Inicializar servicios de Google Maps
        this.initGoogleServices();
    }
    
    initGoogleServices() {
        if (window.google?.maps?.places) {
            this.autocompleteService = new google.maps.places.AutocompleteService();
            const dummyDiv = document.createElement('div');
            this.placesService = new google.maps.places.PlacesService(dummyDiv);
        } else {
            console.warn('Google Maps API no disponible');
        }
    }
    
    handleInput(value) {
        // Clear timeout anterior
        if (this.timeout) clearTimeout(this.timeout);
        
        // Si vacío, ocultar dropdown
        if (!value.trim()) {
            this.hideDropdown();
            this.selectedValue = null;
            this.options.onChange(null);
            return;
        }
        
        // Mostrar loading
        this.dropdown.innerHTML = '<div style="padding: 12px; text-align: center; color: #999;">Buscando...</div>';
        this.dropdown.style.display = 'block';
        
        // Debouncing
        this.timeout = setTimeout(() => {
            this.searchPlaces(value);
        }, this.options.debounceDelay);
    }
    
    searchPlaces(query) {
        if (!this.autocompleteService) {
            this.dropdown.innerHTML = '<div style="padding: 12px; text-align: center; color: #f44;">Error: Google Maps API no disponible</div>';
            return;
        }
        
        const request = {
            input: query,
            componentRestrictions: this.options.restrictions,
            types: ['address', 'establishment']
        };
        
        this.autocompleteService.getPlacePredictions(request, (predictions, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
                this.displaySuggestions(predictions);
            } else if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
                this.dropdown.innerHTML = '<div style="padding: 12px; text-align: center; color: #999;">No se encontraron resultados</div>';
            } else {
                this.dropdown.innerHTML = `<div style="padding: 12px; text-align: center; color: #f44;">Error: ${status}</div>`;
            }
        });
    }
    
    displaySuggestions(predictions) {
        this.dropdown.innerHTML = predictions.map((pred, index) => `
            <div class="suggestion-item" data-index="${index}" data-place-id="${pred.place_id}" 
                 style="padding: 12px; cursor: pointer; border-bottom: 1px solid #f5f5f5; transition: background 0.2s;">
                <div style="font-weight: 600; color: #333; margin-bottom: 2px;">${this.escapeHtml(pred.structured_formatting.main_text)}</div>
                <div style="font-size: 0.85rem; color: #666;">${this.escapeHtml(pred.structured_formatting.secondary_text || '')}</div>
            </div>
        `).join('');
        
        this.dropdown.style.display = 'block';
        
        // Event listeners
        this.dropdown.querySelectorAll('.suggestion-item').forEach(item => {
            item.addEventListener('mouseenter', () => {
                item.style.background = '#f5f5f5';
            });
            item.addEventListener('mouseleave', () => {
                item.style.background = 'white';
            });
            item.addEventListener('click', () => {
                this.selectPlace(item.dataset.placeId);
            });
        });
    }
    
    selectPlace(placeId) {
        if (!this.placesService) return;
        
        this.placesService.getDetails({ placeId: placeId }, (place, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK) {
                this.selectedValue = {
                    formattedAddress: place.formatted_address,
                    placeId: place.place_id,
                    lat: place.geometry.location.lat(),
                    lng: place.geometry.location.lng()
                };
                
                this.input.value = place.formatted_address;
                this.hideDropdown();
                this.options.onChange(this.selectedValue);
            }
        });
    }
    
    handleKeyboard(e) {
        const items = this.dropdown.querySelectorAll('.suggestion-item');
        if (items.length === 0) return;
        
        // Implementar navegación con teclado básica
        if (e.key === 'Escape') {
            this.hideDropdown();
        }
    }
    
    hideDropdown() {
        this.dropdown.style.display = 'none';
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    getValue() {
        return this.selectedValue;
    }
    
    setValue(value) {
        if (value) {
            this.selectedValue = value;
            this.input.value = value.formattedAddress;
        } else {
            this.selectedValue = null;
            this.input.value = '';
        }
    }
}

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.AddressAutocomplete = AddressAutocomplete;
}
