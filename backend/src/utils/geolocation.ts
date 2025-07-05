import https from 'https';
import http from 'http';

export interface LocationData {
  latitude: number;
  longitude: number;
  city: string;
  country: string;
  region?: string;
  accuracy?: string;
}

export class GeolocationService {
  
  // Fonction utilitaire pour faire une requête HTTP simple
  private static makeRequest(url: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const protocol = url.startsWith('https:') ? https : http;
      
      const req = protocol.get(url, {
        timeout: 5000,
        headers: {
          'User-Agent': 'Matcha-App/1.0'
        }
      }, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
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
  
  // Obtenir la localisation via l'adresse IP (service gratuit)
  static async getLocationByIP(ipAddress?: string): Promise<LocationData | null> {
    try {
      // Utiliser ipapi.co (service gratuit avec limite de requêtes)
      const url = ipAddress 
        ? `http://ipapi.co/${ipAddress}/json/`
        : 'http://ipapi.co/json/';
      
      const data = await this.makeRequest(url);
      
      if (data.error || !data.latitude || !data.longitude) {
        console.warn('Erreur géolocalisation IP:', data.error || 'Données manquantes');
        return null;
      }
      
      return {
        latitude: parseFloat(data.latitude),
        longitude: parseFloat(data.longitude),
        city: data.city || 'Ville inconnue',
        country: data.country_name || 'Pays inconnu',
        region: data.region,
        accuracy: 'city' // Précision au niveau de la ville
      };
      
    } catch (error) {
      console.error('Erreur lors de la géolocalisation par IP:', error);
      return null;
    }
  }
  
  // Service de géolocalisation de secours
  static async getLocationByIPFallback(ipAddress?: string): Promise<LocationData | null> {
    try {
      // Utiliser un autre service gratuit en fallback
      const url = ipAddress 
        ? `http://ip-api.com/json/${ipAddress}?fields=status,message,country,regionName,city,lat,lon`
        : 'http://ip-api.com/json/?fields=status,message,country,regionName,city,lat,lon';
      
      const data = await this.makeRequest(url);
      
      if (data.status !== 'success' || !data.lat || !data.lon) {
        console.warn('Erreur géolocalisation IP fallback:', data.message || 'Données manquantes');
        return null;
      }
      
      return {
        latitude: data.lat,
        longitude: data.lon,
        city: data.city || 'Ville inconnue',
        country: data.country || 'Pays inconnu',
        region: data.regionName,
        accuracy: 'city'
      };
      
    } catch (error) {
      console.error('Erreur lors de la géolocalisation par IP (fallback):', error);
      return null;
    }
  }
  
  // Obtenir la localisation avec plusieurs tentatives
  static async getLocationWithFallback(ipAddress?: string): Promise<LocationData | null> {
    // Essayer le service principal
    let location = await this.getLocationByIP(ipAddress);
    
    if (!location) {
      // Essayer le service de secours
      location = await this.getLocationByIPFallback(ipAddress);
    }
    
    return location;
  }
  
  // Calculer la distance entre deux points (en kilomètres)
  static calculateDistance(
    lat1: number, lon1: number, 
    lat2: number, lon2: number
  ): number {
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
  
  // Obtenir une localisation par défaut (Paris) en cas d'échec total
  static getDefaultLocation(): LocationData {
    return {
      latitude: 48.8566,
      longitude: 2.3522,
      city: 'Paris',
      country: 'France',
      region: 'Île-de-France',
      accuracy: 'default'
    };
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
} 