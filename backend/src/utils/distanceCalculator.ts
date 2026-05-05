/**
 * Service centralisé pour le calcul de distances géographiques
 * Utilise la formule de Haversine pour calculer la distance entre deux points GPS
 */

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface LocationWithDistance {
  coordinates: Coordinates;
  distance_km: number | null;
}

export class DistanceCalculator {
  
  /**
   * Valide que les coordonnées GPS sont correctes
   */
  static validateCoordinates(latitude: number, longitude: number): boolean {
    return (
      typeof latitude === 'number' &&
      typeof longitude === 'number' &&
      !isNaN(latitude) && !isNaN(longitude) &&
      latitude >= -90 && latitude <= 90 &&
      longitude >= -180 && longitude <= 180 &&
      // Exclure les coordonnées exactement (0,0) qui sont souvent des données invalides
      !(latitude === 0 && longitude === 0)
    );
  }

  /**
   * Convertit les degrés en radians
   */
  private static degToRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Calcule la distance entre deux points GPS en utilisant la formule de Haversine
   * @param point1 Premier point (latitude, longitude)
   * @param point2 Deuxième point (latitude, longitude)
   * @returns Distance en kilomètres, arrondie à 2 décimales
   */
  static calculateDistance(point1: Coordinates, point2: Coordinates): number {
    // Validation des coordonnées
    if (!this.validateCoordinates(point1.latitude, point1.longitude)) {
      throw new Error(`Coordonnées invalides pour point1: ${point1.latitude}, ${point1.longitude}`);
    }
    if (!this.validateCoordinates(point2.latitude, point2.longitude)) {
      throw new Error(`Coordonnées invalides pour point2: ${point2.latitude}, ${point2.longitude}`);
    }

    const R = 6371; // Rayon de la Terre en kilomètres
    
    const lat1Rad = this.degToRad(point1.latitude);
    const lat2Rad = this.degToRad(point2.latitude);
    const deltaLatRad = this.degToRad(point2.latitude - point1.latitude);
    const deltaLngRad = this.degToRad(point2.longitude - point1.longitude);

    // Formule de Haversine
    const a = Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
              Math.cos(lat1Rad) * Math.cos(lat2Rad) *
              Math.sin(deltaLngRad / 2) * Math.sin(deltaLngRad / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    // Arrondir à 2 décimales
    return Math.round(distance * 100) / 100;
  }

  /**
   * Version SQL de la formule de Haversine pour utilisation dans les requêtes PostgreSQL
   * @param userLatParam Paramètre SQL pour la latitude de l'utilisateur ($1, $2, etc.)
   * @param userLngParam Paramètre SQL pour la longitude de l'utilisateur
   * @param targetLatColumn Nom de la colonne contenant la latitude cible
   * @param targetLngColumn Nom de la colonne contenant la longitude cible
   * @returns Fragment SQL pour calculer la distance
   */
  static getSQLDistanceFormula(
    userLatParam: string, 
    userLngParam: string,
    targetLatColumn: string = 'p.location_lat',
    targetLngColumn: string = 'p.location_lng'
  ): string {
    return `
      CASE 
        WHEN ${targetLatColumn} IS NOT NULL AND ${targetLngColumn} IS NOT NULL 
             AND ${userLatParam}::numeric IS NOT NULL AND ${userLngParam}::numeric IS NOT NULL
             AND ${targetLatColumn} != 0 AND ${targetLngColumn} != 0
             AND ${userLatParam}::numeric != 0 AND ${userLngParam}::numeric != 0
        THEN 
          6371 * acos(
            LEAST(1.0, 
              cos(radians(${userLatParam}::numeric)) * cos(radians(${targetLatColumn})) * 
              cos(radians(${targetLngColumn}) - radians(${userLngParam}::numeric)) + 
              sin(radians(${userLatParam}::numeric)) * sin(radians(${targetLatColumn}))
            )
          )
        ELSE 999999
      END
    `;
  }

  /**
   * Filtre SQL pour limiter par distance maximale
   * @param userLatParam Paramètre SQL pour la latitude de l'utilisateur
   * @param userLngParam Paramètre SQL pour la longitude de l'utilisateur
   * @param maxDistanceParam Paramètre SQL pour la distance maximale
   * @param targetLatColumn Nom de la colonne contenant la latitude cible
   * @param targetLngColumn Nom de la colonne contenant la longitude cible
   * @returns Fragment SQL pour filtrer par distance
   */
  static getSQLDistanceFilter(
    userLatParam: string,
    userLngParam: string,
    maxDistanceParam: string,
    targetLatColumn: string = 'p.location_lat',
    targetLngColumn: string = 'p.location_lng'
  ): string {
    return `
      AND ${targetLatColumn} IS NOT NULL AND ${targetLngColumn} IS NOT NULL
      AND ${targetLatColumn} != 0 AND ${targetLngColumn} != 0
      AND (
        6371 * acos(
          LEAST(1.0,
            cos(radians(${userLatParam}::numeric)) * cos(radians(${targetLatColumn})) * 
            cos(radians(${targetLngColumn}) - radians(${userLngParam}::numeric)) + 
            sin(radians(${userLatParam}::numeric)) * sin(radians(${targetLatColumn}))
          )
        )
      ) <= ${maxDistanceParam}::numeric
    `;
  }

  /**
   * Calcule la distance pour plusieurs points depuis un point de référence
   * @param referencePoint Point de référence
   * @param points Liste des points à calculer
   * @returns Liste des points avec leur distance calculée
   */
  static calculateDistances(
    referencePoint: Coordinates, 
    points: (Coordinates & { [key: string]: any })[]
  ): (typeof points[0] & { distance_km: number | null })[] {
    return points.map(point => {
      let distance_km: number | null = null;
      
      try {
        if (this.validateCoordinates(point.latitude, point.longitude)) {
          distance_km = this.calculateDistance(referencePoint, point);
        }
      } catch (error) {
        distance_km = null;
      }

      return {
        ...point,
        distance_km
      };
    });
  }

  /**
   * Trouve le point le plus proche d'un point de référence
   * @param referencePoint Point de référence
   * @param points Liste des points à comparer
   * @returns Le point le plus proche avec sa distance, ou null si aucun point valide
   */
  static findClosestPoint<T extends Coordinates>(
    referencePoint: Coordinates,
    points: T[]
  ): (T & { distance_km: number }) | null {
    let closestPoint: T | null = null;
    let minDistance = Infinity;

    for (const point of points) {
      try {
        if (this.validateCoordinates(point.latitude, point.longitude)) {
          const distance = this.calculateDistance(referencePoint, point);
          if (distance < minDistance) {
            minDistance = distance;
            closestPoint = point;
          }
        }
      } catch (error) {
        // Ignorer les points avec des coordonnées invalides
        continue;
      }
    }

    return closestPoint ? { ...closestPoint, distance_km: minDistance } : null;
  }

  /**
   * Détermine si un point est dans un rayon donné
   * @param point1 Premier point
   * @param point2 Deuxième point
   * @param maxDistanceKm Distance maximale en kilomètres
   * @returns true si les points sont dans le rayon, false sinon
   */
  static isWithinRange(point1: Coordinates, point2: Coordinates, maxDistanceKm: number): boolean {
    try {
      const distance = this.calculateDistance(point1, point2);
      return distance <= maxDistanceKm;
    } catch (error) {
      return false;
    }
  }

  /**
   * Formatte une distance pour l'affichage
   */
  static formatDistance(distanceKm: number | null | undefined): string {
    if (distanceKm === null || distanceKm === undefined || isNaN(distanceKm)) {
      return 'Distance inconnue';
    }

    if (distanceKm < 1) {
      return '<1 km';
    } else if (distanceKm < 10) {
      return `${distanceKm.toFixed(1)} km`;
    } else {
      return `${Math.round(distanceKm)} km`;
    }
  }
}