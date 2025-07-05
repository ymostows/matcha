// Types pour les utilisateurs
export interface User {
    id: number;
  email: string;
  password_hash: string;
  username: string;
  first_name: string;
  last_name: string;
  is_verified: boolean;
  verification_token?: string | null;
  reset_password_token?: string | null;
  reset_password_expires?: Date | null;
  created_at: Date;
  updated_at: Date;
  last_seen: Date;
}

// Type pour l'inscription (sans les champs auto-générés)
export interface CreateUserRequest {
    email: string;
    password: string;
  username: string;
  first_name: string;
  last_name: string;
  }
  
// Type pour la connexion
export interface LoginRequest {
    email: string;
    password: string;
  }
  
// Type pour le payload JWT
export interface JWTPayload {
    userId: number;
  email: string;
  username: string;
}

// Type pour les données de profil
export interface Profile {
  id: number;
  user_id: number;
  biography?: string | null;
  age?: number | null;
  gender?: 'homme' | 'femme' | null;
  sexual_orientation?: 'hetero' | 'homo' | 'bi' | null;
  interests?: string[] | null;
  location_lat?: number | null;
  location_lng?: number | null;
  city?: string | null;
  fame_rating: number;
  created_at: Date;
  updated_at: Date;
}

// Type pour la création de profil
export interface CreateProfileData {
  biography?: string;
  age?: number;
  gender?: 'homme' | 'femme';
  sexual_orientation?: 'hetero' | 'homo' | 'bi';
  interests?: string[];
  city?: string;
}

// Type pour la mise à jour de profil
export interface UpdateProfileData {
  biography?: string;
  age?: number;
  gender?: 'homme' | 'femme';
  sexual_orientation?: 'hetero' | 'homo' | 'bi';
  interests?: string[];
  city?: string;
  location_lat?: number;
  location_lng?: number;
}

// Type pour la création/mise à jour de profil (API Request)
export interface UpdateProfileRequest {
  biography?: string;
  age?: number;
  gender?: 'homme' | 'femme';
  sexual_orientation?: 'hetero' | 'homo' | 'bi';
  interests?: string[];
  city?: string;
}

// Type pour les photos
export interface Photo {
  id: number;
  user_id: number;
  filename: string;
  is_profile_picture: boolean;
  upload_date: Date;
}

// Type pour les réponses d'authentification
export interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: {
    id: number;
    email: string;
    username: string;
    is_verified: boolean;
  };
  }