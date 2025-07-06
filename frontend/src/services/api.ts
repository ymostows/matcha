import type { AuthResponse, LoginData, RegisterData, User } from '../types/auth';

// Configuration de base de l'API
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

class ApiService {
  private baseURL: string;

  constructor() {
    this.baseURL = API_BASE_URL;
  }

  // Méthode privée pour faire les requêtes HTTP
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    // Headers par défaut (mais pas Content-Type si c'est du FormData)
    const defaultHeaders: Record<string, string> = {};

    // Ne pas définir Content-Type pour FormData (le navigateur le fait automatiquement)
    if (!(options.body instanceof FormData)) {
      defaultHeaders['Content-Type'] = 'application/json';
    }

    // Ajouter le token JWT si disponible
    const token = localStorage.getItem('token');
    if (token) {
      defaultHeaders.Authorization = `Bearer ${token}`;
    }

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  // === MÉTHODES D'AUTHENTIFICATION ===

  /**
   * Inscription d'un nouvel utilisateur
   */
  async register(userData: RegisterData): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  /**
   * Connexion d'un utilisateur
   */
  async login(credentials: LoginData): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    // Sauvegarder le token en localStorage si la connexion réussit
    if (response.success && response.token) {
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
    }

    return response;
  }

  /**
   * Récupération du profil utilisateur (route protégée)
   */
  async getProfile(): Promise<{ success: boolean; user: User }> {
    return this.request<{ success: boolean; user: User }>('/auth/profile');
  }

  /**
   * Déconnexion (côté client)
   */
  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  /**
   * Vérifier si l'utilisateur est connecté
   */
  isAuthenticated(): boolean {
    const token = localStorage.getItem('token');
    return !!token;
  }

  /**
   * Récupérer l'utilisateur stocké localement
   */
  getCurrentUser(): User | null {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch {
        return null;
      }
    }
    return null;
  }

  /**
   * Vérification d'email avec un token
   */
  async verifyEmail(token: string): Promise<{ success: boolean; message: string; expired?: boolean }> {
    try {
      const response = await this.request<{ success: boolean; message: string; expired?: boolean }>(`/auth/verify-email/${token}`);
      return response;
    } catch (error: any) {
      // Retourner une structure cohérente même en cas d'erreur
      if (error.message) {
        return {
          success: false,
          message: error.message,
          expired: error.message.includes('expiré')
        };
      }
      
      return {
        success: false,
        message: 'Erreur lors de la vérification de l\'email'
      };
    }
  }

  /**
   * Demander un reset de mot de passe
   */
  async forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  /**
   * Réinitialiser le mot de passe avec un token
   */
  async resetPassword(token: string, password: string): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(`/auth/reset-password/${token}`, {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
  }

  /**
   * Test de santé de l'API
   */
  async healthCheck(): Promise<{ status: string; message: string }> {
    return this.request<{ status: string; message: string }>('/health');
  }

  // === MÉTHODES HTTP GÉNÉRIQUES ===

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any, options?: Omit<RequestInit, 'method' | 'body'>): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data instanceof FormData ? data : JSON.stringify(data),
      ...options
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

// Export d'une instance singleton
export const apiService = new ApiService();
export default apiService; 