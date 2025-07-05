import React from 'react';
import { motion } from 'framer-motion';
import { Heart, MapPin, MessageCircle, Star, Users, Zap, Target, Eye, Edit } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useProfileCompletion } from '../../hooks/useProfileCompletion';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

export const UserDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { completionPercentage, isLoading: profileLoading } = useProfileCompletion();

  // Données fictives pour le design
  const stats = {
    likes: 42,
    matches: 18,
    messages: 7,
    visits: 156
  };

  const recentMatches = [
    { id: 1, name: "Sophie", age: 25, image: "https://images.unsplash.com/photo-1494790108755-2616b0c8aa2c?w=100&h=100&fit=crop&crop=face" },
    { id: 2, name: "Marie", age: 28, image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face" },
    { id: 3, name: "Julie", age: 24, image: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop&crop=face" }
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Welcome Section améliorée */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-8"
      >
        <Card className="bg-gradient-to-r from-primary/10 via-sunset/5 to-peach/10 border-0 shadow-xl overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent"></div>
          <CardContent className="p-8 relative">
            <div className="flex items-center justify-between">
              <div>
                <motion.h2 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-4xl font-display font-bold text-twilight mb-3"
                >
                  Bonjour {user?.first_name || user?.username} ! 
                  <motion.span 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.4, type: "spring" }}
                    className="inline-block ml-2"
                  >
                    👋
                  </motion.span>
                </motion.h2>
                <motion.p 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-twilight/70 text-lg mb-4"
                >
                  Prêt(e) à faire de nouvelles rencontres aujourd'hui ?
                </motion.p>
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="flex gap-3"
                >
                  <Button className="bg-peach-gradient hover:shadow-lg transition-all duration-200">
                    <Zap className="w-4 h-4 mr-2" />
                    Commencer à matcher
                  </Button>
                  <Button variant="outline" className="border-primary/30 text-primary hover:bg-primary/5">
                    <Target className="w-4 h-4 mr-2" />
                    Découvrir des profils
                  </Button>
                </motion.div>
              </div>
              <motion.div 
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.5, type: "spring" }}
                className="hidden md:block"
              >
                <div className="w-24 h-24 bg-peach-gradient rounded-full flex items-center justify-center shadow-2xl relative">
                  <Heart className="w-12 h-12 text-white" fill="currentColor" />
                  <div className="absolute inset-0 bg-white/20 rounded-full animate-ping"></div>
                </div>
              </motion.div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Stats Cards améliorées */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8"
      >
        {[
          { icon: Heart, value: stats.likes, label: "Likes reçus", color: "text-primary", bgColor: "bg-primary/10" },
          { icon: Star, value: stats.matches, label: "Matches", color: "text-sunset", bgColor: "bg-sunset/10" },
          { icon: MessageCircle, value: stats.messages, label: "Messages", color: "text-accent", bgColor: "bg-accent/10" },
          { icon: MapPin, value: stats.visits, label: "Visites", color: "text-blue-600", bgColor: "bg-blue-50" }
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * index }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Card className="text-center hover:shadow-lg transition-all duration-300 border-0 bg-white/80 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className={`w-12 h-12 ${stat.bgColor} rounded-full mx-auto mb-4 flex items-center justify-center`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} fill={stat.icon === Heart || stat.icon === Star ? "currentColor" : "none"} />
                </div>
                <div className="text-3xl font-bold text-twilight mb-1">{stat.value}</div>
                <div className="text-sm text-twilight/60 font-medium">{stat.label}</div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Profile Section améliorée */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-1"
        >
          <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-primary/5 to-sunset/5 border-b border-primary/10">
              <CardTitle className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-primary" fill="currentColor" />
                Mon Profil
              </CardTitle>
              <CardDescription>
                Complétez votre profil pour maximiser vos chances
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="text-center">
                <motion.div 
                  whileHover={{ scale: 1.05 }}
                  className="w-28 h-28 bg-peach-gradient rounded-full mx-auto mb-4 flex items-center justify-center shadow-xl cursor-pointer relative"
                >
                  <span className="text-3xl font-bold text-white">
                    {user?.first_name?.charAt(0) || user?.username?.charAt(0) || 'U'}
                  </span>
                </motion.div>
                <h3 className="font-display font-semibold text-twilight text-xl mb-1">
                  {user?.first_name} {user?.last_name}
                </h3>
                <p className="text-twilight/60 mb-4">@{user?.username}</p>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-twilight/60">Profil complété</span>
                  <span className="text-primary font-medium">
                    {profileLoading ? '...' : `${completionPercentage}%`}
                  </span>
                </div>
                <div className="w-full bg-secondary/30 rounded-full h-3 overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: profileLoading ? "0%" : `${completionPercentage}%` }}
                    transition={{ delay: 0.5, duration: 1 }}
                    className="bg-peach-gradient h-3 rounded-full"
                  ></motion.div>
                </div>
              </div>

              <div className="space-y-2">
                <Button 
                  onClick={() => navigate('/profile')}
                  variant="outline"
                  className="w-full border-primary/30 text-primary hover:bg-primary/5"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Voir mon profil public
                </Button>
                
                <Button 
                  onClick={() => navigate('/profile-edit')}
                  className="w-full bg-gradient-to-r from-primary to-sunset hover:shadow-lg transition-all duration-200"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Modifier mon profil
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Matches récents améliorés */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-2"
        >
          <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
            <CardHeader className="bg-gradient-to-r from-sunset/5 to-peach/5 border-b border-primary/10">
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-sunset" />
                Matches récents
              </CardTitle>
              <CardDescription>
                Vos nouvelles connexions vous attendent
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {recentMatches.map((match, index) => (
                  <motion.div
                    key={match.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 * index }}
                    whileHover={{ scale: 1.05 }}
                    className="bg-gradient-to-br from-primary/5 to-sunset/5 p-4 rounded-xl text-center border border-primary/10 hover:shadow-md transition-all duration-200 cursor-pointer"
                  >
                    <img 
                      src={match.image} 
                      alt={match.name}
                      className="w-16 h-16 rounded-full mx-auto mb-3 object-cover shadow-lg"
                    />
                    <h4 className="font-semibold text-twilight">{match.name}</h4>
                    <p className="text-sm text-twilight/60">{match.age} ans</p>
                    <Button size="sm" variant="ghost" className="mt-2 text-primary hover:bg-primary/10">
                      <MessageCircle className="w-4 h-4 mr-1" />
                      Message
                    </Button>
                  </motion.div>
                ))}
              </div>
              
              <div className="mt-6 text-center">
                <Button variant="outline" className="border-primary/30 text-primary hover:bg-primary/5">
                  Voir tous les matches
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default UserDashboard; 