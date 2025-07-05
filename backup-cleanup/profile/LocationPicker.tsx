import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Navigation, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { profileApi } from '../../services/profileApi';

interface LocationData {
  latitude?: number;
  longitude?: number;
  city?: string;
  address?: string;
}

interface LocationPickerProps {
  initialLocation?: LocationData;
  onLocationChange: (location: LocationData) => void;
}

export const LocationPicker: React.FC<LocationPickerProps> = ({
  initialLocation,
  onLocationChange
}) => {
  const [location, setLocation] = useState<LocationData>(initialLocation || {});
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [manualCity, setManualCity] = useState(initialLocation?.city || '');

  // Géolocalisation automatique basée sur l'IP (alternative obligatoire)
  // On ne déclenche PAS automatiquement pour éviter d'interférer avec la demande GPS
  useEffect(() => {
    if (!location.latitude && !location.longitude && !initialLocation?.latitude) {
      // Délai pour permettre à l'utilisateur de voir les options d'abord
      const timer = setTimeout(() => {
        getIPLocation();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const getIPLocation = async () => {
    try {
      const response = await profileApi.getIPLocation();
      if (response && response.latitude && response.longitude) {
        const newLocation = {
          latitude: response.latitude,
          longitude: response.longitude,
          city: response.city || 'Ville détectée automatiquement',
          address: response.city || 'Position détectée par IP'
        };
        setLocation(newLocation);
        onLocationChange(newLocation);
      }
    } catch (error) {
      console.error('Erreur géolocalisation IP:', error);
      // Si l'IP ne fonctionne pas, position par défaut (Paris)
      const defaultLocation = {
        latitude: 48.8566,
        longitude: 2.3522,
        city: 'Paris (par défaut)',
        address: 'Position par défaut'
      };
      setLocation(defaultLocation);
      onLocationChange(defaultLocation);
    }
  };

  // Obtenir la position GPS simplifié
  const getCurrentLocation = async () => {
    if (!navigator.geolocation) {
      setLocationError('La géolocalisation n\'est pas supportée par votre navigateur');
      return;
    }

    setIsGettingLocation(true);
    setLocationError(null);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 300000 // 5 minutes
          }
        );
      });

      const { latitude, longitude } = position.coords;
      
      // Version simplifiée : juste garder les coordonnées
      const newLocation = {
        latitude,
        longitude,
        city: `Position GPS (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
        address: `Coordonnées : ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
      };
      
      setLocation(newLocation);
      onLocationChange(newLocation);
      
      // Sauvegarder sur le serveur (version simplifiée)
      try {
        await profileApi.updateLocation(latitude, longitude, newLocation.city);
        setLocationError(null);
      } catch (saveError) {
        setLocationError('Position détectée mais non sauvegardée. Veuillez réessayer.');
      }

    } catch (error: any) {
      console.error('Erreur géolocalisation:', error);
      
      if (error.code === 1) {
        setLocationError('Permission de géolocalisation refusée. Vous pouvez entrer votre ville manuellement.');
      } else if (error.code === 2) {
        setLocationError('Position non disponible. Vérifiez vos paramètres de localisation.');
      } else if (error.code === 3) {
        setLocationError('Délai d\'attente dépassé. Réessayez ou entrez votre ville manuellement.');
      } else {
        setLocationError('Erreur lors de la récupération de votre position.');
      }
    } finally {
      setIsGettingLocation(false);
    }
  };

  // Mise à jour manuelle de la ville
  const handleManualCityChange = (city: string) => {
    setManualCity(city);
    const newLocation = { 
      ...location, 
      city,
      address: city
    };
    setLocation(newLocation);
    onLocationChange(newLocation);
    setLocationError(null);
  };

  // Sauvegarder la ville manuelle
  const saveManualLocation = async () => {
    if (!manualCity.trim()) {
      setLocationError('Veuillez entrer une ville');
      return;
    }

    try {
      // Pour la ville manuelle, on utilise des coordonnées par défaut (Paris)
      const defaultCoords = { lat: 48.8566, lng: 2.3522 };
      await profileApi.updateLocation(defaultCoords.lat, defaultCoords.lng, manualCity.trim());
      
      const newLocation = {
        latitude: defaultCoords.lat,
        longitude: defaultCoords.lng,
        city: manualCity.trim(),
        address: manualCity.trim()
      };
      
      setLocation(newLocation);
      onLocationChange(newLocation);
      setLocationError(null);
    } catch (error) {
      setLocationError('Erreur lors de la sauvegarde de la ville');
    }
  };

  return (
    <div className="space-y-6">
      {/* Titre */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <MapPin className="w-5 h-5 text-primary" />
          </div>
          <h2 className="text-2xl font-semibold text-twilight">Localisation</h2>
        </div>
        <p className="text-twilight/60">Aidez-nous à vous proposer des rencontres près de chez vous</p>
      </div>

      {/* Erreur */}
      {locationError && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-yellow-50 border border-yellow-200 rounded-lg p-3"
        >
          <p className="text-yellow-700 text-sm">{locationError}</p>
        </motion.div>
      )}

      {/* Statut actuel */}
      {location.city && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-green-50 border border-green-200 rounded-xl"
        >
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <MapPin className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <h4 className="font-medium text-green-900">Position actuelle</h4>
              <p className="text-green-800 font-medium">{location.city}</p>
              {location.latitude && location.longitude && (
                <p className="text-xs text-green-600 mt-1">
                  Coordonnées : {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                </p>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Boutons de géolocalisation */}
      <div className="text-center space-y-4">
        <Button
          type="button"
          onClick={getCurrentLocation}
          disabled={isGettingLocation}
          className="flex items-center gap-2 bg-gradient-to-r from-primary to-accent hover:shadow-lg transition-all duration-200"
          size="lg"
        >
          {isGettingLocation ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Localisation en cours...
            </>
          ) : (
            <>
              <Navigation className="w-4 h-4" />
              Utiliser ma position GPS (précis)
            </>
          )}
        </Button>
        
        <div className="text-center">
          <p className="text-gray-500 text-sm">
            Votre navigateur vous demandera l'autorisation d'accès à votre position
          </p>
          <Button
            type="button"
            variant="ghost"
            onClick={getIPLocation}
            className="text-sm mt-2"
          >
            Ou détecter automatiquement ma région
          </Button>
        </div>
      </div>

      {/* Séparateur */}
      <div className="flex items-center gap-4">
        <div className="flex-1 border-t border-gray-200"></div>
        <span className="text-gray-500 text-sm">ou</span>
        <div className="flex-1 border-t border-gray-200"></div>
      </div>

      {/* Saisie manuelle */}
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-twilight mb-2 block">
            Indiquez votre ville manuellement
          </label>
          <div className="flex gap-2">
            <Input
              value={manualCity}
              onChange={(e) => handleManualCityChange(e.target.value)}
              placeholder="Paris, Lyon, Marseille..."
              className="flex-1"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  saveManualLocation();
                }
              }}
            />
            <Button 
              onClick={saveManualLocation}
              variant="outline"
              disabled={!manualCity.trim()}
            >
              Valider
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Exemple : Paris, France • Lyon, France • Londres, UK
          </p>
        </div>
      </div>

      {/* Conseils */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h4 className="font-semibold text-blue-800 mb-2">💡 Pourquoi cette information ?</h4>
        <ul className="text-blue-700 text-sm space-y-1">
          <li>• Proposer des rencontres près de chez vous</li>
          <li>• Calculer les distances avec précision</li>
          <li>• Améliorer la pertinence des suggestions</li>
          <li>• Cette information reste privée et sécurisée</li>
        </ul>
      </div>
    </div>
  );
}; 