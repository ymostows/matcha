/**
 * GeolocationManager - Gestionnaire de géolocalisation robuste
 * 
 * Gère intelligemment la géolocalisation avec fallbacks multiples :
 * 1. GPS/HTML5 Geolocation (plus précis)
 * 2. Géolocalisation IP via APIs HTTPS (moins précis)  
 * 3. Saisie manuelle (fallback utilisateur)
 * 4. Ville par défaut (fallback ultime)
 * 
 * Adapté pour la navigation privée avec permissions strictes.
 */

export interface LocationData {
  latitude: number;
  longitude: number;
  city: string;
  publicCity?: string;
  method: 'gps' | 'ip' | 'manual' | 'default';
  precision: 'high' | 'medium' | 'low';
  accuracy?: string;
  timestamp: number;
}

export interface GeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  fallbackToIP?: boolean;
  defaultCity?: string;
  defaultCoordinates?: { lat: number; lng: number };
}

export interface PermissionStatus {
  granted: boolean;
  denied: boolean;
  prompt: boolean;
  supported: boolean;
  error?: string;
}

class GeolocationManager {
  private lastKnownPosition: LocationData | null = null;
  private isRequesting = false;

  /**
   * Demande la géolocalisation avec fallbacks intelligents
   */
  async requestLocation(options: GeolocationOptions = {}): Promise<LocationData> {
    if (this.isRequesting) {
      throw new Error('Une demande de géolocalisation est déjà en cours');
    }

    this.isRequesting = true;

    try {
      // 1. Essayer la géolocalisation GPS d'abord
      if (this.isGeolocationSupported()) {
        try {
          const gpsLocation = await this.getGPSLocation(options);
          this.lastKnownPosition = gpsLocation;
          return gpsLocation;
        } catch (gpsError) {
          
          // Si fallback IP activé, essayer l'IP
          if (options.fallbackToIP !== false) {
            try {
              const ipLocation = await this.getIPLocation();
              this.lastKnownPosition = ipLocation;
              return ipLocation;
            } catch (ipError) {
            }
          }
        }
      }

      // 2. Fallback vers la position par défaut ou ville par défaut
      if (options.defaultCity && options.defaultCoordinates) {
        const defaultLocation: LocationData = {
          latitude: options.defaultCoordinates.lat,
          longitude: options.defaultCoordinates.lng,
          city: options.defaultCity,
          publicCity: options.defaultCity,
          method: 'default',
          precision: 'low',
          accuracy: 'Position par défaut',
          timestamp: Date.now()
        };
        
        this.lastKnownPosition = defaultLocation;
        return defaultLocation;
      }

      // 3. Fallback ultime : Paris
      const parisLocation: LocationData = {
        latitude: 48.8566,
        longitude: 2.3522,
        city: 'Paris, France',
        publicCity: 'Paris, France',
        method: 'default',
        precision: 'low',
        accuracy: 'Position par défaut (Paris)',
        timestamp: Date.now()
      };
      
      this.lastKnownPosition = parisLocation;
      return parisLocation;

    } finally {
      this.isRequesting = false;
    }
  }

