import React from 'react';
import { motion } from 'framer-motion';
import ConversationsList from '../components/chat/ConversationsList';

const ConversationsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-orange-50 p-4">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-3xl font-bold text-twilight mb-2">
            Mes Conversations
          </h1>
          <p className="text-twilight/70">
            Discutez avec vos matchs en temps réel
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <ConversationsList className="max-w-2xl mx-auto" />
        </motion.div>
      </div>
    </div>
  );
};

export default ConversationsPage;