import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Navigation, Globe, MapPinIcon, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { profileApi } from '../../services/profileApi';

interface LocationPickerSimpleProps {
  initialLocation?: {
    latitude?: number;
    longitude?: number;
    city?: string;
  };
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
  const [isDetecting, setIsDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fonction pour utiliser Paris par défaut
  const useParisDefault = () => {
    console.log('🌍 Utilisation de Paris par défaut');
    setLocation({
      latitude: 48.8566,
      longitude: 2.3522,
      city: 'Paris, France',
      method: 'manual'
    });
    setManualCity('Paris, France');
    setError(null);
  };

  // Exposer la fonction de sauvegarde
  useEffect(() => {
    (window as any).saveLocationPicker = async () => {
      if (location) {
        try {
          await profileApi.updateLocation(location.latitude, location.longitude, location.city);
          onSave?.();
          return true;
        } catch (error) {
          console.error('Erreur sauvegarde localisation:', error);
          return false;
        }
      } else if (manualCity.trim()) {
        // Sauvegarder juste la ville
        try {
          await profileApi.updateProfile({ city: manualCity.trim() });
          onSave?.();
          return true;
        } catch (error) {
          console.error('Erreur sauvegarde ville:', error);
          return false;
        }
      }
      onSave?.();
      return true;
    };
    return () => {
      delete (window as any).saveLocationPicker;
    };
  }, [location, manualCity, onSave]);

  // Détection GPS simplifiée
  const detectGPSLocation = () => {
    if (!navigator.geolocation) {
      console.log('❌ Géolocalisation non supportée');
      useParisDefault();
      return;
    }

    setIsDetecting(true);
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
        setError("Permission de géolocalisation refusée. Veuillez entrer votre ville manuellement ci-dessous.");
        // Ne pas forcer Paris par défaut, laisser l'utilisateur choisir
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
    setIsDetecting(true);
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

  const getMethodLabel = (method: string) => {
    switch (method) {
      case 'gps': return '📍 Position précise (GPS)';
      case 'ip': return '🌐 Position approximative (IP)';
      case 'manual': return '✏️ Position manuelle';
      default: return '📍 Position';
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

      {/* Message d'information */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <MapPin className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-900">Configurez votre position</h3>
            <p className="text-sm text-blue-700 mt-1">
              Position exacte (GPS) ou approximative (IP), ou saisissez votre ville manuellement.
            </p>
          </div>
        </div>
      </div>

      {/* Erreur */}
      {error && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-yellow-50 border border-yellow-200 rounded-lg p-4"
        >
          <p className="text-yellow-800">{error}</p>
        </motion.div>
      )}

      {/* Position actuelle détectée */}
      {location && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-green-50 border border-green-200 rounded-lg p-4"
        >
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <MapPinIcon className="w-4 h-4 text-green-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-green-900">Position détectée</h4>
              <p className="text-green-700 text-sm mt-1">
                {getMethodLabel(location.method)}
              </p>
              <p className="text-green-800 font-medium mt-1">
                📍 {location.city}
              </p>
              {location.method === 'gps' && (
                <p className="text-xs text-green-600 mt-1">
                  Coordonnées : {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                </p>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Boutons de détection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Button
          onClick={detectGPSLocation}
          disabled={isDetecting}
          variant="outline"
          className="flex items-center gap-2 h-auto py-4"
        >
          {isDetecting ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Navigation className="w-5 h-5" />
          )}
          <div className="text-left">
            <div className="font-medium">Position précise</div>
            <div className="text-xs text-gray-500">GPS de votre appareil</div>
          </div>
        </Button>

        <Button
          onClick={detectIPLocation}
          disabled={isDetecting}
          variant="outline"
          className="flex items-center gap-2 h-auto py-4"
        >
          {isDetecting ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Globe className="w-5 h-5" />
          )}
          <div className="text-left">
            <div className="font-medium">Position approximative</div>
            <div className="text-xs text-gray-500">Basée sur votre IP</div>
          </div>
        </Button>
      </div>

      {/* Saisie manuelle */}
      <div className="space-y-3">
        <h4 className="font-medium text-twilight flex items-center gap-2">
          <MapPin className="w-4 h-4" />
          Ou indiquez votre ville manuellement
        </h4>
        <Input
          value={manualCity}
          onChange={(e) => handleManualCity(e.target.value)}
          placeholder="Paris, France"
          className="text-center"
        />
        <p className="text-xs text-gray-500 text-center">
          Exemple : Paris, France • Lyon, France • Londres, UK
        </p>
      </div>

      {/* Résumé */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium text-twilight mb-2">Résumé de votre localisation :</h4>
        {location || manualCity ? (
          <div className="flex items-center gap-2 text-gray-700">
            <MapPin className="w-4 h-4" />
            <span>
              {location ? location.city : manualCity || 'Non définie'}
            </span>
          </div>
        ) : (
          <p className="text-gray-500 text-sm">
            Aucune localisation définie. Vous pouvez passer cette étape et la configurer plus tard.
          </p>
        )}
      </div>
    </div>
  );
}; 