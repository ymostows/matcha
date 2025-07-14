import api from './api';

export interface ProfileData {
  biography?: string;
  age?: number;
  gender?: 'homme' | 'femme';
  sexual_orientation?: 'hetero' | 'homo' | 'bi';
  interests?: string[];
  city?: string;
  latitude?: number;
  longitude?: number;
}

export interface CompleteProfile extends ProfileData {
  id: number;
  user_id: number;
  fame_rating: number;
  created_at: string;
  updated_at: string;
  photos?: Array<{
    id: number;
    filename: string;
    is_profile_picture: boolean;
    upload_date: string;
  }>;
  // Données utilisateur
  username: string;
  first_name: string;
  last_name: string;
  last_seen: string;
}

export interface LikeHistoryItem {
  id: number;
  liker_id: number;
  created_at: string;
  username: string;
  first_name: string;
  last_name: string;
  age?: number;
  city?: string;
}

export interface VisitHistoryItem {
  id: number;
  visitor_id: number;
  visited_at: string;
  username: string;
  first_name: string;
  last_name: string;
  age?: number;
  city?: string;
}

// Types de réponse API
interface ApiResponse<T> {
  success: boolean;
  message?: string;
  profile?: T;
  likes?: LikeHistoryItem[];
  visits?: VisitHistoryItem[];
  files?: string[];
  profiles?: CompleteProfile[];
}

// Interface pour les données utilisateur modifiables
export interface UserUpdateData {
  first_name: string;
  last_name: string;
  email: string;
}

// Interface pour les données de localisation
export interface LocationUpdateData {
  latitude: number;
  longitude: number;
  city?: string;
  address?: string;
}

export const profileApi = {
  // Obtenir le profil de l'utilisateur connecté
  async getMyProfile(): Promise<CompleteProfile> {
    const response = await api.get<ApiResponse<CompleteProfile>>('/profile');
    if (!response.profile) throw new Error('Profil non trouvé');
    return response.profile;
  },

  // Obtenir un profil public par ID
  async getProfile(userId: number): Promise<CompleteProfile> {
    const response = await api.get<ApiResponse<CompleteProfile>>(`/profile/${userId}`);
    if (!response.profile) throw new Error('Profil non trouvé');
    return response.profile;
  },

  // Créer ou mettre à jour le profil
  async updateProfile(profileData: ProfileData): Promise<CompleteProfile> {
    const response = await api.put<ApiResponse<CompleteProfile>>('/profile', profileData);
    if (!response.profile) throw new Error('Erreur lors de la mise à jour du profil');
    return response.profile;
  },

  // Mettre à jour la géolocalisation via la route de profil principale
  async updateLocation(latitude: number, longitude: number, city?: string): Promise<void> {
    await this.updateProfile({ city, latitude, longitude });
  },

  // Obtenir l'historique des likes reçus
  async getLikesHistory(limit: number = 20): Promise<LikeHistoryItem[]> {
    const response = await api.get<ApiResponse<LikeHistoryItem[]>>(`/profile/history/likes?limit=${limit}`);
    return response.likes || [];
  },

  // Obtenir l'historique des visites reçues
  async getVisitsHistory(limit: number = 20): Promise<VisitHistoryItem[]> {
    const response = await api.get<ApiResponse<VisitHistoryItem[]>>(`/profile/history/visits?limit=${limit}`);
    return response.visits || [];
  },

  // Rechercher des profils
  async searchProfiles(filters: {
    ageMin?: number;
    ageMax?: number;
    city?: string;
    interests?: string[];
    gender?: string;
    sexual_orientation?: string;
    limit?: number;
    offset?: number;
  }): Promise<CompleteProfile[]> {
    const params = new URLSearchParams();
    
    if (filters.ageMin !== undefined) params.append('ageMin', filters.ageMin.toString());
    if (filters.ageMax !== undefined) params.append('ageMax', filters.ageMax.toString());
    if (filters.city) params.append('city', filters.city);
    if (filters.interests?.length) params.append('interests', filters.interests.join(','));
    if (filters.gender) params.append('gender', filters.gender);
    if (filters.sexual_orientation) params.append('sexual_orientation', filters.sexual_orientation);
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.offset) params.append('offset', filters.offset.toString());

    const response = await api.get<ApiResponse<CompleteProfile[]>>(`/profile/search?${params.toString()}`);
    return response.profiles || [];
  },

  // Mettre à jour les informations utilisateur (nom, prénom, email)
  async updateUserInfo(userData: UserUpdateData): Promise<any> {
    const response = await api.put('/profile/user', userData);
    return response;
  },

  // Upload de photos de profil
  async uploadPhotos(files: File[]): Promise<any> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('photos', file);
    });
    // Ne PAS spécifier Content-Type manuellement - axios le génère automatiquement avec boundary
    const response = await api.post<ApiResponse<any>>('/photos', formData);
    if (!response.success) {
      throw new Error(response.message || 'Erreur lors de l\'upload des photos');
    }
    return response;
  },

  // Supprimer une photo
  async deletePhoto(photoId: number): Promise<any> {
    const response = await api.delete(`/photos/${photoId}`);
    return response;
  },

  // Définir comme photo de profil
  async setProfilePicture(photoId: number): Promise<any> {
    const response = await api.put(`/photos/${photoId}/profile-picture`);
    return response;
  },

  // Géolocalisation automatique basée sur l'IP
  async getIPLocation(): Promise<any> {
    try {
      const response = await api.get('/profile/location/ip');
      return response;
    } catch (error) {
      // Si l'API n'est pas disponible, utiliser un service public
      try {
        const fallbackResponse = await fetch('http://ip-api.com/json/');
        const data = await fallbackResponse.json();
        if (data.status === 'success') {
          return {
            latitude: data.lat,
            longitude: data.lon,
            city: data.city,
            country: data.country
          };
        }
      } catch (fallbackError) {
      }
      throw error;
    }
  },

  // Liker un profil
  async likeProfile(userId: number): Promise<any> {
    const response = await api.post(`/profile/like/${userId}`);
    return response;
  },

  // Rejeter un profil
  async rejectProfile(userId: number): Promise<any> {
    const response = await api.post(`/profile/reject/${userId}`);
    return response;
  },

  // Annuler un like
  async unlikeProfile(userId: number): Promise<any> {
    const response = await api.delete(`/profile/like/${userId}`);
    return response;
  },
}; 