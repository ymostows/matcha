// Fonction pour construire l'URL d'une photo
export function getPhotoUrl(photoId: number | string, baseUrl: string = 'http://localhost:3001'): string {
  return `${baseUrl}/api/profile/photos/${photoId}/image`;
}

// Fonction pour obtenir la photo de profil principale
export function getProfilePictureUrl(photos: any[], baseUrl: string = 'http://localhost:3001'): string {
  if (!photos || photos.length === 0) {
    return '/placeholder-avatar.svg'; // Image par défaut
  }
  
  // Chercher la photo de profil marquée
  const profilePicture = photos.find(photo => photo.is_profile_picture);
  if (profilePicture) {
    return getPhotoUrl(profilePicture.id, baseUrl);
  }
  
  // Sinon, prendre la première photo
  return getPhotoUrl(photos[0].id, baseUrl);
}

// Fonction pour obtenir toutes les URLs des photos d'un profil
export function getAllPhotoUrls(photos: any[], baseUrl: string = 'http://localhost:3001'): string[] {
  if (!photos || photos.length === 0) {
    return ['/placeholder-avatar.svg'];
  }
  
  return photos.map(photo => getPhotoUrl(photo.id, baseUrl));
}

// Fonction pour créer une image placeholder
export function getPlaceholderImage(name: string, gender?: string): string {
  const initials = name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .join('')
    .slice(0, 2);
  
  const bgColor = gender === 'homme' ? '#3B82F6' : gender === 'femme' ? '#EC4899' : '#6B7280';
  
  const svg = `
    <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${bgColor}"/>
      <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="60" fill="white" text-anchor="middle" dominant-baseline="middle">
        ${initials}
      </text>
    </svg>
  `;
  
  return `data:image/svg+xml;base64,${btoa(svg)}`;
} 