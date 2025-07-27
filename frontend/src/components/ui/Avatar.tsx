import React from 'react';
import { getPhotoUrl } from '../../utils/imageUtils';

interface AvatarProps {
  photoId?: number;
  name: string;
  gender?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  onClick?: () => void;
}

const sizeClasses = {
  sm: 'w-12 h-12',    // 48px
  md: 'w-16 h-16',    // 64px  
  lg: 'w-20 h-20',    // 80px
  xl: 'w-48 h-48'     // 192px
};

export const Avatar: React.FC<AvatarProps> = ({ 
  photoId, 
  name, 
  size = 'md', 
  className = '',
  onClick 
}) => {
  const sizeClass = sizeClasses[size];
  const initials = name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .join('')
    .slice(0, 2);

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.target as HTMLImageElement;
    target.style.display = 'none';
    
    // Ajouter le fallback si pas déjà présent
    const parent = target.parentElement;
    if (parent && !parent.querySelector('.fallback-avatar')) {
      const fallbackDiv = document.createElement('div');
      fallbackDiv.className = 'fallback-avatar w-full h-full bg-gradient-to-br from-primary to-accent flex items-center justify-center';
      fallbackDiv.innerHTML = `<span class="text-white font-bold text-sm">${initials}</span>`;
      parent.appendChild(fallbackDiv);
    }
  };

  return (
    <div 
      className={`${sizeClass} relative rounded-full overflow-hidden bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-md ${className} ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      {photoId ? (
        <img 
          src={getPhotoUrl(photoId)}
          alt={name}
          className="w-full h-full object-cover"
          onError={handleImageError}
        />
      ) : (
        <span className="text-white font-bold text-sm">{initials}</span>
      )}
    </div>
  );
};