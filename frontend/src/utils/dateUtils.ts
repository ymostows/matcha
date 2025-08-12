/**
 * Utilitaires pour gérer les dates et timestamps correctement
 * Résout les problèmes de fuseaux horaires entre UTC (backend) et heure locale
 */

/**
 * Formate un timestamp pour l'affichage dans le chat
 * @param dateString - Timestamp ISO string (généralement en UTC depuis la DB)
 * @returns Heure formatée en français (HH:MM)
 */
export const formatChatTime = (dateString: string): string => {
  // Créer la date à partir du timestamp UTC
  const utcDate = new Date(dateString);
  
  // Utiliser getHours() et getMinutes() qui appliquent automatiquement le fuseau local
  const hours = utcDate.getHours().toString().padStart(2, '0');
  const minutes = utcDate.getMinutes().toString().padStart(2, '0');
  
  return `${hours}:${minutes}`;
};

/**
 * Calcule le temps écoulé depuis un timestamp pour les notifications
 * @param dateString - Timestamp ISO string
 * @returns Texte formaté ("À l'instant", "Il y a 5min", etc.)
 */
export const getTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 1) return 'À l\'instant';
  if (diffInMinutes < 60) return `Il y a ${diffInMinutes}min`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `Il y a ${diffInHours}h`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `Il y a ${diffInDays}j`;
  if (diffInDays < 30) return `Il y a ${Math.floor(diffInDays / 7)}sem`;
  
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short'
  });
};

/**
 * Formate un timestamp pour les listes de conversations
 * @param dateString - Timestamp ISO string
 * @returns Texte formaté pour la liste des conversations
 */
export const formatConversationTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

  if (diffInHours < 1) {
    return 'À l\'instant';
  } else if (diffInHours < 24) {
    return `Il y a ${Math.floor(diffInHours)}h`;
  } else {
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short'
    });
  }
};

/**
 * Vérifie si un utilisateur est considéré comme en ligne
 * @param lastSeenString - Timestamp du dernier vu
 * @returns true si l'utilisateur est considéré en ligne
 */
export const isUserOnline = (lastSeenString: string): boolean => {
  const lastSeenDate = new Date(lastSeenString);
  const now = new Date();
  const diffMinutes = (now.getTime() - lastSeenDate.getTime()) / (1000 * 60);
  return diffMinutes < 5; // En ligne si vu dans les 5 dernières minutes
};

/**
 * Formate le statut "dernière fois vu" pour les profils
 * @param lastSeenString - Timestamp du dernier vu
 * @returns Texte formaté du statut
 */
export const formatLastSeen = (lastSeenString: string): string => {
  const lastSeenDate = new Date(lastSeenString);
  const now = new Date();
  const diffMinutes = (now.getTime() - lastSeenDate.getTime()) / (1000 * 60);
  
  if (diffMinutes < 60) {
    return `il y a ${Math.floor(diffMinutes)} min`;
  } else if (diffMinutes < 1440) { // moins de 24h
    return `il y a ${Math.floor(diffMinutes / 60)} h`;
  } else {
    return `le ${lastSeenDate.toLocaleDateString('fr-FR')} à ${lastSeenDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
  }
};