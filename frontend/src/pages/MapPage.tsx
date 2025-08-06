import React, { useState, useEffect } from 'react';
import { MapPin, Target, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { profileApi, CompleteProfile } from '../services/profileApi';
import { getProfilePictureUrl } from '../utils/imageUtils';

// Fix pour les icônes par défaut de Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Type alias pour les profils avec distance (maintenant inclus dans CompleteProfile)
type ProfileWithDistance = CompleteProfile;

const MapPage: React.FC = () => {
  const navigate = useNavigate();
  const [userLocation, setUserLocation] = useState<{lat: number; lng: number} | null>(null);
  const [mapCenter, setMapCenter] = useState({ lat: 48.8566, lng: 2.3522 }); // Paris par défaut
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [userProfile, setUserProfile] = useState<CompleteProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [nearbyUsers, setNearbyUsers] = useState<ProfileWithDistance[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [mapZoom] = useState(6); // Niveau de zoom Leaflet

  // Charger le profil utilisateur au montage du composant
  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        const profile = await profileApi.getMyProfile();
        setUserProfile(profile);
        
        // Si l'utilisateur a des coordonnées dans son profil, centrer la carte dessus
        const lat = profile.location_lat || profile.latitude;
        const lng = profile.location_lng || profile.longitude;
        
        if (lat && lng) {
          setMapCenter({ lat, lng });
          setUserLocation({ lat, lng });
        }
      } catch (error) {
        // Erreur silencieuse
      } finally {
        setIsLoadingProfile(false);
      }
    };

    loadUserProfile();
  }, []);

  // Charger TOUS les utilisateurs avec géolocalisation quand le profil est chargé
  useEffect(() => {
    if (userProfile) {
      loadAllUsersWithLocation();
    }
  }, [userProfile]); // Retirer userLocation pour éviter les boucles infinies

  // Fonction pour charger TOUS les utilisateurs avec géolocalisation
  const loadAllUsersWithLocation = async () => {
    // Éviter les rechargements multiples simultanés
    if (isLoadingUsers) {
      return;
    }
    
    setIsLoadingUsers(true);
    try {
      
      // Charger tous les utilisateurs
      const users = await profileApi.browseProfiles({
        sortBy: 'fame_rating',
        sortOrder: 'desc',
        ageMin: 18,
        ageMax: 100
      });

      // Filtrer seulement les utilisateurs qui ont des coordonnées
      const usersWithLocation = users.filter(user => {
        const lat = user.location_lat || user.latitude;
        const lng = user.location_lng || user.longitude;
        return lat && lng && lat !== 0 && lng !== 0;
      }) as ProfileWithDistance[];

      setNearbyUsers(usersWithLocation);
      
      // Centrer intelligemment la carte
      if (usersWithLocation.length > 0) {
        const userLat = userProfile?.location_lat || userProfile?.latitude;
        const userLng = userProfile?.location_lng || userProfile?.longitude;
        
        if (userLat && userLng) {
          // Si l'utilisateur a des coordonnées, centrer sur lui
          setMapCenter({ lat: userLat, lng: userLng });
          setUserLocation({ lat: userLat, lng: userLng });
        } else {
          // Sinon, centrer sur le centre géographique des autres utilisateurs
          const avgLat = usersWithLocation.reduce((sum, u) => sum + (u.location_lat || u.latitude || 0), 0) / usersWithLocation.length;
          const avgLng = usersWithLocation.reduce((sum, u) => sum + (u.location_lng || u.longitude || 0), 0) / usersWithLocation.length;
          
          if (avgLat && avgLng) {
            setMapCenter({ lat: avgLat, lng: avgLng });
          }
        }
      }
      
    } catch (error) {
      // Erreur silencieuse
    } finally {
      // Petite pause pour éviter les rechargements trop rapides
      setTimeout(() => {
        setIsLoadingUsers(false);
      }, 300);
    }
  };

  // Fonction pour obtenir la géolocalisation en temps réel
  const getUserLocation = () => {
    // Éviter les clics multiples
    if (isGettingLocation) {
      return;
    }
    
    setIsGettingLocation(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          
          setUserLocation({ lat: latitude, lng: longitude });
          setMapCenter({ lat: latitude, lng: longitude });
          
          // Mettre à jour la position dans le profil
          try {
            await profileApi.updateLocation(latitude, longitude);
            
            // Mettre à jour l'état local du profil utilisateur
            setUserProfile(prev => prev ? {
              ...prev,
              latitude: latitude,
              longitude: longitude,
              location_lat: latitude,
              location_lng: longitude
            } : null);
            
            // Attendre un peu puis recharger
            setTimeout(() => {
              loadAllUsersWithLocation();
            }, 1000);
            
          } catch (error) {
            // Erreur silencieuse
          }
          
          setIsGettingLocation(false);
        },
        (error) => {
          let errorMessage = 'Erreur de géolocalisation';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Permission de géolocalisation refusée';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Position indisponible';
              break;
            case error.TIMEOUT:
              errorMessage = 'Timeout de géolocalisation';
              break;
          }
          alert(errorMessage);
          setIsGettingLocation(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    } else {
      alert('Géolocalisation non supportée par ce navigateur');
      setIsGettingLocation(false);
    }
  };



  // Créer des icônes personnalisées pour les markers
  const createCustomIcon = (imageUrl: string, isCurrentUser: boolean = false) => {
    const size = isCurrentUser ? 40 : 30;
    
    // Si l'URL est un data URI (image générée), l'utiliser directement
    const finalImageUrl = imageUrl.startsWith('data:') ? imageUrl : imageUrl;
    
    const iconHtml = `
      <div style="
        width: ${size}px; 
        height: ${size}px; 
        border-radius: 50%; 
        border: 3px solid ${isCurrentUser ? '#ef4444' : '#3b82f6'}; 
        overflow: hidden;
        background: white;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      ">
        <img src="${finalImageUrl}" style="
          width: 100%; 
          height: 100%; 
          object-fit: cover;
        " onerror="this.src='/placeholder-avatar.svg'" />
      </div>
    `;
    
    return L.divIcon({
      html: iconHtml,
      className: 'custom-marker',
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-25 to-rose-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header de la page */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-twilight mb-2 flex items-center gap-3">
            {/* Bulle avec photo de profil au lieu de l'icône MapPin */}
            <div className="relative">
              {isLoadingProfile ? (
                <div className="w-12 h-12 bg-gradient-to-r from-primary to-accent rounded-full animate-pulse"></div>
              ) : userProfile ? (
                <div className="w-12 h-12 rounded-full overflow-hidden border-3 border-white shadow-lg ring-2 ring-primary/20">
                  <img
                    src={getProfilePictureUrl(userProfile.photos || [], 'http://localhost:3001', {
                      first_name: userProfile.first_name,
                      last_name: userProfile.last_name,
                      gender: userProfile.gender
                    })}
                    alt={`${userProfile.first_name} ${userProfile.last_name}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = `/placeholder-avatar.svg`;
                    }}
                  />
                </div>
              ) : (
                <div className="w-12 h-12 bg-gradient-to-r from-primary to-accent rounded-full flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-white" />
                </div>
              )}
              {/* Indicator de position si l'utilisateur a des coordonnées */}
              {((userProfile?.location_lat || userProfile?.latitude) && (userProfile?.location_lng || userProfile?.longitude)) && (
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow-sm">
                  <div className="w-full h-full bg-green-400 rounded-full animate-pulse"></div>
                </div>
              )}
            </div>
            Carte des utilisateurs
          </h1>
          <p className="text-twilight/60">
            {userProfile?.city ? 
              `Découvrez les utilisateurs autour de ${userProfile.city}` :
              'Découvrez les utilisateurs autour de vous sur la carte interactive'
            }
          </p>
        </div>

        {/* Boutons de contrôle */}
        <div className="mb-6 flex flex-wrap gap-3">
          <button
            onClick={getUserLocation}
            disabled={isGettingLocation}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Target className="w-4 h-4" />
            {isGettingLocation ? 'Localisation...' : 'Actualiser la carte'}
          </button>
          
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-sm">
            <Users className="w-4 h-4 text-primary" />
            <span className="text-sm text-twilight">
              {isLoadingUsers ? 'Chargement...' : `${nearbyUsers.length} utilisateurs avec géolocalisation`}
            </span>
          </div>

          
        </div>

        {/* Carte Leaflet avec markers géolocalisés */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="h-[600px] w-full relative">
            <MapContainer
              center={[mapCenter.lat, mapCenter.lng]}
              zoom={mapZoom}
              style={{ height: '100%', width: '100%' }}
              className="z-0"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              {/* Markers des autres utilisateurs */}
                            {nearbyUsers.map((user) => {
                const userLat = user.location_lat || user.latitude;
                const userLng = user.location_lng || user.longitude;

                if (!userLat || !userLng) {
                  return null;
                }
                
                return (
                  <Marker
                    key={user.id}
                    position={[userLat, userLng]}
                    icon={createCustomIcon(getProfilePictureUrl(user.photos || [], 'http://localhost:3001', {
                      first_name: user.first_name,
                      last_name: user.last_name,
                      gender: user.gender
                    }), false)}
                    eventHandlers={{
                      click: () => navigate(`/profile/${user.user_id}`)
                    }}
                  >
                    <Popup>
                      <div className="text-center">
                        <div className="font-bold">{user.first_name} {user.last_name.charAt(0)}.</div>
                        {user.city && <div className="text-gray-600">{user.city}</div>}
                        {user.age && <div className="text-gray-500">{user.age} ans</div>}
                        <button
                          onClick={() => navigate(`/profile/${user.user_id}`)}
                          className="mt-2 bg-primary text-white px-3 py-1 rounded text-sm hover:bg-primary-dark transition-colors"
                        >
                          Voir le profil
                        </button>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
              
              {/* Marker de l'utilisateur connecté */}
              {userLocation && userProfile && (userProfile.location_lat || userProfile.latitude) && (userProfile.location_lng || userProfile.longitude) && (
                <Marker
                  position={[
                    userProfile.location_lat || userProfile.latitude!,
                    userProfile.location_lng || userProfile.longitude!
                  ]}
                  icon={createCustomIcon(getProfilePictureUrl(userProfile.photos || [], 'http://localhost:3001', {
                    first_name: userProfile.first_name,
                    last_name: userProfile.last_name,
                    gender: userProfile.gender
                  }), true)}
                >
                  <Popup>
                    <div className="text-center">
                      <div className="font-bold text-red-600">VOUS</div>
                      <div>{userProfile.first_name}</div>
                      {userProfile.city && <div className="text-gray-600">{userProfile.city}</div>}
                    </div>
                  </Popup>
                </Marker>
              )}
            </MapContainer>
          </div>
        </div>

        {/* Liste des utilisateurs proches */}
        <div className="mt-6">
          {isLoadingUsers ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg shadow-sm border p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gray-200 rounded-full animate-pulse"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded mb-2 animate-pulse"></div>
                      <div className="h-3 bg-gray-200 rounded w-2/3 animate-pulse"></div>
                    </div>
                  </div>
                  <div className="mt-3 h-8 bg-gray-200 rounded animate-pulse"></div>
                </div>
              ))}
            </div>
          ) : nearbyUsers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {nearbyUsers.map((user) => (
                <div key={user.id} className="bg-white rounded-lg shadow-sm border p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-sm">
                        <img
                          src={getProfilePictureUrl(user.photos || [], 'http://localhost:3001', {
                            first_name: user.first_name,
                            last_name: user.last_name,
                            gender: user.gender
                          })}
                          alt={`${user.first_name} ${user.last_name}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = `/placeholder-avatar.svg`;
                          }}
                        />
                      </div>
                      {/* Badge en ligne */}
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-twilight">
                        {user.first_name} {user.last_name.charAt(0)}.
                      </h4>
                      <div className="flex items-center gap-2 text-sm text-twilight/60">
                        {user.city && (
                          <>
                            <MapPin className="w-3 h-3" />
                            <span>{user.city}</span>
                          </>
                        )}
                        {user.age && (
                          <>
                            {user.city && <span>•</span>}
                            <span>{user.age} ans</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => navigate(`/profile/${user.user_id}`)}
                    className="w-full mt-3 bg-primary/10 text-primary py-2 px-3 rounded-lg text-sm hover:bg-primary/20 transition-colors"
                  >
                    Voir le profil
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-twilight mb-2">
                Aucun utilisateur trouvé
              </h3>
              <p className="text-twilight/60 max-w-md mx-auto">
                Aucun utilisateur avec géolocalisation activée trouvé dans la base de données.
              </p>
              <button
                onClick={() => loadAllUsersWithLocation()}
                className="mt-4 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
              >
                Charger les utilisateurs
              </button>
            </div>
          )}
        </div>


      </div>
    </div>
  );
};

export default MapPage;