import * as https from 'https';
import * as http from 'http';

export interface GeocodingResult {
  city: string;
  country: string;
  region?: string;
  formatted: string; // Ville formatée pour affichage public
  precision: 'exact' | 'approximate';
}

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
}

// Cache simple en mémoire pour éviter les appels répétés
const geocodingCache = new Map<string, GeocodingResult>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 heures
const cacheTimestamps = new Map<string, number>();

export class GeocodingService {
  
  // Fonction utilitaire pour faire une requête HTTP simple
  private static makeRequest(url: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const protocol = url.startsWith('https:') ? https : http;
      
      const req = protocol.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Matcha-Dating-App/1.0'
        }
      }, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            if (res.statusCode !== 200) {
              reject(new Error(`HTTP ${res.statusCode}`));
              return;
            }
            const jsonData = JSON.parse(data);
            resolve(jsonData);
          } catch (error) {
            reject(new Error('Invalid JSON response'));
          }
        });
      });
      
      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
    });
  }

  // Vérifier si une entrée cache est encore valide
  private static isCacheValid(key: string): boolean {
    const timestamp = cacheTimestamps.get(key);
    if (!timestamp) return false;
    return Date.now() - timestamp < CACHE_TTL;
  }

  // Ajouter au cache
  private static addToCache(key: string, result: GeocodingResult): void {
    geocodingCache.set(key, result);
    cacheTimestamps.set(key, Date.now());
  }

  // Géocodage inversé principal avec Nominatim (OpenStreetMap)
  static async reverseGeocode(coordinates: LocationCoordinates): Promise<GeocodingResult | null> {
    const { latitude, longitude } = coordinates;
    
    // Validation des coordonnées
    if (!this.validateCoordinates(latitude, longitude)) {
      throw new Error('Coordonnées invalides');
    }

    const cacheKey = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
    
    // Vérifier le cache
    if (this.isCacheValid(cacheKey)) {
      const cached = geocodingCache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    try {
      // Utiliser Nominatim (OpenStreetMap) - service gratuit et fiable
      const result = await this.reverseGeocodeWithNominatim(latitude, longitude);
      if (result) {
        this.addToCache(cacheKey, result);
        return result;
      }
    } catch (error) {
      console.warn('Échec géocodage inversé Nominatim:', error);
    }

    // Fallback : approximation basée sur les coordonnées
    return this.approximateLocationFromCoordinates(latitude, longitude);
  }

  // Géocodage inversé avec Nominatim (OpenStreetMap)
  private static async reverseGeocodeWithNominatim(lat: number, lng: number): Promise<GeocodingResult | null> {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`;
      const data = await this.makeRequest(url);
      
      if (data.error || !data.address) {
        return null;
      }

      const address = data.address;
      const city = address.city || address.town || address.village || address.municipality || 'Ville inconnue';
      const country = address.country || 'Pays inconnu';
      const region = address.state || address.region || address.county;

      return {
        city,
        country,
        region,
        formatted: `${city}, ${country}`,
        precision: 'exact'
      };
    } catch (error) {
      throw error;
    }
  }

  // Approximation géographique basée sur les coordonnées
  private static approximateLocationFromCoordinates(lat: number, lng: number): GeocodingResult {
    // Base de données simple de villes importantes par zone géographique
    const majorCities = [
      { name: 'Paris', country: 'France', lat: 48.8566, lng: 2.3522, region: 'Île-de-France' },
      { name: 'Lyon', country: 'France', lat: 45.7640, lng: 4.8357, region: 'Auvergne-Rhône-Alpes' },
      { name: 'Marseille', country: 'France', lat: 43.2965, lng: 5.3698, region: 'Provence-Alpes-Côte d\'Azur' },
      { name: 'Toulouse', country: 'France', lat: 43.6047, lng: 1.4442, region: 'Occitanie' },
      { name: 'Nice', country: 'France', lat: 43.7102, lng: 7.2620, region: 'Provence-Alpes-Côte d\'Azur' },
      { name: 'Nantes', country: 'France', lat: 47.2184, lng: -1.5536, region: 'Pays de la Loire' },
      { name: 'Strasbourg', country: 'France', lat: 48.5734, lng: 7.7521, region: 'Grand Est' },
      { name: 'Montpellier', country: 'France', lat: 43.6110, lng: 3.8767, region: 'Occitanie' },
      { name: 'Bordeaux', country: 'France', lat: 44.8378, lng: -0.5792, region: 'Nouvelle-Aquitaine' },
      { name: 'Lille', country: 'France', lat: 50.6292, lng: 3.0573, region: 'Hauts-de-France' },
      // Quelques villes internationales pour les tests
      { name: 'Londres', country: 'Royaume-Uni', lat: 51.5074, lng: -0.1278, region: 'Angleterre' },
      { name: 'Berlin', country: 'Allemagne', lat: 52.5200, lng: 13.4050, region: 'Berlin' },
      { name: 'Madrid', country: 'Espagne', lat: 40.4168, lng: -3.7038, region: 'Madrid' },
      { name: 'Rome', country: 'Italie', lat: 41.9028, lng: 12.4964, region: 'Latium' },
      { name: 'Amsterdam', country: 'Pays-Bas', lat: 52.3676, lng: 4.9041, region: 'Hollande-Septentrionale' }
    ];

    // Trouver la ville la plus proche
    if (majorCities.length === 0) {
      // Fallback si aucune ville définie
      return {
        city: 'Paris',
        country: 'France',
        region: 'Île-de-France',
        formatted: 'Près de Paris, France',
        precision: 'approximate'
      };
    }

    let closestCity = majorCities[0]!; // On sait qu'il y a au moins une ville
    let minDistance = this.calculateDistance(lat, lng, closestCity.lat, closestCity.lng);

    for (const city of majorCities) {
      const distance = this.calculateDistance(lat, lng, city.lat, city.lng);
      if (distance < minDistance) {
        minDistance = distance;
        closestCity = city;
      }
    }

    return {
      city: closestCity.name,
      country: closestCity.country,
      region: closestCity.region,
      formatted: `Près de ${closestCity.name}, ${closestCity.country}`,
      precision: 'approximate'
    };
  }

  // Géocodage direct : convertir un nom de ville en coordonnées
  static async geocodeCity(cityName: string): Promise<LocationCoordinates | null> {
    if (!cityName || cityName.trim().length < 2) {
      return null;
    }

    const cleanCityName = cityName.trim();
    const cacheKey = `city:${cleanCityName.toLowerCase()}`;
    
    // Vérifier le cache
    if (this.isCacheValid(cacheKey)) {
      const cached = geocodingCache.get(cacheKey);
      if (cached && cached.city) {
        // Le cache contient déjà les coordonnées approximatives
        return this.getCityCoordinatesFromResult(cached);
      }
    }

    try {
      // Utiliser Nominatim pour géocoder la ville
      const coordinates = await this.geocodeCityWithNominatim(cleanCityName);
      if (coordinates) {
        // Créer un résultat pour le cache
        const result: GeocodingResult = {
          city: cleanCityName,
          country: 'France',
          formatted: `${cleanCityName}, France`,
          precision: 'exact'
        };
        this.addToCache(cacheKey, result);
        return coordinates;
      }
    } catch (error) {
      console.warn('Échec géocodage ville Nominatim:', error);
    }

    // Fallback : chercher dans notre base de villes connues
    const approximateCoords = this.findApproximateCityCoordinates(cleanCityName);
    if (approximateCoords) {
      // Créer un résultat pour le cache
      const result: GeocodingResult = {
        city: cleanCityName,
        country: 'France',
        formatted: cleanCityName,
        precision: 'approximate'
      };
      this.addToCache(cacheKey, result);
      return approximateCoords;
    }

    return null;
  }

  // Géocodage avec Nominatim - retourne directement les coordonnées
  private static async geocodeCityWithNominatim(cityName: string): Promise<LocationCoordinates | null> {
    try {
      const encodedCity = encodeURIComponent(cityName);
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedCity}&countrycodes=fr&limit=1&addressdetails=1`;
      const data = await this.makeRequest(url);
      
      if (!data || data.length === 0 || !data[0].lat || !data[0].lon) {
        return null;
      }

      const location = data[0];
      return {
        latitude: parseFloat(location.lat),
        longitude: parseFloat(location.lon)
      };
    } catch (error) {
      throw error;
    }
  }

  // Extraire les coordonnées d'un résultat de géocodage
  private static getCityCoordinatesFromResult(result: GeocodingResult): LocationCoordinates | null {
    // Si on a un résultat avec des coordonnées approximatives dans notre cache
    const approxCoords = this.findApproximateCityCoordinates(result.city);
    return approxCoords;
  }

  // Chercher des coordonnées approximatives dans notre base de villes
  private static findApproximateCityCoordinates(cityName: string): LocationCoordinates | null {
    const lowerCityName = cityName.toLowerCase();
    
    // Base étendue de villes françaises avec banlieues parisiennes
    const cityCoordinates = [
      // Grandes villes
      { names: ['paris'], lat: 48.8566, lng: 2.3522 },
      { names: ['lyon'], lat: 45.7640, lng: 4.8357 },
      { names: ['marseille'], lat: 43.2965, lng: 5.3698 },
      { names: ['toulouse'], lat: 43.6047, lng: 1.4442 },
      { names: ['nice'], lat: 43.7102, lng: 7.2620 },
      { names: ['nantes'], lat: 47.2184, lng: -1.5536 },
      { names: ['montpellier'], lat: 43.6110, lng: 3.8767 },
      { names: ['strasbourg'], lat: 48.5734, lng: 7.7521 },
      { names: ['bordeaux'], lat: 44.8378, lng: -0.5792 },
      { names: ['lille'], lat: 50.6292, lng: 3.0573 },
      
      // Banlieue parisienne et Île-de-France
      { names: ['boulogne-billancourt', 'boulogne billancourt'], lat: 48.8335, lng: 2.2426 },
      { names: ['saint-denis', 'st denis'], lat: 48.9362, lng: 2.3574 },
      { names: ['argenteuil'], lat: 48.9474, lng: 2.2472 },
      { names: ['montreuil'], lat: 48.8618, lng: 2.4469 },
      { names: ['créteil', 'creteil'], lat: 48.7909, lng: 2.4708 },
      { names: ['nanterre'], lat: 48.8926, lng: 2.2067 },
      { names: ['vitry-sur-seine', 'vitry sur seine'], lat: 48.7875, lng: 2.4039 },
      { names: ['colombes'], lat: 48.9226, lng: 2.2581 },
      { names: ['aulnay-sous-bois', 'aulnay sous bois'], lat: 48.9538, lng: 2.4990 },
      { names: ['asnières-sur-seine', 'asnieres sur seine', 'asnières', 'asnieres'], lat: 48.9145, lng: 2.2852 },
      { names: ['rueil-malmaison', 'rueil malmaison'], lat: 48.8759, lng: 2.1991 },
      { names: ['courbevoie'], lat: 48.8971, lng: 2.2528 },
      { names: ['versailles'], lat: 48.8014, lng: 2.1301 },
      { names: ['levallois-perret', 'levallois perret'], lat: 48.8978, lng: 2.2875 },
      { names: ['neuilly-sur-seine', 'neuilly sur seine'], lat: 48.8848, lng: 2.2648 },
      { names: ['antony'], lat: 48.7537, lng: 2.2978 },
      { names: ['clichy'], lat: 48.9021, lng: 2.3067 },
      { names: ['clichy-sous-bois', 'clichy sous bois'], lat: 48.9040, lng: 2.5450 },
      { names: ['sarcelles'], lat: 49.0024, lng: 2.3774 },
      { names: ['bobigny'], lat: 48.9085, lng: 2.4490 },
      { names: ['drancy'], lat: 48.9239, lng: 2.4451 },
      
      // Autres villes importantes
      { names: ['rennes'], lat: 48.1173, lng: -1.6778 },
      { names: ['reims'], lat: 49.2583, lng: 4.0317 },
      { names: ['le havre'], lat: 49.4944, lng: 0.1079 },
      { names: ['saint-étienne', 'saint etienne'], lat: 45.4397, lng: 4.3872 },
      { names: ['toulon'], lat: 43.1242, lng: 5.9280 },
      { names: ['grenoble'], lat: 45.1885, lng: 5.7245 },
      { names: ['dijon'], lat: 47.3220, lng: 5.0415 },
      { names: ['angers'], lat: 47.4784, lng: -0.5632 },
      { names: ['nîmes', 'nimes'], lat: 43.8367, lng: 4.3601 },
      { names: ['villeurbanne'], lat: 45.7665, lng: 4.8797 },
      { names: ['clermont-ferrand', 'clermont ferrand'], lat: 45.7772, lng: 3.0870 },
      { names: ['le mans'], lat: 48.0077, lng: 0.1996 },
      { names: ['aix-en-provence', 'aix en provence'], lat: 43.5297, lng: 5.4474 },
      { names: ['brest'], lat: 48.3905, lng: -4.4860 },
      { names: ['tours'], lat: 47.3941, lng: 0.6848 },
      { names: ['amiens'], lat: 49.8942, lng: 2.2957 },
      { names: ['limoges'], lat: 45.8336, lng: 1.2611 },
      { names: ['annecy'], lat: 45.8992, lng: 6.1294 },
      { names: ['perpignan'], lat: 42.6886, lng: 2.8948 },
      { names: ['orléans', 'orleans'], lat: 47.9029, lng: 1.9039 },
      { names: ['metz'], lat: 49.1193, lng: 6.1757 },
      { names: ['besançon', 'besancon'], lat: 47.2380, lng: 6.0243 },
      { names: ['rouen'], lat: 49.4431, lng: 1.0993 },
      { names: ['mulhouse'], lat: 47.7508, lng: 7.3359 },
      { names: ['caen'], lat: 49.1829, lng: -0.3707 },
      { names: ['nancy'], lat: 48.6921, lng: 6.1844 }
    ];

    // Chercher une correspondance exacte ou partielle
    for (const city of cityCoordinates) {
      for (const name of city.names) {
        if (lowerCityName.includes(name) || name.includes(lowerCityName)) {
          return {
            latitude: city.lat,
            longitude: city.lng
          };
        }
      }
    }

    return null;
  }

  // Obtenir une ville publique à partir de coordonnées
  static async getPublicCityName(coordinates: LocationCoordinates): Promise<string> {
    try {
      const result = await this.reverseGeocode(coordinates);
      if (!result) {
        return 'Localisation non disponible';
      }

      // Toujours retourner la ville formatée (pas de confidentialité)
      return result.formatted;
    } catch (error) {
      console.error('Erreur lors de l\'obtention du nom de ville:', error);
      return 'Localisation non disponible';
    }
  }

  // Obtenir une localisation par défaut (Paris) en cas d'échec total
  static getDefaultLocation(): GeocodingResult {
    return {
      city: 'Paris',
      country: 'France',
      region: 'Île-de-France',
      formatted: 'Paris, France',
      precision: 'approximate'
    };
  }

  // Calculer la distance entre deux points (en kilomètres) - Formule de Haversine
  static calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Rayon de la Terre en kilomètres
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c;
    return Math.round(d * 100) / 100; // Arrondir à 2 décimales
  }

  private static deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  // Valider des coordonnées GPS
  static validateCoordinates(latitude: number, longitude: number): boolean {
    return (
      typeof latitude === 'number' &&
      typeof longitude === 'number' &&
      latitude >= -90 && latitude <= 90 &&
      longitude >= -180 && longitude <= 180 &&
      !isNaN(latitude) && !isNaN(longitude)
    );
  }

  // Nettoyer le cache (utile pour les tests ou la maintenance)
  static clearCache(): void {
    geocodingCache.clear();
    cacheTimestamps.clear();
  }

  // Obtenir les statistiques du cache
  static getCacheStats(): { size: number; validEntries: number } {
    let validEntries = 0;
    geocodingCache.forEach((_value, key) => {
      if (this.isCacheValid(key)) {
        validEntries++;
      }
    });
    return {
      size: geocodingCache.size,
      validEntries
    };
  }
}