  /**
   * Géolocalisation GPS avec gestion d'erreur améliorée
   */
  private async getGPSLocation(options: GeolocationOptions = {}): Promise<LocationData> {
    return new Promise((resolve, reject) => {
      const geolocationOptions: PositionOptions = {
        enableHighAccuracy: options.enableHighAccuracy ?? false,
        timeout: options.timeout ?? 15000,
        maximumAge: options.maximumAge ?? 300000 // 5 minutes
      };

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          
          // Déterminer la précision
          let precision: 'high' | 'medium' | 'low' = 'medium';
          let accuracyDescription = '';
          
          if (accuracy <= 10) {
            precision = 'high';
            accuracyDescription = `Très précise (±${Math.round(accuracy)}m)`;
          } else if (accuracy <= 100) {
            precision = 'medium';
            accuracyDescription = `Précise (±${Math.round(accuracy)}m)`;
          } else {
            precision = 'low';
            accuracyDescription = `Approximative (±${Math.round(accuracy)}m)`;
          }
          
          // Essayer de géocoder la position
          let cityName = `GPS (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;
          let publicCity = 'Position GPS';
          
          try {
            const reverseGeocode = await this.reverseGeocode(latitude, longitude);
            if (reverseGeocode.city) {
              cityName = reverseGeocode.city;
              publicCity = reverseGeocode.city;
            }
          } catch (error) {
          }
          
          resolve({
            latitude,
            longitude,
            city: cityName,
            publicCity,
            method: 'gps',
            precision,
            accuracy: accuracyDescription,
            timestamp: Date.now()
          });
        },
        (error) => {
          let errorMessage = 'Erreur de géolocalisation';
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Permission de géolocalisation refusée. En navigation privée, cliquez sur l\'icône 🔒 dans la barre d\'adresse pour autoriser.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Position GPS indisponible. Vérifiez que la géolocalisation est activée sur votre appareil.';
              break;
            case error.TIMEOUT:
              errorMessage = 'Délai d\'attente de géolocalisation dépassé. Réessayez ou utilisez une autre méthode.';
              break;
            default:
              errorMessage = `Erreur de géolocalisation: ${error.message}`;
          }
          
          reject(new Error(errorMessage));
        },
        geolocationOptions
      );
    });
  }

  /**
   * Géolocalisation par IP avec APIs HTTPS sécurisées
   */
  private async getIPLocation(): Promise<LocationData> {
    const apiEndpoints = [
      // API 1: ipapi.co (HTTPS, fiable)
      {
        url: 'https://ipapi.co/json/',
        parser: (data: any) => {
          if (data.latitude && data.longitude && data.city && data.country_name) {
            return {
              latitude: data.latitude,
              longitude: data.longitude,
              city: `${data.city}, ${data.country_name}`,
              region: data.region,
              country: data.country_name
            };
          }
          return null;
        }
      },
      
      // API 2: ipgeolocation.io (HTTPS, backup)
      {
        url: 'https://api.ipgeolocation.io/ipgeo?apiKey=free',
        parser: (data: any) => {
          if (data.latitude && data.longitude && data.city && data.country_name) {
            return {
              latitude: parseFloat(data.latitude),
              longitude: parseFloat(data.longitude),
              city: `${data.city}, ${data.country_name}`,
              region: data.state_prov,
              country: data.country_name
            };
          }
          return null;
        }
      },
      
      // API 3: ip-api.com via proxy HTTPS
      {
        url: 'https://ipapi.co/json/', // Fallback vers ipapi.co
        parser: (data: any) => {
          if (data.latitude && data.longitude) {
            return {
              latitude: data.latitude,
              longitude: data.longitude,
              city: `${data.city || 'Ville inconnue'}, ${data.country_name || 'Pays inconnu'}`,
              region: data.region,
              country: data.country_name
            };
          }
          return null;
        }
      }
    ];

    for (const endpoint of apiEndpoints) {
      try {
        
        const response = await fetch(endpoint.url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          },
          signal: AbortSignal.timeout(10000) // 10 secondes timeout
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        const parsed = endpoint.parser(data);

        if (parsed) {
          return {
            latitude: parsed.latitude,
            longitude: parsed.longitude,
            city: parsed.city,
            publicCity: `Près de ${parsed.city}`,
            method: 'ip',
            precision: 'low',
            accuracy: 'Basée sur votre adresse IP (~5-15km)',
            timestamp: Date.now()
          };
        }
      } catch (error) {
        continue;
      }
    }

    throw new Error('Toutes les APIs de géolocalisation IP ont échoué');
  }

  /**
   * Géocodage inversé pour obtenir une ville à partir de coordonnées
   */
  private async reverseGeocode(lat: number, lng: number): Promise<{ city?: string; region?: string; country?: string }> {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'MatchaApp/1.0'
          },
          signal: AbortSignal.timeout(8000)
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      if (data.address) {
        const address = data.address;
        const city = address.city || address.town || address.village || address.municipality;
        const country = address.country;
        
        if (city && country) {
          return {
            city: `${city}, ${country}`,
            region: address.state || address.region,
            country: country
          };
        }
      }
      
      return {};
    } catch (error) {
      return {};
    }
  }

  /**
   * Géolocalise une ville saisie manuellement
   */
  async geocodeCity(cityName: string): Promise<LocationData | null> {
    if (!cityName.trim()) {
      return null;
    }

    const cleanCity = cityName.trim();

    try {
      // Utiliser Nominatim (OpenStreetMap) pour géocoder la ville
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleanCity)}&limit=1&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'MatchaApp/1.0'
          },
          signal: AbortSignal.timeout(8000)
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const results = await response.json();
      
      if (results.length > 0) {
        const result = results[0];
        const lat = parseFloat(result.lat);
        const lng = parseFloat(result.lon);
        
        if (lat && lng) {
          return {
            latitude: lat,
            longitude: lng,
            city: cleanCity,
            publicCity: result.display_name || cleanCity,
            method: 'manual',
            precision: 'medium',
            accuracy: 'Géolocalisée automatiquement',
            timestamp: Date.now()
          };
        }
      }
      
      // Si pas trouvé, retourner avec coordonnées par défaut
      return {
        latitude: 0,
        longitude: 0,
        city: cleanCity,
        publicCity: cleanCity,
        method: 'manual',
        precision: 'low',
        accuracy: 'Saisie manuelle (pas de coordonnées GPS)',
        timestamp: Date.now()
      };
      
    } catch (error) {
      
      // Fallback : retourner avec coordonnées nulles
      return {
        latitude: 0,
        longitude: 0,
        city: cleanCity,
        publicCity: cleanCity,
        method: 'manual',
        precision: 'low',
        accuracy: 'Saisie manuelle (géocodage échoué)',
        timestamp: Date.now()
      };
    }
  }

  /**
   * Vérifie le statut des permissions de géolocalisation
   */
  async checkPermissionStatus(): Promise<PermissionStatus> {
    const status: PermissionStatus = {
      granted: false,
      denied: false,
      prompt: false,
      supported: this.isGeolocationSupported()
    };

    if (!status.supported) {
      status.error = 'Géolocalisation non supportée par ce navigateur';
      return status;
    }

    try {
      // Vérifier les permissions via l'API Permissions si disponible
      if ('permissions' in navigator) {
        const permission = await navigator.permissions.query({ name: 'geolocation' });
        
        switch (permission.state) {
          case 'granted':
            status.granted = true;
            break;
          case 'denied':
            status.denied = true;
            status.error = 'Permission de géolocalisation refusée';
            break;
          case 'prompt':
            status.prompt = true;
            break;
        }
        
        return status;
      } else {
        // Fallback: essayer une géolocalisation rapide pour tester
        status.prompt = true; // Supposer qu'une demande sera nécessaire
      }
    } catch (error) {
      status.error = `Erreur lors de la vérification des permissions: ${error}`;
    }

    return status;
  }

  /**
   * Vérifie si la géolocalisation est supportée
   */
  isGeolocationSupported(): boolean {
    return 'geolocation' in navigator;
  }

  /**
   * Récupère la dernière position connue
   */
  getLastKnownPosition(): LocationData | null {
    return this.lastKnownPosition;
  }

  /**
   * Efface la dernière position connue
   */
  clearLastKnownPosition(): void {
    this.lastKnownPosition = null;
  }

  /**
   * Indique si une demande est en cours
   */
  isRequestingLocation(): boolean {
    return this.isRequesting;
  }
}

// Instance singleton
const geolocationManager = new GeolocationManager();

export default geolocationManager;
export { GeolocationManager };