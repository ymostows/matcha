import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Navigation, Globe, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

interface LocationPickerSimpleProps {
  initialLocation?: {
    latitude?: number;
    longitude?: number;
    city?: string;
  };
  onLocationChange: (location: { latitude: number | null; longitude: number | null; city: string }) => void;
  className?: string;
}

interface LocationData {
  latitude: number;
  longitude: number;
  city: string;
  method: 'gps' | 'ip' | 'manual';
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
      method: 'manual'
    } : null
  );
  const [manualCity, setManualCity] = useState(initialLocation?.city || '');
  const [isDetecting, setIsDetecting] = useState<'gps' | 'ip' | false>(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('En attente de votre localisation...');

  useEffect(() => {
    if (location) {
      setStatus(`Localisation définie : ${location.city}`);
      onLocationChange(location);
    } else if (manualCity) {
      setStatus(`Localisation définie : ${manualCity}`);
      onLocationChange({ latitude: null, longitude: null, city: manualCity });
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
      (position) => {
        const { latitude, longitude } = position.coords;
        
        setLocation({
          latitude,
          longitude,
          city: `Position GPS (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
          method: 'gps'
        });
        setManualCity(`Position GPS (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`);
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
          setLocation({
            latitude: data.latitude,
            longitude: data.longitude,
            city: `${data.city}, ${data.country_name}`,
            method: 'ip'
          });
          setManualCity(`${data.city}, ${data.country_name}`);
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
          setLocation({
            latitude: data.lat,
            longitude: data.lon,
            city: `${data.city}, ${data.country}`,
            method: 'ip'
          });
          setManualCity(`${data.city}, ${data.country}`);
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
          setLocation({
            latitude: geoData.latitude,
            longitude: geoData.longitude,
            city: `${geoData.city}, ${geoData.country_name}`,
            method: 'ip'
          });
          setManualCity(`${geoData.city}, ${geoData.country_name}`);
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

  // Saisie manuelle
  const handleManualCity = (city: string) => {
    setManualCity(city);
    setLocation(null); // Reset coordinates
    setError(null);
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

      {/* Affichage du statut actuel */}
      <div className="text-center p-4 bg-gray-50 rounded-lg border">
        <p className="font-medium text-gray-800">{status}</p>
        {location && <p className="text-sm text-gray-500 capitalize">Méthode : {location.method}</p>}
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