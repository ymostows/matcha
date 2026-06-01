import React, { useState, useEffect, useRef } from 'react';
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
  const [mapZoom] = useState(6);
  // Ref pour éviter les rechargements multiples
  const hasLoadedRef = useRef(false);

  // Charger le profil utilisateur au montage du composant
  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        const profile = await profileApi.getMyProfile();
        setUserProfile(profile);
        
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

  // Charger les utilisateurs compatibles quand le profil est chargé
  // — une seule fois grâce au ref hasLoadedRef
  useEffect(() => {
    if (userProfile && !hasLoadedRef.current) {
      hasLoadedRef.current = true;
      loadCompatibleUsersWithLocation(userProfile);
    }
  }, [userProfile]);

  // Charge les utilisateurs en respectant les préférences de genre/orientation
  const loadCompatibleUsersWithLocation = async (profile: CompleteProfile) => {
    if (isLoadingUsers) return;

    setIsLoadingUsers(true);
    try {
      // Utiliser les mêmes filtres que la page de browsing :
      // browseProfiles applique déjà les filtres de compatibilité côté serveur
      const users = await profileApi.browseProfiles({
        sortBy: 'fame_rating',
        sortOrder: 'desc',
        ageMin: 18,
        ageMax: 100,
        // Pas de limite de distance pour la carte
        maxDistance: 20000,
      });

      // Filtrer uniquement les utilisateurs qui ont des coordonnées valides
      const usersWithLocation = users.filter(user => {
        const lat = user.location_lat || user.latitude;
        const lng = user.location_lng || user.longitude;
        return lat && lng && lat !== 0 && lng !== 0;
      }) as ProfileWithDistance[];

      setNearbyUsers(usersWithLocation);

      // Centrer la carte intelligemment
      const userLat = profile.location_lat || profile.latitude;
      const userLng = profile.location_lng || profile.longitude;

      if (userLat && userLng) {
        setMapCenter({ lat: userLat, lng: userLng });
        setUserLocation({ lat: userLat, lng: userLng });
      } else if (usersWithLocation.length > 0) {
        const avgLat = usersWithLocation.reduce((sum, u) => sum + (u.location_lat || u.latitude || 0), 0) / usersWithLocation.length;
        const avgLng = usersWithLocation.reduce((sum, u) => sum + (u.location_lng || u.longitude || 0), 0) / usersWithLocation.length;
        if (avgLat && avgLng) {
          setMapCenter({ lat: avgLat, lng: avgLng });
        }
      }
    } catch (error) {
      // Erreur silencieuse
    } finally {
      setIsLoadingUsers(false);
    }
  };

  // Bouton "Actualiser la carte" : récupère la position GPS puis recharge
  const getUserLocation = () => {
    if (isGettingLocation) return;

    setIsGettingLocation(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;

          setUserLocation({ lat: latitude, lng: longitude });
          setMapCenter({ lat: latitude, lng: longitude });

          try {
            await profileApi.updateLocation(latitude, longitude);

            // Mettre à jour l'état local du profil
            setUserProfile(prev => prev ? {
              ...prev,
              latitude,
              longitude,
              location_lat: latitude,
              location_lng: longitude
            } : null);

            // Recharger les utilisateurs avec la nouvelle position
            if (userProfile) {
              const updatedProfile = {
                ...userProfile,
                latitude,
                longitude,
                location_lat: latitude,
                location_lng: longitude
              };
              hasLoadedRef.current = false; // Permettre un rechargement
              await loadCompatibleUsersWithLocation(updatedProfile);
            }
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
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    } else {
      alert('Géolocalisation non supportée par ce navigateur');
      setIsGettingLocation(false);
    }
  };

  // Créer des icônes personnalisées pour les markers
  const createCustomIcon = (imageUrl: string, isCurrentUser: boolean = false) => {
    const size = isCurrentUser ? 40 : 30;
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
              {((userProfile?.location_lat || userProfile?.latitude) && (userProfile?.location_lng || userProfile?.longitude)) && (
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow-sm">
                  <div className="w-full h-full bg-green-400 rounded-full animate-pulse"></div>
                </div>
              )}
            </div>
            Carte des utilisateurs
          </h1>
          <p className="text-twilight/60">
            {userProfile?.city
              ? `Profils compatibles autour de ${userProfile.city}`
              : 'Découvrez les profils compatibles sur la carte interactive'}
          </p>
        </div>

        

        {/* Carte Leaflet */}
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

              {/* Markers des profils compatibles */}
              {nearbyUsers.map((user) => {
                const userLat = user.location_lat || user.latitude;
                const userLng = user.location_lng || user.longitude;

                if (!userLat || !userLng) return null;

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
                          className="mt-2 bg-primary text-white px-3 py-1 rounded text-sm hover:bg-primary/90 transition-colors"
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

        {/* Liste des utilisateurs compatibles */}
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
                Aucun profil compatible trouvé
              </h3>
              <p className="text-twilight/60 max-w-md mx-auto">
                Aucun profil compatible avec géolocalisation activée n'a été trouvé.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MapPage;