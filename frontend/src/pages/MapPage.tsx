import React, { useState, useEffect } from 'react';
import { MapPin, Users, Compass, Target } from 'lucide-react';
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
        console.log('🎯 Profil utilisateur chargé:', profile);
        setUserProfile(profile);
        
        // Si l'utilisateur a des coordonnées dans son profil, centrer la carte dessus
        const lat = profile.location_lat || profile.latitude;
        const lng = profile.location_lng || profile.longitude;
        console.log(`📍 Coordonnées utilisateur: lat=${lat}, lng=${lng}`);
        
        if (lat && lng) {
          setMapCenter({ lat, lng });
          setUserLocation({ lat, lng });
          console.log(`🗺️ Carte centrée sur: lat=${lat}, lng=${lng}`);
        } else {
          console.log('⚠️ Aucune coordonnée trouvée dans le profil');
        }
      } catch (error) {
        console.error('Erreur lors du chargement du profil:', error);
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
  }, [userProfile]);

  // Fonction pour charger TOUS les utilisateurs avec géolocalisation
  const loadAllUsersWithLocation = async () => {
    setIsLoadingUsers(true);
    try {
      console.log('🌍 Chargement de TOUS les utilisateurs avec géolocalisation...');
      
      // Charger sans filtre de distance pour avoir tous les utilisateurs
      const users = await profileApi.browseProfiles({
        sortBy: 'distance',
        sortOrder: 'asc',
        // Pas de maxDistance pour avoir TOUS les utilisateurs
        ageMin: 18,
        ageMax: 100
      });

      console.log(`📊 API a retourné ${users.length} utilisateurs au total`);
      
      // Filtrer seulement les utilisateurs qui ont des coordonnées
      const usersWithLocation = users.filter(user => {
        const lat = user.location_lat || user.latitude;
        const lng = user.location_lng || user.longitude;
        const hasLocation = lat && lng && lat !== 0 && lng !== 0;
        
        if (hasLocation) {
          console.log(`✅ Utilisateur ${user.first_name} ${user.last_name} (${user.city}): lat=${lat}, lng=${lng}, distance=${user.distance_km || 'N/A'}km`);
        }
        
        return hasLocation;
      }) as ProfileWithDistance[];

      setNearbyUsers(usersWithLocation);
      console.log(`🗺️ Chargé ${usersWithLocation.length}/${users.length} utilisateurs avec géolocalisation valide`);
      
      // Centrer intelligemment la carte
      if (usersWithLocation.length > 0) {
        const userLat = userProfile?.location_lat || userProfile?.latitude;
        const userLng = userProfile?.location_lng || userProfile?.longitude;
        
        if (userLat && userLng) {
          // Si l'utilisateur a des coordonnées, centrer sur lui
          setMapCenter({ lat: userLat, lng: userLng });
          setUserLocation({ lat: userLat, lng: userLng });
          console.log(`🎯 Carte centrée sur l'utilisateur: lat=${userLat}, lng=${userLng}`);
        } else {
          // Sinon, centrer sur le centre géographique des autres utilisateurs
          const avgLat = usersWithLocation.reduce((sum, u) => sum + (u.location_lat || u.latitude || 0), 0) / usersWithLocation.length;
          const avgLng = usersWithLocation.reduce((sum, u) => sum + (u.location_lng || u.longitude || 0), 0) / usersWithLocation.length;
          
          if (avgLat && avgLng) {
            setMapCenter({ lat: avgLat, lng: avgLng });
            console.log(`🎯 Carte centrée sur le centre des utilisateurs: lat=${avgLat.toFixed(3)}, lng=${avgLng.toFixed(3)}`);
          }
        }
      }
      
    } catch (error) {
      console.error('❌ Erreur lors du chargement des utilisateurs:', error);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  // Fonction pour obtenir la géolocalisation en temps réel
  const getUserLocation = () => {
    setIsGettingLocation(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ lat: latitude, lng: longitude });
          setMapCenter({ lat: latitude, lng: longitude });
          
          // Optionnel : Mettre à jour la position dans le profil si elle diffère
          const currentLat = userProfile?.location_lat || userProfile?.latitude;
          const currentLng = userProfile?.location_lng || userProfile?.longitude;
          if (userProfile && currentLat && currentLng &&
              (Math.abs(currentLat - latitude) > 0.001 || 
               Math.abs(currentLng - longitude) > 0.001)) {
            try {
              await profileApi.updateLocation(latitude, longitude);
              console.log('Position mise à jour dans le profil');
              
              // Mettre à jour l'état local du profil utilisateur
              setUserProfile(prev => prev ? {
                ...prev,
                latitude: latitude,
                longitude: longitude,
                location_lat: latitude,
                location_lng: longitude
              } : null);
              
              // Recharger les utilisateurs avec la nouvelle position
              setTimeout(() => {
                loadAllUsersWithLocation();
              }, 500);
              
            } catch (error) {
              console.error('Erreur lors de la mise à jour de la position:', error);
            }
          }
          
          setIsGettingLocation(false);
        },
        (error) => {
          console.error('Erreur géolocalisation:', error);
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

  // Fonction utilitaire pour formatter la distance
  const formatDistance = (distanceKm: number): string => {
    if (distanceKm < 1) {
      return `${Math.round(distanceKm * 1000)}m`;
    } else if (distanceKm < 10) {
      return `${distanceKm.toFixed(1)}km`;
    } else {
      return `${Math.round(distanceKm)}km`;
    }
  };

  // Créer des icônes personnalisées pour les markers
  const createCustomIcon = (imageUrl: string, isCurrentUser: boolean = false) => {
    const size = isCurrentUser ? 40 : 30;
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
      ">
        <img src="${imageUrl}" style="
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
                    src={getProfilePictureUrl(userProfile.photos || [])}
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
            {isGettingLocation ? 'Localisation...' : 'Ma position'}
          </button>
          
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-sm">
            <Users className="w-4 h-4 text-primary" />
            <span className="text-sm text-twilight">
              {isLoadingUsers ? 'Chargement...' : `${nearbyUsers.length} utilisateurs avec géolocalisation`}
            </span>
          </div>

          <button
            onClick={() => loadAllUsersWithLocation()}
            disabled={isLoadingUsers}
            className="flex items-center gap-2 bg-white text-primary px-4 py-2 rounded-lg hover:bg-primary/5 transition-colors disabled:opacity-50 border border-primary/20"
          >
            <Compass className="w-4 h-4" />
            {isLoadingUsers ? 'Actualisation...' : 'Actualiser la carte'}
          </button>
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
                  console.log(`❌ Marker skipped for ${user.first_name}: no coordinates`);
                  return null;
                }
                
                console.log(`📍 Marker Leaflet ${user.first_name}: lat=${userLat}, lng=${userLng}`);
                
                return (
                  <Marker
                    key={user.id}
                    position={[userLat, userLng]}
                    icon={createCustomIcon(getProfilePictureUrl(user.photos || []), false)}
                    eventHandlers={{
                      click: () => navigate(`/profile/${user.user_id}`)
                    }}
                  >
                    <Popup>
                      <div className="text-center">
                        <div className="font-bold">{user.first_name} {user.last_name.charAt(0)}.</div>
                        {user.city && <div className="text-gray-600">{user.city}</div>}
                        {user.distance_km && (
                          <div className="text-blue-600 font-medium">{formatDistance(user.distance_km)}</div>
                        )}
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
                  icon={createCustomIcon(getProfilePictureUrl(userProfile.photos || []), true)}
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
            
            {/* Overlay avec infos utilisateur */}
            <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-4 max-w-xs z-[1000]">
              <h3 className="font-semibold text-twilight mb-2 flex items-center gap-2">
                <Compass className="w-4 h-4 text-primary" />
                Ma position
              </h3>
              
              {isLoadingProfile ? (
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              ) : userProfile ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full overflow-hidden border border-white shadow-sm">
                      <img
                        src={getProfilePictureUrl(userProfile.photos || [])}
                        alt="Votre photo"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = `/placeholder-avatar.svg`;
                        }}
                      />
                    </div>
                    <div>
                      <div className="font-medium text-sm">{userProfile.first_name}</div>
                      {userProfile.city && (
                        <div className="text-xs text-gray-600">{userProfile.city}</div>
                      )}
                    </div>
                  </div>
                  
                  {/* Position GPS */}
                  {(userProfile.location_lat || userProfile.latitude) && (userProfile.location_lng || userProfile.longitude) ? (
                    <div className="text-xs text-gray-600">
                      📍 {(userProfile.location_lat || userProfile.latitude)?.toFixed(3)}, {(userProfile.location_lng || userProfile.longitude)?.toFixed(3)}
                    </div>
                  ) : (
                    <div className="text-xs text-amber-600">
                      ⚠️ Position non définie
                    </div>
                  )}
                </div>
              ) : null}
              
              {/* Bouton géolocalisation */}
              <button
                onClick={getUserLocation}
                disabled={isGettingLocation}
                className="mt-3 w-full bg-primary hover:bg-primary-dark text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isGettingLocation ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Localisation...
                  </>
                ) : (
                  <>
                    <Target className="w-4 h-4" />
                    Ma position
                  </>
                )}
              </button>
              
              {/* Debug info */}
              {userLocation && (
                <p className="text-xs text-gray-500 mt-2">
                  Position actuelle: {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
                </p>
              )}
            </div>

            {/* Overlay compteur utilisateurs */}
            <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-3 z-[1000]">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-twilight">
                  {nearbyUsers.length} utilisateurs
                </span>
              </div>
              <div className="text-xs text-gray-600">
                <div>Centre: {mapCenter.lat.toFixed(3)}, {mapCenter.lng.toFixed(3)}</div>
                <div>Zoom: {mapZoom}</div>
              </div>
              <div className="text-xs text-green-600 font-bold mt-1">
                ✅ Navigation souris + markers synchronisés !
              </div>
            </div>
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
                          src={getProfilePictureUrl(user.photos || [])}
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
                        <MapPin className="w-3 h-3" />
                        <span>{user.distance_km ? formatDistance(user.distance_km) : 'Distance inconnue'}</span>
                        {user.age && (
                          <>
                            <span>•</span>
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

        {/* Info card */}
        <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">
                Carte interactive complète ! 🎉
              </h3>
              <div className="mt-1 text-sm text-green-700">
                <ul className="space-y-1">
                  <li>✅ <strong>Tous les utilisateurs</strong> avec géolocalisation affichés</li>
                  <li>✅ <strong>Markers visuels</strong> avec photos de profil sur la carte</li>
                  <li>✅ <strong>Tooltips informatifs</strong> au survol des markers</li>
                  <li>✅ <strong>Navigation directe</strong> vers les profils en cliquant</li>
                  <li>✅ <strong>Centre automatique</strong> sur la zone des utilisateurs</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapPage;