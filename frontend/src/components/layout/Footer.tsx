import React from 'react';
import { Heart } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-gradient-to-r from-rose-25 to-peach mt-auto border-t border-rose-100">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          {/* Brand */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-primary to-secondary rounded-lg">
              <Heart className="w-4 h-4 text-white fill-current" />
            </div>
            <h3 className="text-lg font-display font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Matcha
            </h3>
          </div>
          
          {/* Simple links */}
          <div className="flex items-center space-x-6 text-sm">
            <a href="#" className="text-twilight/60 hover:text-primary transition-colors">À propos</a>
            <a href="#" className="text-twilight/60 hover:text-primary transition-colors">Contact</a>
          </div>
          
          {/* Copyright */}
          <div className="flex items-center space-x-1 text-sm text-twilight/50">
            <span>© 2025 Matcha - Projet d'école</span>
            <Heart className="w-3 h-3 text-primary fill-current ml-1" />
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 