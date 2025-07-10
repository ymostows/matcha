import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Navigation, Globe, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { profileApi } from '../../services/profileApi';

interface LocationPickerSimpleProps {
  initialLocation?: {
    latitude?: number;
    longitude?: number;
    city?: string;
  };
  onLocationChange: (location: { latitude: number | null; longitude: number | null; city: string }) => void;
  onSave?: () => void;
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
  onSave,
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

  // Fonction pour utiliser Paris par défaut
  const useParisDefault = () => {
    console.log('🌍 Utilisation de Paris par défaut');
    const newLoc = {
      latitude: 48.8566,
      longitude: 2.3522,
      city: 'Paris, France',
      method: 'manual' as const
    };
    setLocation(newLoc);
    setManualCity('Paris, France');
    setError(null);
  };

  // Détection GPS simplifiée
  const detectGPSLocation = () => {
    if (!navigator.geolocation) {
      console.log('❌ Géolocalisation non supportée');
      useParisDefault();
      return;
    }

    setIsDetecting('gps');
    setError(null);
    console.log('🌍 Tentative de géolocalisation GPS...');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          console.log('✅ Position GPS obtenue:', latitude, longitude);
          
          // Juste utiliser les coordonnées, sans géocodage compliqué
          setLocation({
            latitude,
            longitude,
            city: `Position GPS (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
            method: 'gps'
          });
          setManualCity(`Position GPS (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`);
          console.log('✅ Géolocalisation GPS réussie');
        } catch (error) {
          console.error('Erreur traitement GPS:', error);
          useParisDefault();
        }
        setIsDetecting(false);
      },
      (error) => {
        console.log('❌ Géolocalisation refusée ou échouée:', error.message);
        setIsDetecting(false);
        setError("Permission de géolocalisation refusée. Essayez une autre méthode ou entrez votre ville manuellement.");
      },
      {
        enableHighAccuracy: false, // Moins strict
        timeout: 5000, // Plus court
        maximumAge: 600000 // 10 minutes
      }
    );
  };

  // Détection par IP simplifiée
  const detectIPLocation = async () => {
    setIsDetecting('ip');
    setError(null);
    console.log('🌐 Tentative géolocalisation IP...');

    try {
      // Utiliser un service IP simple et fiable
      const response = await fetch('http://ip-api.com/json/');
      const data = await response.json();
      
      if (data.status === 'success' && data.lat && data.lon) {
        console.log('✅ Géolocalisation IP réussie:', data.city, data.country);
        setLocation({
          latitude: data.lat,
          longitude: data.lon,
          city: `${data.city}, ${data.country}`,
          method: 'ip'
        });
        setManualCity(`${data.city}, ${data.country}`);
      } else {
        throw new Error('Service IP failed');
      }
    } catch (error) {
      console.log('❌ Géolocalisation IP échouée, utilisation de Paris');
      useParisDefault();
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Détection GPS */}
        <Button onClick={detectGPSLocation} disabled={isDetecting !== false} size="lg" className="flex items-center justify-center gap-2">
          {isDetecting === 'gps' ? <Loader2 className="animate-spin" /> : <Navigation />}
          Position Précise (GPS)
        </Button>
        {/* Détection IP */}
        <Button onClick={detectIPLocation} disabled={isDetecting !== false} variant="outline" size="lg" className="flex items-center justify-center gap-2">
          {isDetecting === 'ip' ? <Loader2 className="animate-spin" /> : <Globe />}
          Position Approximative (IP)
        </Button>
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