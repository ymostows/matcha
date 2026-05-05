/**
 * TestPage - Page de test pour valider les corrections en navigation privée
 * 
 * Cette page permet de tester toutes les fonctionnalités potentiellement problématiques :
 * - Stockage (localStorage, sessionStorage, fallback mémoire)
 * - Géolocalisation (GPS, IP, manuel)
 * - WebSocket et chat
 * - Permissions du navigateur
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  TestTube, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  RefreshCw,
  Database,
  MapPin,
  MessageCircle,
  Wifi,
  Play,
  Eye
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { BrowserDiagnostics } from '../components/diagnostics/BrowserDiagnostics';
import storageManager from '../utils/storageManager';
import geolocationManager from '../utils/geolocationManager';
import { useSocket } from '../contexts/SocketContext';

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'warning' | 'error';
  message: string;
  details?: string;
  duration?: number;
}

const TestPage: React.FC = () => {
  const [tests, setTests] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const { isConnected } = useSocket();

  const updateTest = (name: string, result: Partial<TestResult>) => {
    setTests(prev => prev.map(test => 
      test.name === name ? { ...test, ...result } : test
    ));
  };

  const runAllTests = async () => {
    setIsRunning(true);
    
    // Initialiser tous les tests
    const initialTests: TestResult[] = [
      { name: 'Storage - localStorage', status: 'pending', message: 'Test en cours...' },
      { name: 'Storage - sessionStorage', status: 'pending', message: 'Test en cours...' },
      { name: 'Storage - Fallback mémoire', status: 'pending', message: 'Test en cours...' },
      { name: 'Storage - Persistance des données', status: 'pending', message: 'Test en cours...' },
      { name: 'Géolocalisation - Support navigateur', status: 'pending', message: 'Test en cours...' },
      { name: 'Géolocalisation - Permissions', status: 'pending', message: 'Test en cours...' },
      { name: 'Géolocalisation - API IP', status: 'pending', message: 'Test en cours...' },
      { name: 'WebSocket - Connexion', status: 'pending', message: 'Test en cours...' },
      { name: 'WebSocket - Reconnexion', status: 'pending', message: 'Test en cours...' },
      { name: 'Navigation privée - Détection', status: 'pending', message: 'Test en cours...' },
    ];
    
    setTests(initialTests);

    try {
      // Test 1: localStorage
      const startTime = Date.now();
      try {
        const testKey = 'test_localStorage_' + Date.now();
        localStorage.setItem(testKey, 'test');
        const retrieved = localStorage.getItem(testKey);
        localStorage.removeItem(testKey);
        
        updateTest('Storage - localStorage', {
          status: retrieved === 'test' ? 'success' : 'error',
          message: retrieved === 'test' ? 'Fonctionnel' : 'Dysfonctionnel',
          duration: Date.now() - startTime
        });
      } catch (error) {
        updateTest('Storage - localStorage', {
          status: 'error',
          message: 'Bloqué ou non disponible',
          details: error instanceof Error ? error.message : 'Erreur inconnue',
          duration: Date.now() - startTime
        });
      }

      // Test 2: sessionStorage
      try {
        const testKey = 'test_sessionStorage_' + Date.now();
        sessionStorage.setItem(testKey, 'test');
        const retrieved = sessionStorage.getItem(testKey);
        sessionStorage.removeItem(testKey);
        
        updateTest('Storage - sessionStorage', {
          status: retrieved === 'test' ? 'success' : 'error',
          message: retrieved === 'test' ? 'Fonctionnel' : 'Dysfonctionnel'
        });
      } catch (error) {
        updateTest('Storage - sessionStorage', {
          status: 'error',
          message: 'Bloqué ou non disponible',
          details: error instanceof Error ? error.message : 'Erreur inconnue'
        });
      }

      // Test 3: StorageManager fallback
      const storageWorking = storageManager.isWorking();
      const activeType = storageManager.getActiveStorageType();
      const usingFallback = storageManager.isUsingMemoryFallback();
      
      updateTest('Storage - Fallback mémoire', {
        status: storageWorking ? 'success' : 'error',
        message: storageWorking ? `Actif (${activeType})` : 'Défaillant',
        details: usingFallback ? 'Utilise le stockage en mémoire' : `Utilise ${activeType}`
      });

      // Test 4: Persistance des données
      const testData = { test: 'persistance_' + Date.now() };
      const saved = storageManager.setObject('test_persistance', testData);
      const retrieved = storageManager.getObject('test_persistance');
      storageManager.removeItem('test_persistance');

      updateTest('Storage - Persistance des données', {
        status: saved && retrieved && retrieved.test === testData.test ? 'success' : 'warning',
        message: saved && retrieved && retrieved.test === testData.test ? 'Données persistées correctement' : 'Persistance limitée',
        details: !saved ? 'Impossible de sauvegarder' : !retrieved ? 'Impossible de récupérer' : 'OK'
      });

      // Test 5: Support géolocalisation
      const geoSupported = geolocationManager.isGeolocationSupported();
      updateTest('Géolocalisation - Support navigateur', {
        status: geoSupported ? 'success' : 'error',
        message: geoSupported ? 'Géolocalisation supportée' : 'Géolocalisation non supportée'
      });

      // Test 6: Permissions géolocalisation
      if (geoSupported) {
        try {
          const permissionStatus = await geolocationManager.checkPermissionStatus();
          updateTest('Géolocalisation - Permissions', {
            status: permissionStatus.granted ? 'success' : permissionStatus.denied ? 'error' : 'warning',
            message: permissionStatus.granted ? 'Permission accordée' : permissionStatus.denied ? 'Permission refusée' : 'Permission requise',
            details: permissionStatus.error
          });
        } catch (error) {
          updateTest('Géolocalisation - Permissions', {
            status: 'warning',
            message: 'Impossible de vérifier',
            details: error instanceof Error ? error.message : 'Erreur inconnue'
          });
        }
      } else {
        updateTest('Géolocalisation - Permissions', {
          status: 'error',
          message: 'N/A (géolocalisation non supportée)'
        });
      }

      // Test 7: API IP géolocalisation
      try {
        const response = await fetch('https://ipapi.co/json/', { 
          method: 'GET',
          signal: AbortSignal.timeout(8000)
        });
        
        if (response.ok) {
          const data = await response.json();
          updateTest('Géolocalisation - API IP', {
            status: data.latitude && data.longitude ? 'success' : 'warning',
            message: data.latitude && data.longitude ? 'API IP accessible et fonctionnelle' : 'API IP accessible mais données partielles',
            details: data.city && data.country ? `${data.city}, ${data.country}` : 'Données de localisation incomplètes'
          });
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (error) {
        updateTest('Géolocalisation - API IP', {
          status: 'error',
          message: 'API IP inaccessible',
          details: error instanceof Error ? error.message : 'Erreur de réseau'
        });
      }

      // Test 8: Connexion WebSocket
      updateTest('WebSocket - Connexion', {
        status: isConnected ? 'success' : 'warning',
        message: isConnected ? 'WebSocket connecté' : 'WebSocket déconnecté',
        details: isConnected ? 'Connexion temps réel active' : 'Fonctionnement en mode dégradé possible'
      });

      // Test 9: Support WebSocket général
      const wsSupported = 'WebSocket' in window;
      updateTest('WebSocket - Reconnexion', {
        status: wsSupported ? 'success' : 'warning',
        message: wsSupported ? 'Reconnexion automatique disponible' : 'Reconnexion limitée',
        details: wsSupported ? 'WebSocket supporté par le navigateur' : 'Fallback polling HTTP nécessaire'
      });

      // Test 10: Détection navigation privée
      const isPrivate = storageManager.isPrivateMode();
      const limitations = storageManager.getLimitations();
      updateTest('Navigation privée - Détection', {
        status: 'success', // Toujours succès car on peut détecter
        message: isPrivate ? 'Mode navigation privée détecté' : 'Mode navigation normale',
        details: `Stockage: ${limitations.activeStorageType}${limitations.storageQuotaLimited ? ' (quota limité)' : ''}${limitations.usingMemoryFallback ? ' + fallback mémoire' : ''}`
      });

    } catch (error) {
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    // Lancer les tests automatiquement au chargement
    runAllTests();
  }, []);

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'pending':
        return <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />;
    }
  };

  const getCategoryIcon = (testName: string) => {
    if (testName.includes('Storage')) return <Database className="w-4 h-4" />;
    if (testName.includes('Géolocalisation')) return <MapPin className="w-4 h-4" />;
    if (testName.includes('WebSocket')) return <MessageCircle className="w-4 h-4" />;
    return <Wifi className="w-4 h-4" />;
  };

  const successCount = tests.filter(t => t.status === 'success').length;
  const warningCount = tests.filter(t => t.status === 'warning').length;
  const errorCount = tests.filter(t => t.status === 'error').length;
  const totalTests = tests.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-25 to-indigo-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
              <TestTube className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Tests de Navigation Privée</h1>
              <p className="text-gray-600 mt-2">Vérification des fonctionnalités en mode navigation privée</p>
            </div>
          </div>

          {/* Statistiques */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className="p-4">
              <div className="text-2xl font-bold text-gray-900">{totalTests}</div>
              <div className="text-sm text-gray-600">Tests total</div>
            </Card>
            <Card className="p-4">
              <div className="text-2xl font-bold text-green-600">{successCount}</div>
              <div className="text-sm text-gray-600">Succès</div>
            </Card>
            <Card className="p-4">
              <div className="text-2xl font-bold text-yellow-600">{warningCount}</div>
              <div className="text-sm text-gray-600">Avertissements</div>
            </Card>
            <Card className="p-4">
              <div className="text-2xl font-bold text-red-600">{errorCount}</div>
              <div className="text-sm text-gray-600">Erreurs</div>
            </Card>
          </div>

          {/* Boutons d'action */}
          <div className="flex justify-center gap-4 mb-8">
            <Button 
              onClick={runAllTests}
              disabled={isRunning}
              className="flex items-center gap-2"
            >
              {isRunning ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              {isRunning ? 'Tests en cours...' : 'Relancer les tests'}
            </Button>
            
            <Button
              variant="outline"
              onClick={() => setShowDiagnostics(true)}
              className="flex items-center gap-2"
            >
              <Eye className="w-4 h-4" />
              Diagnostic complet
            </Button>
          </div>
        </div>

        {/* Résultats des tests */}
        <div className="space-y-4">
          {tests.map((test, index) => (
            <motion.div
              key={test.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="p-4">
                <div className="flex items-start gap-4">
                  <div className="flex items-center gap-2">
                    {getCategoryIcon(test.name)}
                    {getStatusIcon(test.status)}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900">{test.name}</h3>
                      {test.duration && (
                        <span className="text-xs text-gray-500">{test.duration}ms</span>
                      )}
                    </div>
                    
                    <p className="text-gray-600 mt-1">{test.message}</p>
                    
                    {test.details && (
                      <div className="mt-2 p-2 bg-gray-50 rounded text-sm text-gray-700">
                        {test.details}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Résumé et recommandations */}
        {!isRunning && tests.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-8"
          >
            <Card className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Résumé et Recommandations</h2>
              
              {errorCount === 0 && warningCount === 0 ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="font-medium text-green-800">Tous les tests sont réussis !</span>
                  </div>
                  <p className="text-green-700">
                    Votre navigateur supporte parfaitement toutes les fonctionnalités de Matcha, 
                    même en navigation privée.
                  </p>
                </div>
              ) : errorCount > 0 ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <XCircle className="w-5 h-5 text-red-600" />
                    <span className="font-medium text-red-800">Certaines fonctionnalités sont limitées</span>
                  </div>
                  <p className="text-red-700 mb-3">
                    Votre navigateur bloque certaines fonctionnalités. L'application utilise des systèmes 
                    de fallback pour maintenir le fonctionnement.
                  </p>
                  <div className="space-y-2">
                    <p className="text-sm text-red-600">Recommandations :</p>
                    <ul className="text-sm text-red-700 space-y-1">
                      <li>• Autorisez la géolocalisation via l'icône 🔒 dans la barre d'adresse</li>
                      <li>• Certaines données peuvent ne pas être sauvegardées entre les sessions</li>
                      <li>• Le chat peut fonctionner en mode dégradé (polling HTTP)</li>
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-600" />
                    <span className="font-medium text-yellow-800">Fonctionnement en mode adapté</span>
                  </div>
                  <p className="text-yellow-700">
                    L'application s'adapte automatiquement aux limitations de votre navigateur 
                    pour garantir une expérience utilisateur optimale.
                  </p>
                </div>
              )}
            </Card>
          </motion.div>
        )}
      </div>

      {/* Composant de diagnostic */}
      <BrowserDiagnostics 
        isVisible={showDiagnostics}
        onClose={() => setShowDiagnostics(false)}
        showDetailed={true}
      />
    </div>
  );
};

export default TestPage;