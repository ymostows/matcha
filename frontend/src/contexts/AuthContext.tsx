import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { User, AuthContextType, RegisterData } from '../types/auth';
import apiService from '../services/api';
import { profileApi } from '../services/profileApi';

// Création du contexte
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Props pour le provider
interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Provider du contexte d'authentification
 * Gère l'état global de l'utilisateur connecté
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Initialisation : vérifier si l'utilisateur est déjà connecté
   */
  useEffect(() => {
    const initAuth = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const savedToken = localStorage.getItem('token');
        const savedUser = apiService.getCurrentUser();

        if (savedToken && savedUser) {
          // Restaurer la session depuis le localStorage
          setToken(savedToken);
          setUser(savedUser);
          console.log('✅ Session restaurée avec succès');
        } else {
          console.log('ℹ️ Aucune session sauvegardée');
        }
      } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation auth:', error);
        setError('Erreur lors de l\'initialisation');
        // En cas d'erreur, nettoyer
        apiService.logout();
        setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  /**
   * Fonction de connexion
   */
  const login = useCallback(async (email: string, password: string): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await apiService.login({ email, password });
      
      if (response.success && response.token && response.user) {
        setToken(response.token);
        setUser(response.user);
        console.log('✅ Connexion réussie');
      } else {
        throw new Error(response.message || 'Erreur de connexion');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur de connexion';
      console.error('❌ Erreur de connexion:', errorMessage);
      setError(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Fonction d'inscription
   */
  const register = useCallback(async (userData: RegisterData): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await apiService.register(userData);
      
      if (!response.success) {
        throw new Error(response.message || 'Erreur lors de l\'inscription');
      }

      console.log('✅ Inscription réussie');
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur d\'inscription';
      console.error('❌ Erreur d\'inscription:', errorMessage);
      setError(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Fonction de déconnexion
   */
  const logout = useCallback((): void => {
    console.log('🚪 Déconnexion...');
    apiService.logout();
    setUser(null);
    setToken(null);
    setError(null);
    console.log('✅ Déconnexion terminée');
  }, []);

  /**
   * Rafraîchit les données de l'utilisateur
   */
  const refreshUser = useCallback(async (): Promise<void> => {
    if (!user) return;

    try {
      console.log('🔄 Rafraîchissement des données utilisateur...');
      const profileData = await profileApi.getMyProfile();
      
      const updatedUser = {
        ...user,
        ...profileData,
      };

      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      console.log('✅ Données utilisateur rafraîchies');
    } catch (error) {
      console.error('❌ Erreur lors du rafraîchissement des données:', error);
    }
  }, [user]);

  // Valeur du contexte
  const contextValue: AuthContextType = {
    user,
    token,
    login,
    register,
    logout,
    refreshUser,
    isLoading,
    error,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Hook personnalisé pour utiliser le contexte d'authentification
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth doit être utilisé dans un AuthProvider');
  }
  
  return context;
};

export default AuthContext; 