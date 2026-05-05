/**
 * StorageManager - Gestionnaire de stockage robuste pour la navigation privée
 * 
 * Fournit un système de fallback pour le stockage :
 * 1. localStorage (si disponible et fonctionnel)
 * 2. sessionStorage (si localStorage échoue) 
 * 3. memoryStorage (fallback ultime en mémoire)
 * 
 * Détecte automatiquement les limitations du navigateur et s'adapte.
 */

interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  clear(): void;
  key(index: number): string | null;
  readonly length: number;
}

class MemoryStorage implements StorageAdapter {
  private data: Map<string, string> = new Map();

  getItem(key: string): string | null {
    return this.data.get(key) || null;
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }

  clear(): void {
    this.data.clear();
  }

  key(index: number): string | null {
    const keys = Array.from(this.data.keys());
    return keys[index] || null;
  }

  get length(): number {
    return this.data.size;
  }
}

export interface BrowserLimitations {
  isPrivateMode: boolean;
  hasLocalStorage: boolean;
  hasSessionStorage: boolean;
  storageQuotaLimited: boolean;
  usingMemoryFallback: boolean;
  activeStorageType: 'localStorage' | 'sessionStorage' | 'memoryStorage';
}

class StorageManager {
  private storage: StorageAdapter;
  private limitations: BrowserLimitations;
  private memoryStorage = new MemoryStorage();

  constructor() {
    this.limitations = this.detectLimitations();
    this.storage = this.selectBestStorage();
  }

  /**
   * Détecte les limitations du navigateur
   */
  private detectLimitations(): BrowserLimitations {
    const limitations: BrowserLimitations = {
      isPrivateMode: false,
      hasLocalStorage: false,
      hasSessionStorage: false,
      storageQuotaLimited: false,
      usingMemoryFallback: false,
      activeStorageType: 'memoryStorage'
    };

    // Test localStorage
    try {
      const testKey = '__test_localStorage_' + Date.now();
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      limitations.hasLocalStorage = true;
    } catch (e) {
      limitations.hasLocalStorage = false;
    }

    // Test sessionStorage  
    try {
      const testKey = '__test_sessionStorage_' + Date.now();
      sessionStorage.setItem(testKey, 'test');
      sessionStorage.removeItem(testKey);
      limitations.hasSessionStorage = true;
    } catch (e) {
      limitations.hasSessionStorage = false;
    }

    // Détection du mode privé
    limitations.isPrivateMode = this.detectPrivateMode();

    // Test des quotas de stockage
    if (limitations.hasLocalStorage) {
      limitations.storageQuotaLimited = this.testStorageQuota();
    }

    return limitations;
  }

  /**
   * Détecte si le navigateur est en mode navigation privée
   */
  private detectPrivateMode(): boolean {
    try {
      // Méthode 1: Test du quota de stockage (Safari, Firefox)
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        navigator.storage.estimate().then(estimate => {
          // En mode privé, le quota est généralement très faible (< 10MB)
          if (estimate.quota && estimate.quota < 120000000) { // < 120MB
            return true;
          }
        });
      }

      // Méthode 2: Test de la persistance des données (Chrome, Edge)
      const testKey = '__private_mode_test_' + Date.now();
      try {
        localStorage.setItem(testKey, 'test');
        // En mode privé, les données peuvent être immédiatement supprimées
        setTimeout(() => {
          const value = localStorage.getItem(testKey);
          if (!value) {
            return true; // Mode privé détecté
          }
          localStorage.removeItem(testKey);
        }, 100);
      } catch (e) {
        return true;
      }

      // Méthode 3: Vérification des propriétés du navigateur
      if (typeof window !== 'undefined') {
        // Firefox
        if (navigator.serviceWorker === undefined) {
          return true;
        }
        
        // Safari - test alternatif plus sûr
        try {
          const testStorage = window.sessionStorage;
          testStorage.setItem('__safari_test__', '1');
          testStorage.removeItem('__safari_test__');
        } catch (e) {
          return true;
        }
      }

    } catch (e) {
      // En cas d'erreur, supposer qu'on est en mode privé pour plus de sécurité
      return true;
    }

