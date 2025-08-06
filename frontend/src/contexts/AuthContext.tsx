import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { User, AuthContextType, RegisterData } from '../types/auth';
import apiService from '../services/api';
import { profileApi } from '../services/profileApi';
import storageManager from '../utils/storageManager';

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

        // Utiliser le storageManager robuste au lieu de localStorage direct
        const savedToken = storageManager.getItem('token');
        const savedUserData = storageManager.getObject<User>('user');

        if (savedToken && savedUserData) {
          // Restaurer la session depuis le stockage
          setToken(savedToken);
          setUser(savedUserData);
          
          // Informer apiService du token restauré
          apiService.setAuthToken(savedToken);
          
          // Vérifier que le token est toujours valide
          try {
            const profileData = await profileApi.getMyProfile();
            const updatedUser = {
              ...savedUserData,
              ...profileData,
            };
            setUser(updatedUser);
            storageManager.setObject('user', updatedUser);
          } catch (tokenError) {
            console.warn('Token invalide, déconnexion:', tokenError);
            // Token invalide, nettoyer la session
            apiService.logout();
            storageManager.removeItem('token');
            storageManager.removeItem('user');
            setToken(null);
            setUser(null);
          }
        } else {
          // Pas de session sauvegardée
          console.log('Aucune session trouvée');
        }
      } catch (error) {
        console.error('Erreur lors de l\'initialisation:', error);
        setError('Erreur lors de l\'initialisation');
        
        // En cas d'erreur, nettoyer complètement
        apiService.logout();
        storageManager.removeItem('token');
        storageManager.removeItem('user');
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
        
        // Charger les données du profil complet après le login
        try {
          const profileData = await profileApi.getMyProfile();
          const updatedUser = {
            ...response.user,
            ...profileData,
          };
          setUser(updatedUser);
          
          // Sauvegarder avec le storageManager robuste
          const savedSuccessfully = storageManager.setObject('user', updatedUser);
          if (!savedSuccessfully) {
            console.warn('Impossible de sauvegarder les données utilisateur');
            // Afficher une notification à l'utilisateur si nécessaire
          }
        } catch (profileError) {
          // En cas d'erreur, continuer avec les données utilisateur de base
          console.warn('Impossible de charger les données du profil:', profileError);
          
          // Sauvegarder au moins les données de base
          const savedSuccessfully = storageManager.setObject('user', response.user);
          if (!savedSuccessfully) {
            console.warn('Impossible de sauvegarder même les données utilisateur de base');
          }
        }
      } else {
        throw new Error(response.message || 'Erreur de connexion');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur de connexion';
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

      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur d\'inscription';
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
    apiService.logout();
    setUser(null);
    setToken(null);
    setError(null);
  }, []);

  /**
   * Rafraîchit les données de l'utilisateur
   */
  const refreshUser = useCallback(async (): Promise<void> => {
    if (!user) return;

    try {
      const profileData = await profileApi.getMyProfile();
      
      const updatedUser = {
        ...user,
        ...profileData,
      };

      setUser(updatedUser);
      
      // Sauvegarder avec le storageManager robuste
      const savedSuccessfully = storageManager.setObject('user', updatedUser);
      if (!savedSuccessfully) {
        console.warn('Impossible de sauvegarder les données utilisateur mises à jour');
      }
    } catch (error) {
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