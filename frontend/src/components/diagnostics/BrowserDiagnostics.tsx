/**
 * BrowserDiagnostics - Composant de diagnostic des limitations du navigateur
 * 
 * Affiche des informations utiles pour déboguer les problèmes en navigation privée :
 * - Statut du stockage (localStorage, sessionStorage) 
 * - Permissions de géolocalisation
 * - Connectivité WebSocket
 * - Conseils d'aide pour résoudre les problèmes
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Info, 
  Wifi,
  MapPin,
  Database,
  RefreshCw,
  Eye,
  EyeOff,
  HelpCircle
} from 'lucide-react';
import { Button } from '../ui/button';
import storageManager, { BrowserLimitations } from '../../utils/storageManager';
import geolocationManager, { PermissionStatus } from '../../utils/geolocationManager';

interface DiagnosticResult {
  category: string;
  name: string;
  status: 'success' | 'warning' | 'error' | 'info';
  message: string;
  details?: string;
  solution?: string;
}

interface BrowserDiagnosticsProps {
  isVisible?: boolean;
  onClose?: () => void;
  showDetailed?: boolean;
}

export const BrowserDiagnostics: React.FC<BrowserDiagnosticsProps> = ({ 
  isVisible = false, 
  onClose,
  showDetailed = false 
}) => {
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(showDetailed);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isVisible) {
      runDiagnostics();
    }
  }, [isVisible]);

  const runDiagnostics = async () => {
    setIsLoading(true);
    const results: DiagnosticResult[] = [];

    try {
      // 1. Diagnostic du stockage
      const storageLimitations = storageManager.getLimitations();
      results.push(...await diagnoseStorage(storageLimitations));

      // 2. Diagnostic de la géolocalisation
      const geoStatus = await geolocationManager.checkPermissionStatus();
      results.push(...await diagnoseGeolocation(geoStatus));

      // 3. Diagnostic de la connectivité
      results.push(...await diagnoseConnectivity());

      // 4. Diagnostic général du navigateur
      results.push(...diagnoseGeneral());

      setDiagnostics(results);
    } catch (error) {
      results.push({
        category: 'Général',
        name: 'Erreur de diagnostic',
        status: 'error',
        message: 'Impossible d\'effectuer le diagnostic complet',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const diagnoseStorage = async (limitations: BrowserLimitations): Promise<DiagnosticResult[]> => {
    const results: DiagnosticResult[] = [];

    // Test localStorage
    if (limitations.hasLocalStorage) {
      results.push({
        category: 'Stockage',
        name: 'LocalStorage',
        status: limitations.storageQuotaLimited ? 'warning' : 'success',
        message: limitations.storageQuotaLimited ? 'Disponible mais limité' : 'Disponible et fonctionnel',
        details: limitations.storageQuotaLimited ? 'Le quota de stockage est réduit' : undefined,
        solution: limitations.storageQuotaLimited ? 'Normal en navigation privée. L\'application s\'adapte automatiquement.' : undefined
      });
    } else {
      results.push({
        category: 'Stockage',
        name: 'LocalStorage',
        status: 'error',
        message: 'Non disponible',
        details: 'Le stockage local est bloqué ou non supporté',
        solution: 'Vérifiez les paramètres de confidentialité de votre navigateur ou quittez le mode navigation privée.'
      });
    }

    // Test sessionStorage  
    if (limitations.hasSessionStorage) {
      results.push({
        category: 'Stockage',
        name: 'SessionStorage',
        status: 'success',
        message: 'Disponible et fonctionnel',
      });
    } else {
      results.push({
        category: 'Stockage',
        name: 'SessionStorage',
        status: 'error',
        message: 'Non disponible',
        solution: 'Problème inhabituel. Essayez de redémarrer votre navigateur.'
      });
    }

    // Mode privé
    if (limitations.isPrivateMode) {
      results.push({
        category: 'Stockage',
        name: 'Mode navigation privée',
        status: 'warning',
        message: 'Mode privé détecté',
        details: 'Certaines fonctionnalités peuvent être limitées',
        solution: 'Pour une expérience optimale, utilisez le mode normal. L\'application s\'adapte automatiquement.'
      });
    } else {
      results.push({
        category: 'Stockage',
        name: 'Mode navigation',
        status: 'success',
        message: 'Mode normal détecté',
      });
    }

    // Test de fonctionnement du storage manager
    const storageWorking = storageManager.isWorking();
    results.push({
      category: 'Stockage',
      name: 'Système de stockage',
      status: storageWorking ? 'success' : 'error',
      message: storageWorking ? `Fonctionnel (${storageManager.getActiveStorageType()})` : 'Dysfonctionnel',
      details: storageWorking ? `Utilise ${storageManager.getActiveStorageType()}${storageManager.isUsingMemoryFallback() ? ' + mémoire' : ''}` : 'Impossible de stocker les données',
    });

    return results;
  };

  const diagnoseGeolocation = async (geoStatus: PermissionStatus): Promise<DiagnosticResult[]> => {
    const results: DiagnosticResult[] = [];

    // Support de la géolocalisation
    if (geoStatus.supported) {
      results.push({
        category: 'Géolocalisation',
        name: 'Support navigateur',
        status: 'success',
        message: 'Géolocalisation supportée',
      });
    } else {
      results.push({
        category: 'Géolocalisation',
        name: 'Support navigateur',
        status: 'error',
        message: 'Géolocalisation non supportée',
        solution: 'Utilisez un navigateur moderne (Chrome, Firefox, Safari, Edge).'
      });
    }

    // Permissions
    if (geoStatus.granted) {
      results.push({
        category: 'Géolocalisation',
        name: 'Permissions',
        status: 'success',
        message: 'Permission accordée',
      });
    } else if (geoStatus.denied) {
      results.push({
        category: 'Géolocalisation',
        name: 'Permissions',
        status: 'error',
        message: 'Permission refusée',
        solution: 'Cliquez sur l\'icône 🔒 dans la barre d\'adresse et autorisez la géolocalisation. En mode privé, vous devrez autoriser à chaque visite.'
      });
    } else if (geoStatus.prompt) {
      results.push({
        category: 'Géolocalisation',
        name: 'Permissions',
        status: 'warning',
        message: 'Permission requise',
        solution: 'Cliquez sur "Position Précise (GPS)" pour autoriser la géolocalisation.'
      });
    }

    // Test de connectivité vers les APIs de géolocalisation
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const testResponse = await fetch('https://ipapi.co/json/', { 
        method: 'GET',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (testResponse.ok) {
        results.push({
          category: 'Géolocalisation',
          name: 'API de géolocalisation IP',
          status: 'success',
          message: 'APIs accessibles',
        });
      } else {
        throw new Error(`HTTP ${testResponse.status}`);
      }
    } catch (error) {
      results.push({
        category: 'Géolocalisation',
        name: 'API de géolocalisation IP',
        status: 'warning',
        message: 'APIs partiellement accessibles',
        details: 'Certaines APIs de géolocalisation IP peuvent être bloquées',
        solution: 'Utilisez la géolocalisation GPS ou saisissez votre ville manuellement.'
      });
    }

    return results;
  };

  const diagnoseConnectivity = async (): Promise<DiagnosticResult[]> => {
    const results: DiagnosticResult[] = [];

    // Test de connectivité internet
    try {
      const isOnline = navigator.onLine;
      results.push({
        category: 'Connectivité',
        name: 'Connexion internet',
        status: isOnline ? 'success' : 'error',
        message: isOnline ? 'Connecté' : 'Hors ligne',
        solution: !isOnline ? 'Vérifiez votre connexion internet.' : undefined
      });
    } catch (error) {
      results.push({
        category: 'Connectivité',
        name: 'Connexion internet',
        status: 'warning',
        message: 'Impossible de vérifier',
      });
    }

    // Test de connectivité vers l'API backend
    try {
      const controller2 = new AbortController();
      const timeoutId2 = setTimeout(() => controller2.abort(), 5000);
      
      const apiResponse = await fetch('/api/health', { 
        method: 'GET',
        signal: controller2.signal
      });
      
      clearTimeout(timeoutId2);
      
      if (apiResponse.ok) {
        results.push({
          category: 'Connectivité',
          name: 'Serveur API',
          status: 'success',
          message: 'Serveur accessible',
        });
      } else {
        throw new Error(`HTTP ${apiResponse.status}`);
      }
    } catch (error) {
      results.push({
        category: 'Connectivité',
        name: 'Serveur API',
        status: 'error',
        message: 'Serveur inaccessible',
        details: error instanceof Error ? error.message : 'Erreur de connexion',
        solution: 'Vérifiez que le serveur backend est démarré (npm run dev dans le dossier backend).'
      });
    }

    // Test WebSocket
    try {
      const wsSupported = 'WebSocket' in window;
      results.push({
        category: 'Connectivité',
        name: 'WebSocket',
        status: wsSupported ? 'success' : 'warning',
        message: wsSupported ? 'Supporté par le navigateur' : 'Non supporté',
        solution: !wsSupported ? 'Le chat fonctionnera en mode dégradé (polling HTTP).' : undefined
      });
    } catch (error) {
      results.push({
        category: 'Connectivité',
        name: 'WebSocket',
        status: 'warning',
        message: 'Support indéterminé',
      });
    }

    return results;
  };

  const diagnoseGeneral = (): DiagnosticResult[] => {
    const results: DiagnosticResult[] = [];

    // Informations du navigateur
    const userAgent = navigator.userAgent;
    let browserName = 'Inconnu';
    
    if (userAgent.includes('Chrome')) browserName = 'Chrome';
    else if (userAgent.includes('Firefox')) browserName = 'Firefox';
    else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) browserName = 'Safari';
    else if (userAgent.includes('Edge')) browserName = 'Edge';

    results.push({
      category: 'Général',
      name: 'Navigateur',
      status: 'info',
      message: browserName,
      details: navigator.userAgent
    });

    // Performance JavaScript
    const jsPerformance = typeof window !== 'undefined' && 'performance' in window;
    results.push({
      category: 'Général',
      name: 'APIs modernes',
      status: jsPerformance ? 'success' : 'warning',
      message: jsPerformance ? 'Supportées' : 'Partiellement supportées',
    });

    return results;
  };

  const toggleItem = (itemKey: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemKey)) {
      newExpanded.delete(itemKey);
    } else {
      newExpanded.add(itemKey);
    }
    setExpandedItems(newExpanded);
  };

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Stockage':
        return <Database className="w-5 h-5" />;
      case 'Géolocalisation':
        return <MapPin className="w-5 h-5" />;
      case 'Connectivité':
        return <Wifi className="w-5 h-5" />;
      case 'Général':
        return <Info className="w-5 h-5" />;
      default:
        return <HelpCircle className="w-5 h-5" />;
    }
  };

  const categorizedDiagnostics = diagnostics.reduce((acc, diagnostic) => {
    if (!acc[diagnostic.category]) {
      acc[diagnostic.category] = [];
    }
    acc[diagnostic.category].push(diagnostic);
    return acc;
  }, {} as Record<string, DiagnosticResult[]>);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="bg-white rounded-xl shadow-2xl max-w-4xl max-h-[80vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-primary to-accent text-white p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <HelpCircle className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Diagnostic du navigateur</h2>
                  <p className="text-white/80">Vérification des fonctionnalités disponibles</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setShowDetails(!showDetails)}
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/20"
                >
                  {showDetails ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                  {showDetails ? 'Masquer' : 'Détails'}
                </Button>
                <Button
                  onClick={runDiagnostics}
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/20"
                  disabled={isLoading}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  Actualiser
                </Button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 max-h-[60vh] overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
                  <p className="text-twilight/60">Diagnostic en cours...</p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(categorizedDiagnostics).map(([category, items]) => (
                  <div key={category} className="space-y-3">
                    {/* Category Header */}
                    <div className="flex items-center gap-3 pb-2 border-b">
                      {getCategoryIcon(category)}
                      <h3 className="font-semibold text-twilight">{category}</h3>
                      <div className="ml-auto flex gap-1">
                        {items.map(item => getStatusIcon(item.status)).slice(0, 3)}
                      </div>
                    </div>

                    {/* Category Items */}
                    <div className="space-y-2">
                      {items.map((item, index) => {
                        const itemKey = `${category}-${index}`;
                        const isExpanded = expandedItems.has(itemKey);
                        const hasDetails = item.details || item.solution;

                        return (
                          <div key={itemKey} className="bg-gray-50 rounded-lg p-3">
                            <div 
                              className={`flex items-center justify-between ${hasDetails && showDetails ? 'cursor-pointer' : ''}`}
                              onClick={hasDetails && showDetails ? () => toggleItem(itemKey) : undefined}
                            >
                              <div className="flex items-center gap-3">
                                {getStatusIcon(item.status)}
                                <div>
                                  <span className="font-medium text-twilight">{item.name}</span>
                                  <p className="text-sm text-twilight/60">{item.message}</p>
                                </div>
                              </div>
                              {hasDetails && showDetails && (
                                <Button variant="ghost" size="sm">
                                  {isExpanded ? '▼' : '▶'}
                                </Button>
                              )}
                            </div>

                            {/* Expanded Details */}
                            <AnimatePresence>
                              {isExpanded && showDetails && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="mt-3 pt-3 border-t border-gray-200"
                                >
                                  {item.details && (
                                    <div className="mb-2">
                                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Détails</p>
                                      <p className="text-sm text-gray-700">{item.details}</p>
                                    </div>
                                  )}
                                  {item.solution && (
                                    <div>
                                      <p className="text-xs font-medium text-blue-500 uppercase tracking-wide mb-1">Solution</p>
                                      <p className="text-sm text-blue-700 bg-blue-50 p-2 rounded">{item.solution}</p>
                                    </div>
                                  )}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {/* Summary */}
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-800 mb-2">Résumé</h4>
                  <p className="text-sm text-blue-700">
                    L'application Matcha s'adapte automatiquement aux limitations de votre navigateur. 
                    En mode navigation privée, certaines fonctionnalités utilisent des systèmes de fallback 
                    pour garantir une expérience utilisateur optimale.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 flex justify-end">
            <Button onClick={onClose}>Fermer</Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default BrowserDiagnostics;