    return false;
  }

  /**
   * Test des quotas de stockage pour détecter les limitations
   */
  private testStorageQuota(): boolean {
    try {
      const testData = 'x'.repeat(1024 * 1024); // 1MB de données
      const testKey = '__quota_test_' + Date.now();
      
      localStorage.setItem(testKey, testData);
      localStorage.removeItem(testKey);
      
      return false; // Pas de limitation détectée
    } catch (e) {
      return true; // Quota limité
    }
  }

  /**
   * Sélectionne le meilleur système de stockage disponible
   */
  private selectBestStorage(): StorageAdapter {
    // Préférer localStorage si disponible et non limité
    if (this.limitations.hasLocalStorage && !this.limitations.storageQuotaLimited) {
      this.limitations.activeStorageType = 'localStorage';
      return localStorage;
    }

    // Fallback vers sessionStorage
    if (this.limitations.hasSessionStorage) {
      this.limitations.activeStorageType = 'sessionStorage';
      return sessionStorage;
    }

    // Fallback ultime vers le stockage en mémoire
    this.limitations.usingMemoryFallback = true;
    this.limitations.activeStorageType = 'memoryStorage';
    return this.memoryStorage;
  }

  /**
   * Récupère une valeur du stockage
   */
  getItem(key: string): string | null {
    try {
      return this.storage.getItem(key);
    } catch (e) {
      // Fallback vers le stockage en mémoire
      if (this.storage !== this.memoryStorage) {
        return this.memoryStorage.getItem(key);
      }
      return null;
    }
  }

  /**
   * Stocke une valeur
   */
  setItem(key: string, value: string): boolean {
    try {
      this.storage.setItem(key, value);
      
      // Sauvegarder aussi en mémoire comme backup
      if (this.storage !== this.memoryStorage) {
        try {
          this.memoryStorage.setItem(key, value);
        } catch (e) {
          // Ignorer les erreurs de backup
        }
      }
      
      return true;
    } catch (e) {
      
      // Fallback vers le stockage en mémoire
      if (this.storage !== this.memoryStorage) {
        try {
          this.memoryStorage.setItem(key, value);
          this.limitations.usingMemoryFallback = true;
          return true;
        } catch (memError) {
        }
      }
      
      return false;
    }
  }

  /**
   * Supprime une valeur du stockage
   */
  removeItem(key: string): void {
    try {
      this.storage.removeItem(key);
    } catch (e) {
    }

    // Supprimer aussi du stockage en mémoire
    try {
      this.memoryStorage.removeItem(key);
    } catch (e) {
      // Ignorer les erreurs
    }
  }

  /**
   * Vide tout le stockage
   */
  clear(): void {
    try {
      this.storage.clear();
    } catch (e) {
    }

    try {
      this.memoryStorage.clear();
    } catch (e) {
      // Ignorer les erreurs
    }
  }

  /**
   * Stocke un objet JSON
   */
  setObject(key: string, obj: any): boolean {
    try {
      const jsonString = JSON.stringify(obj);
      return this.setItem(key, jsonString);
    } catch (e) {
      return false;
    }
  }

  /**
   * Récupère un objet JSON
   */
  getObject<T = any>(key: string): T | null {
    try {
      const jsonString = this.getItem(key);
      if (!jsonString) return null;
      
      return JSON.parse(jsonString) as T;
    } catch (e) {
      return null;
    }
  }

  /**
   * Récupère les informations sur les limitations du navigateur
   */
  getLimitations(): BrowserLimitations {
    return { ...this.limitations };
  }

  /**
   * Vérifie si le stockage fonctionne correctement
   */
  isWorking(): boolean {
    const testKey = '__storage_test_' + Date.now();
    const testValue = 'test_value';
    
    try {
      this.setItem(testKey, testValue);
      const retrieved = this.getItem(testKey);
      this.removeItem(testKey);
      
      return retrieved === testValue;
    } catch (e) {
      return false;
    }
  }

  /**
   * Récupère le type de stockage actuellement utilisé
   */
  getActiveStorageType(): string {
    return this.limitations.activeStorageType;
  }

  /**
   * Indique si on utilise le fallback mémoire
   */
  isUsingMemoryFallback(): boolean {
    return this.limitations.usingMemoryFallback;
  }

  /**
   * Indique si le navigateur est probablement en mode privé
   */
  isPrivateMode(): boolean {
    return this.limitations.isPrivateMode;
  }
}

// Instance singleton
const storageManager = new StorageManager();

export default storageManager;
export { StorageManager };