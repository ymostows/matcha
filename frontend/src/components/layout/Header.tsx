import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../ui/button';
import { Heart, User, Home, LogOut, Search } from 'lucide-react';

export const Header: React.FC = () => {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const isAuthenticated = !!(user && token);
  
  // Le header est toujours présent maintenant

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-gray-100/80 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo et nom de l'application */}
          <div 
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => navigate(isAuthenticated ? '/dashboard' : '/')}
          >
            <div className="w-10 h-10 bg-gradient-to-r from-primary to-accent rounded-xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-all duration-300 group-hover:scale-105">
              <Heart className="w-6 h-6 text-white" fill="currentColor" />
          </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Matcha
          </h1>
        </div>
        
          {/* Navigation selon l'état de connexion */}
          {isAuthenticated ? (
            <div className="flex items-center gap-8">
              {/* Navigation principale avec design uniforme */}
              <nav className="hidden md:flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
                  onClick={() => navigate('/dashboard')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-300 ${
                    location.pathname === '/dashboard' 
                      ? 'bg-gradient-to-r from-primary to-accent text-white shadow-lg hover:shadow-xl' 
                      : 'text-twilight/70 hover:text-twilight hover:bg-gray-50 hover:shadow-md'
                  }`}
            >
                  <Home className="w-4 h-4" />
                  Accueil
            </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/browsing')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-300 ${
                    location.pathname === '/browsing' 
                      ? 'bg-gradient-to-r from-primary to-accent text-white shadow-lg hover:shadow-xl' 
                      : 'text-twilight/70 hover:text-twilight hover:bg-gray-50 hover:shadow-md'
                  }`}
                >
                  <Search className="w-4 h-4" />
                  Découverte
          </Button>
          
          <Button 
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/profile')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-300 ${
                    location.pathname.includes('/profile') 
                      ? 'bg-gradient-to-r from-primary to-accent text-white shadow-lg hover:shadow-xl' 
                      : 'text-twilight/70 hover:text-twilight hover:bg-gray-50 hover:shadow-md'
                  }`}
                >
                  <User className="w-4 h-4" />
                  Mon profil
                </Button>
              </nav>

              {/* Menu utilisateur simplifié */}
              <div className="flex items-center gap-4">
                {/* Bouton déconnexion avec design uniforme */}
                <Button
                  variant="ghost"
            size="sm" 
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-red-500 hover:text-red-600 hover:bg-red-50 hover:shadow-md transition-all duration-300"
          >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Déconnexion</span>
          </Button>

                {/* Informations utilisateur à droite */}
                <div className="hidden sm:flex items-center gap-3 bg-gradient-to-r from-primary/5 to-accent/5 px-4 py-2 rounded-xl border border-primary/10">
                  <div className="w-8 h-8 bg-gradient-to-r from-primary to-accent rounded-full flex items-center justify-center text-white text-sm font-bold shadow-md">
                    {user?.first_name?.charAt(0)?.toUpperCase() || user?.username?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-twilight leading-tight">
                      {user?.first_name} {user?.last_name}
                    </p>
                    <p className="text-xs text-primary font-medium">@{user?.username}</p>
                  </div>
                </div>

                {/* Menu mobile simplifié */}
                <div className="sm:hidden flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLogout}
                    className="p-2 rounded-xl text-red-500 hover:bg-red-50"
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            // Pour les utilisateurs non connectés : header vide (juste l'espace)
            <div></div>
          )}
        </div>
      </div>
    </header>
  );
};