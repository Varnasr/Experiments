import React, { useState, useEffect } from 'react';
import { X, ArrowRight, Play, Users, TrendingUp, DollarSign } from 'lucide-react';

const GuidedTour = ({ onComplete, onSkip }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if tour was already completed
    const tourCompleted = localStorage.getItem('realMiddleTourCompleted');
    if (!tourCompleted) {
      setIsVisible(true);
    }
  }, []);

  const tourSteps = [
    {
      title: "Welcome to The Real Middle",
      subtitle: "A Journey of Economic Discovery",
      description: "Discover where you really stand in India's income distribution. Most people are surprised by the reality!",
      icon: <TrendingUp className="w-12 h-12 text-amber-400" />,
      pattern: "mandala"
    },
    {
      title: "Step 1: Self Perception",
      subtitle: "What class do you think you belong to?",
      description: "Start by telling us which economic class you identify with. This is just your perception - we'll reveal the reality later!",
      icon: <Users className="w-12 h-12 text-blue-400" />,
      pattern: "ikat"
    },
    {
      title: "Step 2: Financial Details",
      subtitle: "Share your income information",
      description: "Provide your monthly income and other financial details. This data stays completely private and is used only for your analysis.",
      icon: <DollarSign className="w-12 h-12 text-green-400" />,
      pattern: "block-print"
    },
    {
      title: "Step 3: The Reality Check",
      subtitle: "Discover where you actually stand",
      description: "Get your real economic position with surprising insights about inequality in India. Then explore 8 different aspects of economic disparity.",
      icon: <Play className="w-12 h-12 text-purple-400" />,
      pattern: "paisley"
    },
    {
      title: "Ready to Begin?",
      subtitle: "Let's unveil the real middle class in India",
      description: "Your journey to understanding income inequality starts now. Remember: understanding privilege is the first step toward building a more equitable society.",
      icon: <TrendingUp className="w-12 h-12 text-amber-400" />,
      pattern: "mandala"
    }
  ];

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeTour();
    }
  };

  const completeTour = () => {
    localStorage.setItem('realMiddleTourCompleted', 'true');
    setIsVisible(false);
    onComplete();
  };

  const skipTour = () => {
    localStorage.setItem('realMiddleTourCompleted', 'true');
    setIsVisible(false);
    onSkip();
  };

  if (!isVisible) return null;

  const currentStepData = tourSteps[currentStep];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-2xl border border-slate-600 max-w-lg w-full relative overflow-hidden shadow-2xl">
        {/* Indian Pattern Background */}
        <div className={`absolute inset-0 opacity-5 pattern-${currentStepData.pattern}`}></div>
        
        {/* Skip Button */}
        <button
          onClick={skipTour}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Content */}
        <div className="relative p-8 text-center">
          {/* Progress Indicator */}
          <div className="flex justify-center mb-6">
            <div className="flex space-x-2">
              {tourSteps.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                    index <= currentStep ? 'bg-amber-400' : 'bg-slate-600'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="bg-slate-700/50 rounded-full p-4 border border-slate-600">
              {currentStepData.icon}
            </div>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-white mb-2">
            {currentStepData.title}
          </h2>

          {/* Subtitle */}
          <h3 className="text-lg text-amber-300 mb-4 font-medium">
            {currentStepData.subtitle}
          </h3>

          {/* Description */}
          <p className="text-slate-300 mb-8 leading-relaxed">
            {currentStepData.description}
          </p>

          {/* Navigation */}
          <div className="flex justify-between items-center">
            <div className="text-slate-400 text-sm">
              {currentStep + 1} of {tourSteps.length}
            </div>
            
            <div className="flex gap-3">
              {currentStep > 0 && (
                <button
                  onClick={() => setCurrentStep(currentStep - 1)}
                  className="px-4 py-2 text-slate-300 hover:text-white transition-colors"
                >
                  Back
                </button>
              )}
              
              <button
                onClick={handleNext}
                className="bg-amber-600 hover:bg-amber-700 text-white font-medium px-6 py-2 rounded-lg transition-colors flex items-center gap-2"
              >
                {currentStep === tourSteps.length - 1 ? (
                  <>Start Journey</>
                ) : (
                  <>Next <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Decorative Border */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-orange-500 to-red-500"></div>
      </div>
    </div>
  );
};

export default GuidedTour;