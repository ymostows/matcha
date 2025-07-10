import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../ui/button';
import { Heart, User, Home, LogOut, Search, Menu, X } from 'lucide-react';

export const Header: React.FC = () => {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const isAuthenticated = !!(user && token);
  
  // Le header est toujours présent maintenant

  const handleLogout = () => {
    logout();
    navigate('/login');
    setIsMenuOpen(false);
  };

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  const navLinks = [
    { path: '/dashboard', label: 'Accueil', icon: Home },
    { path: '/browsing', label: 'Découverte', icon: Search },
    { path: '/profile', label: 'Mon profil', icon: User },
  ];

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
            <>
              {/* Navigation Desktop */}
              <nav className="hidden md:flex items-center gap-2">
                {navLinks.map((link) => (
                  <Button 
                    key={link.path}
                    variant={location.pathname.startsWith(link.path) ? 'default' : 'ghost'}
                    size="sm" 
                    onClick={() => navigate(link.path)}
                    className="flex items-center gap-2"
                  >
                    <link.icon className="w-4 h-4" />
                    {link.label}
                  </Button>
                ))}
                <Button
                  variant="ghost"
                  size="sm" 
                  onClick={handleLogout}
                  className="flex items-center gap-2 text-red-500 hover:text-red-600 hover:bg-red-50"
                >
                  <LogOut className="w-4 h-4" />
                  Déconnexion
                </Button>
              </nav>

              {/* Bouton Hamburger pour mobile */}
              <div className="md:hidden">
                <Button variant="ghost" size="icon" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                  {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </Button>
              </div>
            </>
          ) : (
            // Pour les utilisateurs non connectés : header vide (juste l'espace)
            <div></div>
          )}
        </div>
      </div>

      {/* Menu mobile déroulant */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100">
          <nav className="flex flex-col p-4 gap-2">
            {navLinks.map((link) => (
              <Button 
                key={link.path}
                variant={location.pathname.startsWith(link.path) ? 'default' : 'ghost'} 
                size="lg"
                onClick={() => navigate(link.path)}
                className="flex justify-start items-center gap-4 w-full"
              >
                <link.icon className="w-5 h-5" />
                <span>{link.label}</span>
              </Button>
            ))}
            <Button
              variant="ghost"
              size="lg"
              onClick={handleLogout}
              className="flex justify-start items-center gap-4 w-full text-red-500 hover:text-red-600 hover:bg-red-50"
            >
              <LogOut className="w-5 h-5" />
              <span>Déconnexion</span>
            </Button>
          </nav>
        </div>
      )}
    </header>
  );
};