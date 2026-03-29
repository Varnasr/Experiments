import React, { useState, useEffect } from 'react';
import { Award, Target, Users, TrendingUp } from 'lucide-react';

const ProgressTracker = ({ visitedSections = [], currentSection = '', assessmentCompleted = false }) => {
  const [showBadges, setShowBadges] = useState(false);
  const [achievements, setAchievements] = useState([]);

  const allSections = [
    'overview', 'comparison', 'budget', 'healthcare', 
    'education', 'rural-urban', 'poverty-trap', 'sources'
  ];

  const totalSections = allSections.length;
  const completedSections = visitedSections.length;
  const progressPercentage = (completedSections / totalSections) * 100;

  // Check for new achievements
  useEffect(() => {
    const newAchievements = [];

    if (assessmentCompleted && !achievements.includes('reality-seeker')) {
      newAchievements.push({
        id: 'reality-seeker',
        title: 'Reality Seeker',
        description: 'Completed the income assessment',
        icon: <Target className="w-6 h-6 text-blue-400" />,
        color: 'blue'
      });
    }

    if (visitedSections.includes('comparison') && !achievements.includes('privilege-aware')) {
      newAchievements.push({
        id: 'privilege-aware',
        title: 'Privilege Aware',
        description: 'Used the income comparison tool',
        icon: <Users className="w-6 h-6 text-purple-400" />,
        color: 'purple'
      });
    }

    if (completedSections >= 4 && !achievements.includes('explorer')) {
      newAchievements.push({
        id: 'explorer',
        title: 'Data Explorer',
        description: 'Explored multiple inequality aspects',
        icon: <TrendingUp className="w-6 h-6 text-green-400" />,
        color: 'green'
      });
    }

    if (completedSections === totalSections && !achievements.includes('champion')) {
      newAchievements.push({
        id: 'champion',
        title: 'Awareness Champion',
        description: 'Explored all sections - truly committed to understanding!',
        icon: <Award className="w-6 h-6 text-amber-400" />,
        color: 'amber'
      });
    }

    if (newAchievements.length > 0) {
      setAchievements(prev => [...prev, ...newAchievements]);
      setShowBadges(true);
      
      // Auto-hide after 4 seconds
      setTimeout(() => setShowBadges(false), 4000);
    }
  }, [visitedSections, assessmentCompleted, achievements, completedSections, totalSections]);

  // Save progress to localStorage
  useEffect(() => {
    localStorage.setItem('realMiddleProgress', JSON.stringify({
      visitedSections,
      achievements,
      assessmentCompleted
    }));
  }, [visitedSections, achievements, assessmentCompleted]);

  return (
    <>
      {/* Floating Progress Indicator */}
      <div className="fixed top-4 left-4 z-30 bg-slate-800/90 backdrop-blur-sm border border-slate-600 rounded-lg p-3 shadow-lg">
        <div className="flex items-center space-x-3">
          {/* Gullak (Traditional Indian Money Pot) */}
          <div className="relative w-8 h-8">
            <svg viewBox="0 0 32 32" className="w-full h-full">
              {/* Gullak pot outline */}
              <path
                d="M8 12 C8 8, 12 6, 16 6 C20 6, 24 8, 24 12 L24 22 C24 25, 21 28, 16 28 C11 28, 8 25, 8 22 Z"
                fill="#64748b"
                stroke="#475569"
                strokeWidth="1"
              />
              
              {/* Coin slot */}
              <rect x="14" y="4" width="4" height="2" rx="1" fill="#334155" />
              
              {/* Fill based on progress */}
              <defs>
                <clipPath id="gullak-clip">
                  <path d="M8 12 C8 8, 12 6, 16 6 C20 6, 24 8, 24 12 L24 22 C24 25, 21 28, 16 28 C11 28, 8 25, 8 22 Z" />
                </clipPath>
              </defs>
              
              {/* Animated fill */}
              <rect
                x="8"
                y={28 - (progressPercentage / 100) * 16}
                width="16"
                height={(progressPercentage / 100) * 16}
                fill="url(#gullak-gradient)"
                clipPath="url(#gullak-clip)"
                className="transition-all duration-500 ease-out"
              />
              
              {/* Gradient definition */}
              <defs>
                <linearGradient id="gullak-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#fbbf24" />
                  <stop offset="50%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#d97706" />
                </linearGradient>
              </defs>
              
              {/* Rupee symbol when filled */}
              {progressPercentage > 50 && (
                <text x="16" y="20" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">₹</text>
              )}
            </svg>
            
            {/* Overflow coins animation */}
            {progressPercentage === 100 && (
              <div className="absolute -top-1 -right-1">
                <div className="w-3 h-3 bg-amber-400 rounded-full animate-bounce"></div>
              </div>
            )}
          </div>
          
          {/* Progress text */}
          <div className="text-xs">
            <div className="text-white font-medium">
              {completedSections}/{totalSections} explored
            </div>
            <div className="text-slate-400">
              {Math.round(progressPercentage)}% complete
            </div>
          </div>
        </div>
      </div>

      {/* Achievement Notifications */}
      {showBadges && achievements.length > 0 && (
        <div className="fixed top-20 left-4 z-40 space-y-2">
          {achievements.slice(-2).map((achievement) => (
            <div
              key={achievement.id}
              className="bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-lg animate-slide-in-left max-w-xs"
            >
              <div className="flex items-center space-x-3">
                <div className={`bg-${achievement.color}-500/20 rounded-full p-2`}>
                  {achievement.icon}
                </div>
                <div>
                  <div className="text-white font-medium text-sm">{achievement.title}</div>
                  <div className="text-slate-400 text-xs">{achievement.description}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Completion Celebration */}
      {progressPercentage === 100 && (
        <div className="fixed inset-0 pointer-events-none z-20">
          {/* Rupee coins falling animation */}
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute text-2xl animate-bounce"
              style={{
                left: `${10 + i * 10}%`,
                animationDelay: `${i * 0.2}s`,
                animationDuration: '3s'
              }}
            >
              ₹
            </div>
          ))}
        </div>
      )}
    </>
  );
};

export default ProgressTracker;