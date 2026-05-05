import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Navigation, Globe, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import geolocationManager, { LocationData as GeoLocationData } from '../../utils/geolocationManager';
import storageManager from '../../utils/storageManager';

interface LocationPickerSimpleProps {
  initialLocation?: {
    latitude?: number;
    longitude?: number;
    city?: string;
    publicCity?: string;
  };
  onLocationChange: (location: { 
    latitude: number | null; 
    longitude: number | null; 
    city: string;
    publicCity?: string;
  }) => void;
  className?: string;
}

// Utiliser le type LocationData du geolocationManager
type LocationData = GeoLocationData;

export const LocationPickerSimple: React.FC<LocationPickerSimpleProps> = ({
  initialLocation,
  onLocationChange,
  className
}) => {
  const [location, setLocation] = useState<LocationData | null>(
    (initialLocation?.latitude && initialLocation?.longitude) ? {
      latitude: initialLocation.latitude,
      longitude: initialLocation.longitude,
      city: initialLocation.city || '',
      publicCity: initialLocation.publicCity,
      method: 'manual' as const,
      precision: 'medium' as const,
      accuracy: 'Localisation précédente',
      timestamp: Date.now()
    } : null
  );
  const [manualCity, setManualCity] = useState(initialLocation?.city || '');
  const [isDetecting, setIsDetecting] = useState<'gps' | 'ip' | false>(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('En attente de votre localisation...');

  useEffect(() => {
    if (location) {
      const displayCity = location.publicCity || location.city;
      setStatus(`Localisation définie : ${displayCity}`);
      onLocationChange({
        latitude: location.latitude,
        longitude: location.longitude,
        city: location.city,
        publicCity: location.publicCity
      });
    } else if (manualCity) {
      setStatus(`Localisation définie : ${manualCity}`);
      onLocationChange({ 
        latitude: null, 
        longitude: null, 
        city: manualCity
      });
    } else {
      setStatus('Choisissez une méthode pour définir votre localisation.');
    }
  }, [location, manualCity, onLocationChange]);

  // Plus de vérification automatique des permissions au chargement
  // L'utilisateur doit décider lui-même d'utiliser la géolocalisation


  // Détection GPS avec le nouveau GeolocationManager
  const detectGPSLocation = async () => {
    setIsDetecting('gps');
    setError(null);

    try {
      const gpsLocation = await geolocationManager.requestLocation({
        enableHighAccuracy: false,
        timeout: 15000,
        maximumAge: 300000,
        fallbackToIP: false // On gère le fallback manuellement
      });

      setLocation(gpsLocation);
      setManualCity(gpsLocation.city);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur de géolocalisation';
      setError(errorMessage);
    } finally {
      setIsDetecting(false);
    }
  };

  // Détection par IP avec le GeolocationManager
  const detectIPLocation = async () => {
    setIsDetecting('ip');
    setError(null);

    try {
      const ipLocation = await geolocationManager.requestLocation({
        fallbackToIP: true,
        defaultCity: 'Paris, France',
        defaultCoordinates: { lat: 48.8566, lng: 2.3522 }
      });

      // Forcer le type à IP même si c'est un fallback par défaut
      if (ipLocation.method === 'default') {
        ipLocation.method = 'ip';
        ipLocation.accuracy = 'Position par défaut (services IP indisponibles)';
      }

      setLocation(ipLocation);
      setManualCity(ipLocation.city);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur de géolocalisation IP';
      setError(errorMessage);
    } finally {
      setIsDetecting(false);
    }
  };

  // Saisie manuelle avec géolocalisation automatique
  const handleManualCity = async (city: string) => {
    setManualCity(city);
    setError(null);
    
    if (!city.trim()) {
      setLocation(null);
      return;
    }

    const cleanCity = city.trim();
    
    try {
      setStatus(`Recherche de la localisation de "${cleanCity}"...`);
      
      // Utiliser le GeolocationManager pour géocoder la ville
      const cityLocation = await geolocationManager.geocodeCity(cleanCity);
      
      if (cityLocation) {
        setLocation(cityLocation);
        setStatus(`Localisation trouvée : ${cityLocation.publicCity || cityLocation.city}`);
      } else {
        // Pas de coordonnées disponibles : on garde location=null et manualCity
        // Le useEffect enverra { latitude: null, longitude: null, city } sans (0,0)
        setLocation(null);
        setStatus(`Ville définie : ${cleanCity} (sans coordonnées GPS)`);
      }
    } catch (error) {
      console.warn('Erreur géolocalisation automatique:', error);
      setLocation(null);
      setStatus(`Ville définie : ${cleanCity} (sans coordonnées GPS)`);
    }
  };


  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header avec titre */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <MapPin className="w-5 h-5 text-primary" />
          </div>
          <h2 className="text-2xl font-semibold text-twilight">Localisation</h2>
        </div>
        <p className="text-twilight/60">Aidez-nous à vous proposer des rencontres près de chez vous</p>
      </div>

      {/* Affichage du statut actuel avec feedback de précision */}
      <div className="text-center p-4 bg-gray-50 rounded-lg border">
        <p className="font-medium text-gray-800 mb-2">{status}</p>
        {location && (
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2">
              <span className="text-sm text-gray-600 capitalize">Méthode : {location.method}</span>
              <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                location.precision === 'high' 
                  ? 'bg-green-100 text-green-800'
                  : location.precision === 'medium'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-orange-100 text-orange-800'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  location.precision === 'high' 
                    ? 'bg-green-500'
                    : location.precision === 'medium'
                    ? 'bg-yellow-500'
                    : 'bg-orange-500'
                }`} />
                {location.precision === 'high' ? 'Très précise' : 
                 location.precision === 'medium' ? 'Précise' : 'Approximative'}
              </div>
            </div>
            {location.accuracy && (
              <p className="text-xs text-gray-500">{location.accuracy}</p>
            )}
          </div>
        )}
      </div>

      
      {/* Erreur */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-center text-sm"
        >
          {error}
        </motion.div>
      )}

      {/* Boutons d'action */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Détection GPS */}
          <div className="space-y-2">
            <Button onClick={detectGPSLocation} disabled={isDetecting !== false} size="lg" className="w-full flex items-center justify-center gap-2">
              {isDetecting === 'gps' ? <Loader2 className="animate-spin" /> : <Navigation />}
              Position Précise (GPS)
            </Button>
            <div className="text-xs text-gray-500 text-center">
              💡 Recommandé pour une localisation précise
            </div>
          </div>
          
          {/* Détection IP */}
          <div className="space-y-2">
            <Button onClick={detectIPLocation} disabled={isDetecting !== false} variant="outline" size="lg" className="w-full flex items-center justify-center gap-2">
              {isDetecting === 'ip' ? <Loader2 className="animate-spin" /> : <Globe />}
              Position Approximative (IP)
            </Button>
            <div className="text-xs text-gray-500 text-center">
              🌍 Fonctionne toujours, moins précis
            </div>
          </div>
        </div>
        
        {/* Instructions d'aide pour GPS et navigation privée */}
        <div className="space-y-2">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
            <div className="font-medium mb-1">💡 Astuce :</div>
            <div className="text-xs">
              Si le GPS ne fonctionne pas, cliquez sur l'icône 🔒 dans la barre d'adresse pour autoriser la géolocalisation.
            </div>
          </div>
          
          {/* Alerte navigation privée si détectée */}
          {storageManager.isPrivateMode() && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm text-orange-800">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4 h-4" />
                <div className="font-medium">Mode navigation privée détecté</div>
              </div>
              <div className="text-xs">
                En mode privé, vous devrez autoriser la géolocalisation à chaque visite. 
                Les permissions ne sont pas conservées entre les sessions.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Séparateur */}
      <div className="flex items-center gap-4 py-2">
        <hr className="flex-grow" />
        <span className="text-gray-400 text-xs font-semibold">OU</span>
        <hr className="flex-grow" />
      </div>

      {/* Saisie manuelle */}
      <div className="space-y-3 text-center">
        <label htmlFor="manual-city" className="font-medium text-gray-700">Entrer une ville manuellement</label>
        <Input 
          id="manual-city"
          value={manualCity}
          onChange={(e) => handleManualCity(e.target.value)}
          placeholder="Ex: Lyon, France"
          className="text-center"
        />
      </div>
    </div>
  );
};