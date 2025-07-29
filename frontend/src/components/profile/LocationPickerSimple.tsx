import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Navigation, Globe, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

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

interface LocationData {
  latitude: number;
  longitude: number;
  city: string;
  publicCity?: string;
  method: 'gps' | 'ip' | 'manual';
  precision: 'high' | 'medium' | 'low';
  accuracy?: string; // Description textuelle de la précision
}

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
      method: 'manual',
      precision: 'medium',
      accuracy: 'Localisation précédente'
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


  // Détection GPS simplifiée (basée sur le test qui fonctionne)
  const detectGPSLocation = () => {
    if (!navigator.geolocation) {
      setError("Votre navigateur ne supporte pas la géolocalisation.");
      return;
    }

    setIsDetecting('gps');
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        
        // Déterminer la précision basée sur l'accuracy GPS
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
        
        // Essayer de géocoder les coordonnées pour obtenir un nom de ville
        let cityName = `Position GPS (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;
        let publicCity = `Localisation précise`;
        
        try {
          // Utiliser l'API de géocodage inversé gratuite
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`);
          const data = await response.json();
          
          if (data.address) {
            const address = data.address;
            const city = address.city || address.town || address.village || address.municipality;
            const country = address.country;
            
            if (city && country) {
              cityName = `${city}, ${country}`;
              publicCity = `${city}, ${country}`;
            }
          }
        } catch (error) {
          console.warn('Géocodage GPS échoué:', error);
        }
        
        setLocation({
          latitude,
          longitude,
          city: cityName,
          publicCity,
          method: 'gps',
          precision,
          accuracy: accuracyDescription
        });
        setManualCity(cityName);
        setIsDetecting(false);
      },
      (error) => {
        setIsDetecting(false);
        
        if (error.code === 1) {
          setError("Permission refusée. Cliquez sur l'icône 🔒 dans la barre d'adresse pour autoriser la géolocalisation.");
        } else if (error.code === 2) {
          setError("Position indisponible. Vérifiez votre connexion.");
        } else if (error.code === 3) {
          setError("Délai d'attente dépassé. Réessayez.");
        } else {
          setError("Erreur de géolocalisation. Essayez une autre méthode.");
        }
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  // Détection par IP améliorée
  const detectIPLocation = async () => {
    setIsDetecting('ip');
    setError(null);

    try {
      // Essayer plusieurs services IP en fallback
      let data = null;
      
      // Service 1: ipapi.co (HTTPS)
      try {
        const response = await fetch('https://ipapi.co/json/');
        data = await response.json();
        if (data.latitude && data.longitude) {
          const cityName = `${data.city}, ${data.country_name}`;
          setLocation({
            latitude: data.latitude,
            longitude: data.longitude,
            city: cityName,
            publicCity: `Près de ${data.city}, ${data.country_name}`,
            method: 'ip',
            precision: 'low',
            accuracy: 'Basée sur votre adresse IP (~5-10km)'
          });
          setManualCity(cityName);
          setIsDetecting(false);
          return;
        }
      } catch {
        // Fallback au service 2
      }
      
      // Service 2: ip-api.com (HTTP, mais plus fiable)
      try {
        const response = await fetch('http://ip-api.com/json/');
        data = await response.json();
        if (data.status === 'success' && data.lat && data.lon) {
          const cityName = `${data.city}, ${data.country}`;
          setLocation({
            latitude: data.lat,
            longitude: data.lon,
            city: cityName,
            publicCity: `Près de ${data.city}, ${data.country}`,
            method: 'ip',
            precision: 'low',
            accuracy: 'Basée sur votre adresse IP (~5-10km)'
          });
          setManualCity(cityName);
          setIsDetecting(false);
          return;
        }
      } catch {
        // Fallback au service 3
      }
      
      // Service 3: ipify + ipapi fallback
      try {
        const ipResponse = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipResponse.json();
        const geoResponse = await fetch(`https://ipapi.co/${ipData.ip}/json/`);
        const geoData = await geoResponse.json();
        
        if (geoData.latitude && geoData.longitude) {
          const cityName = `${geoData.city}, ${geoData.country_name}`;
          setLocation({
            latitude: geoData.latitude,
            longitude: geoData.longitude,
            city: cityName,
            publicCity: `Près de ${geoData.city}, ${geoData.country_name}`,
            method: 'ip',
            precision: 'low',
            accuracy: 'Basée sur votre adresse IP (~5-10km)'
          });
          setManualCity(cityName);
          setIsDetecting(false);
          return;
        }
      } catch {
        // Tous les services ont échoué
      }
      
      throw new Error('Tous les services de géolocalisation IP ont échoué');
      
    } catch {
      setError("Impossible de déterminer votre position par IP. Utilisez le GPS ou saisissez votre ville manuellement.");
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
    
    // Essayer de géolocaliser automatiquement la ville saisie
    try {
      setStatus(`Recherche de la localisation de "${cleanCity}"...`);
      
      // Appeler notre API backend pour géolocaliser la ville
      const response = await fetch('/api/profile/geocode-city', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ cityName: cleanCity })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.coordinates) {
          // On a trouvé des coordonnées pour cette ville
          setLocation({
            latitude: data.coordinates.latitude,
            longitude: data.coordinates.longitude,
            city: cleanCity,
            publicCity: data.formattedName || cleanCity,
            method: 'manual',
            precision: data.precision || 'medium',
            accuracy: `Géolocalisée automatiquement`
          });
          setStatus(`Localisation trouvée : ${data.formattedName || cleanCity}`);
        } else {
          // Pas de coordonnées trouvées, utiliser seulement le nom
          setLocation({
            latitude: 0, // Valeurs temporaires
            longitude: 0,
            city: cleanCity,
            publicCity: cleanCity,
            method: 'manual',
            precision: 'low',
            accuracy: 'Saisie manuelle (géolocalisation échouée)'
          });
          setStatus(`Localisation définie : ${cleanCity} (sans coordonnées GPS)`);
        }
      } else {
        // Erreur API, utiliser seulement le nom
        setLocation({
          latitude: 0,
          longitude: 0,
          city: cleanCity,
          publicCity: cleanCity,
          method: 'manual',
          precision: 'low',
          accuracy: 'Saisie manuelle (pas de coordonnées GPS)'
        });
        setStatus(`Localisation définie : ${cleanCity}`);
      }
    } catch (error) {
      console.warn('Erreur géolocalisation automatique:', error);
      // En cas d'erreur, utiliser seulement le nom
      setLocation({
        latitude: 0,
        longitude: 0,
        city: cleanCity,
        publicCity: cleanCity,
        method: 'manual',
        precision: 'low',
        accuracy: 'Saisie manuelle (pas de coordonnées GPS)'
      });
      setStatus(`Localisation définie : ${cleanCity}`);
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
        
        {/* Instructions d'aide pour GPS */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
          <div className="font-medium mb-1">💡 Astuce :</div>
          <div className="text-xs">
            Si le GPS ne fonctionne pas, cliquez sur l'icône 🔒 dans la barre d'adresse pour autoriser la géolocalisation.
          </div>
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