import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Flag, Settings2 } from 'lucide-react';
import { BlockedUsersList } from './BlockedUsersList';
import { ReportedUsersList } from './ReportedUsersList';

interface UserManagementSectionProps {
  limit?: number;
  compact?: boolean;
}

type TabType = 'blocked' | 'reported';

export const UserManagementSection: React.FC<UserManagementSectionProps> = ({
  limit = 20,
  compact = false
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('blocked');

  const tabs = [
    {
      id: 'blocked' as TabType,
      label: 'Utilisateurs bloqués',
      icon: Shield,
      color: 'text-red-500',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      description: 'Gérer les utilisateurs que vous avez bloqués'
    },
    {
      id: 'reported' as TabType,
      label: 'Utilisateurs signalés',
      icon: Flag,
      color: 'text-orange-500',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      description: 'Voir les utilisateurs que vous avez signalés'
    }
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header avec titre principal */}
      <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-primary/10 to-sunset/10 rounded-xl flex items-center justify-center">
            <Settings2 className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-twilight">Gestion des utilisateurs</h2>
            <p className="text-sm text-twilight/60">
              Gérez les utilisateurs bloqués et signalés
            </p>
          </div>
        </div>
      </div>

      {/* Navigation par onglets */}
      <div className="flex border-b border-gray-200 bg-gray-50">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const IconComponent = tab.icon;
          
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex-1 relative px-6 py-4 text-sm font-medium transition-all duration-200
                ${isActive 
                  ? `bg-white text-twilight border-b-2 border-primary` 
                  : `text-twilight/60 hover:text-twilight hover:bg-white/50`
                }
              `}
            >
              <div className="flex items-center justify-center gap-3">
                <IconComponent 
                  className={`w-4 h-4 ${isActive ? tab.color : 'text-twilight/40'}`} 
                />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">
                  {tab.id === 'blocked' ? 'Bloqués' : 'Signalés'}
                </span>
              </div>
              
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-white"
                  style={{ zIndex: -1 }}
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Description de l'onglet actif */}
      <div className={`px-6 py-3 ${tabs.find(t => t.id === activeTab)?.bgColor} border-b border-gray-100`}>
        <p className="text-sm text-twilight/70">
          {tabs.find(t => t.id === activeTab)?.description}
        </p>
      </div>

      {/* Contenu des onglets */}
      <div className="p-6">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab === 'blocked' && (
            <BlockedUsersList 
              limit={limit} 
              showHeader={false} 
              compact={compact} 
            />
          )}
          
          {activeTab === 'reported' && (
            <ReportedUsersList 
              limit={limit} 
              showHeader={false} 
              compact={compact} 
            />
          )}
        </motion.div>
      </div>
    </div>
  );
};