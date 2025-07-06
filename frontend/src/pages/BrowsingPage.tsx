import React from 'react';
import { apiService } from '../services/api';

const BrowsingPage: React.FC = () => {

  const handleHealthCheck = async () => {
    try {
      const response = await apiService.healthCheck();
      alert(`✅ Connexion API réussie: ${response.message}`);
    } catch (err: any) {
      console.error("Erreur de connexion API:", err);
      alert(`❌ Erreur de connexion API: ${err.message}`);
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Page de débogage de la connexion</h1>
      <p>Cette page sert à vérifier la communication entre le frontend et le backend.</p>
      <div style={{ marginTop: '1rem' }}>
        <button 
          onClick={handleHealthCheck}
          style={{ 
            backgroundColor: '#3b82f6', 
            color: 'white', 
            fontWeight: 'bold', 
            padding: '0.5rem 1rem', 
            borderRadius: '0.25rem' 
          }}
        >
          Tester la Connexion API
        </button>
      </div>
    </div>
  );
}; 

export default BrowsingPage; 