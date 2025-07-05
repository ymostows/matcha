// Types pour l'authentification frontend
export interface User {
  id: number;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  is_verified: boolean;
  created_at: string;
  last_seen: string;
}

export interface RegisterData {
  email: string;
  username: string;
  password: string;
  first_name: string;
  last_name: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: User;
}

export interface ApiError {
  success: false;
  message: string;
  details?: string;
}

// Types pour les contextes React
export interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  error: string | null;
}

// Types pour les formulaires
export interface FormErrors {
  [key: string]: string[];
} 