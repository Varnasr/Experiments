import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, Users, DollarSign, AlertCircle, BookOpen, Heart, MapPin, ArrowLeftRight } from 'lucide-react';

// Import components
import BudgetChallenge from './components/BudgetChallenge';
import HealthcareCostScenarios from './components/HealthcareCosts';
import EducationCostBarriers from './components/EducationBarriers';
import RuralUrbanComparison from './components/RuralUrbanComparison';
import IntergenerationalPovertyTrap from './components/IntergenerationalPoverty';
import IncomeComparison from './components/IncomeComparison';
import DataSources from './components/DataSources';
import GuidedTour from './components/GuidedTour';
import PWAInstall from './components/PWAInstall';
import ProgressTracker from './components/ProgressTracker';
import ThemeToggle from './components/ThemeToggle';

function App() {
  const [step, setStep] = useState(1);
  const [currentFeature, setCurrentFeature] = useState('overview');
  const [userData, setUserData] = useState({
    monthlyIncome: '',
    savings: '',
    disposableIncome: '',
    expenditure: '',
    debt: '',
    perception: ''
  });
  const [results, setResults] = useState(null);
  const [showReveal, setShowReveal] = useState(false);
  const [visitedSections, setVisitedSections] = useState(['overview']);
  const [showCelebration, setShowCelebration] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Latest 2023-24 Indian income distribution data
  const incomeDistribution = [
    { bracket: 'Below ₹3k', population: 27.5, color: '#dc2626', min: 0, max: 3000, description: 'Extreme poverty line' },
    { bracket: '₹3k-9k', population: 22.5, color: '#ea580c', min: 3000, max: 9000, description: 'Below median income' },
    { bracket: '₹9k-15k', population: 28, color: '#d97706', min: 9000, max: 15000, description: 'Around median income' },
    { bracket: '₹15k-25k', population: 12, color: '#eab308', min: 15000, max: 25000, description: 'Lower middle class' },
    { bracket: '₹25k-50k', population: 7, color: '#65a30d', min: 25000, max: 50000, description: 'Middle class' },
    { bracket: '₹50k-1L', population: 2.3, color: '#059669', min: 50000, max: 100000, description: 'Upper middle class' },
    { bracket: '₹1L-2L', population: 0.6, color: '#0284c7', min: 100000, max: 200000, description: 'Upper class' },
    { bracket: '₹2L+', population: 0.1, color: '#7c3aed', min: 200000, max: Infinity, description: 'Elite/Ultra rich' }
  ];

  // Error boundary effect
  useEffect(() => {
    const handleError = (error) => {
      console.error('App error caught:', error);
      setHasError(true);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleError);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleError);
    };
  }, []);

  // Load saved progress
  useEffect(() => {
    try {
      const savedProgress = localStorage.getItem('realMiddleProgress');
      if (savedProgress) {
        const progress = JSON.parse(savedProgress);
        setVisitedSections(progress.visitedSections || ['overview']);
      }

      // Register service worker for PWA with error handling
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
          .then((registration) => {
            console.log('SW registered successfully');
          })
          .catch((registrationError) => {
            console.log('SW registration failed, continuing without PWA features');
          });
      }
    } catch (error) {
      console.error('Error loading saved data:', error);
    }
  }, []);

  // Track section visits with error handling
  useEffect(() => {
    try {
      if (currentFeature && !visitedSections.includes(currentFeature)) {
        setVisitedSections(prev => [...prev, currentFeature]);
      }
    } catch (error) {
      console.error('Error tracking section visit:', error);
    }
  }, [currentFeature, visitedSections]);

  const calculatePercentile = (income) => {
    try {
      let percentile = 0;
      for (let bracket of incomeDistribution) {
        if (income > bracket.max) {
          percentile += bracket.population;
        } else if (income >= bracket.min) {
          const position = (income - bracket.min) / (bracket.max - bracket.min);
          percentile += bracket.population * position;
          break;
        } else {
          break;
        }
      }
      return Math.min(percentile, 99.9);
    } catch (error) {
      console.error('Error calculating percentile:', error);
      return 50; // Default fallback
    }
  };

  const getUserBracket = (income) => {
    try {
      for (let bracket of incomeDistribution) {
        if (income >= bracket.min && income < bracket.max) {
          return bracket;
        }
      }
      return incomeDistribution[incomeDistribution.length - 1];
    } catch (error) {
      console.error('Error getting user bracket:', error);
      return incomeDistribution[4]; // Default to middle bracket
    }
  };

  const getClassLabel = (percentile) => {
    try {
      if (percentile < 27.5) return { label: 'Below Poverty Line', color: '#dc2626' };
      if (percentile < 50) return { label: 'Lower Income', color: '#ea580c' };
      if (percentile < 78) return { label: 'Lower Middle Class', color: '#d97706' };
      if (percentile < 90) return { label: 'Middle Class', color: '#eab308' };
      if (percentile < 97) return { label: 'Upper Middle Class', color: '#059669' };
      if (percentile < 99.4) return { label: 'Upper Class', color: '#0284c7' };
      return { label: 'Elite/Ultra Rich', color: '#7c3aed' };
    } catch (error) {
      console.error('Error getting class label:', error);
      return { label: 'Middle Class', color: '#eab308' };
    }
  };

  const handleInputChange = (field, value) => {
    try {
      setUserData(prev => ({ ...prev, [field]: value }));
    } catch (error) {
      console.error('Error updating user data:', error);
    }
  };

  const calculateResults = () => {
    try {
      const income = parseInt(userData.monthlyIncome);
      if (isNaN(income) || income <= 0) {
        alert('Please enter a valid income amount');
        return;
      }

      const percentile = calculatePercentile(income);
      const bracket = getUserBracket(income);
      const classInfo = getClassLabel(percentile);
      
      const populationAbove = 100 - percentile;
      const peopleAbove = Math.round((populationAbove / 100) * 1440000000);
      
      setResults({
        income,
        percentile,
        bracket,
        classInfo,
        populationAbove,
        peopleAbove,
        isReallyMiddleClass: percentile >= 50 && percentile < 90,
        surpriseFacts: generateSurpriseFacts(income, percentile)
      });
      
      // Mark assessment as completed
      localStorage.setItem('realMiddleAssessmentCompleted', 'true');
      setStep(3);

      // Show celebration for significant revelations
      if (income >= 25000 && userData.perception === 'Middle Class') {
        setShowCelebration(true);
        setTimeout(() => setShowCelebration(false), 3000);
      }
    } catch (error) {
      console.error('Error calculating results:', error);
      alert('There was an error processing your data. Please try again.');
    }
  };

  const generateSurpriseFacts = (income, percentile) => {
    try {
      const facts = [];
      
      if (income >= 3000 && percentile > 27.5) {
        facts.push(`You earn more than ${(27.5).toFixed(1)}% of Indians (above extreme poverty line)`);
      }
      
      if (income >= 9000 && percentile > 50) {
        facts.push(`Your income is above the median - you earn more than half of all Indians`);
      }
      
      if (income >= 15000 && percentile > 78) {
        facts.push(`You're in the top 22% of income earners in India`);
      }
      
      if (income >= 25000) {
        facts.push(`Your monthly income is higher than what 90% of Indians earn`);
      }
      
      if (income >= 50000) {
        facts.push(`You're in the top 3% - only 43 million Indians earn this much`);
      }
      
      if (income >= 100000) {
        facts.push(`You're in the top 1% of income earners in India`);
      }

      if (income >= 25000 && userData.perception === 'Middle Class') {
        facts.push(`Reality Check: You identify as "middle class" but you're actually in the top 10% of earners`);
      }
      
      if (income >= 50000 && userData.perception.includes('Middle')) {
        facts.push(`Major Reality Check: You're not middle class - you're in the top 3% of all Indians`);
      }

      return facts;
    } catch (error) {
      console.error('Error generating facts:', error);
      return ['Unable to generate insights at this time.'];
    }
  };

  const chartData = incomeDistribution.map((bracket, index) => ({
    ...bracket,
    isUser: results && results.bracket.bracket === bracket.bracket,
    order: index
  }));

  const features = [
    { id: 'overview', name: 'Income Distribution', icon: TrendingUp },
    { id: 'comparison', name: 'Compare Incomes', icon: ArrowLeftRight },
    { id: 'budget', name: 'Budget Challenge', icon: DollarSign },
    { id: 'healthcare', name: 'Healthcare Costs', icon: Heart },
    { id: 'education', name: 'Education Barriers', icon: BookOpen },
    { id: 'rural-urban', name: 'Rural vs Urban', icon: MapPin },
    { id: 'poverty-trap', name: 'Poverty Cycle', icon: Users },
    { id: 'sources', name: 'Data Sources', icon: BookOpen },
  ];

  // Error boundary render
  if (hasError) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <h1 className="text-3xl font-bold text-white mb-4">Oops! Something went wrong</h1>
          <p className="text-slate-300 mb-6">
            We encountered an unexpected error. Please refresh the page to try again.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-primary pattern-mandala transition-all duration-300">
      <div className="max-w-6xl mx-auto p-3 sm:p-6">
        {/* Theme Toggle and PWA Install - Now properly aligned */}
        <ThemeToggle />
        <PWAInstall />

        {/* Guided Tour */}
        <GuidedTour 
          onComplete={() => {}}
          onSkip={() => {}}
        />

        {/* Progress Tracker */}
        {step === 3 && (
          <ProgressTracker 
            visitedSections={visitedSections}
            currentSection={currentFeature}
            assessmentCompleted={!!results}
          />
        )}

        {/* Enhanced Celebration Animation */}
        {showCelebration && (
          <div className="fixed inset-0 pointer-events-none z-30">
            {/* Multiple waves of larger rupee animations */}
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="absolute font-bold rupee-celebration"
                style={{
                  left: `${5 + (i * 4.5)}%`,
                  animationDelay: `${i * 0.15}s`,
                  fontSize: `${2 + Math.random() * 1.5}rem`,
                  color: i % 3 === 0 ? '#f59e0b' : i % 3 === 1 ? '#d97706' : '#fbbf24'
                }}
              >
                ₹
              </div>
            ))}
            
            {/* Central burst effect */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className="text-6xl font-bold text-amber-400 animate-ping">₹</div>
            </div>
            
            {/* Floating success message */}
            <div className="absolute top-1/4 left-1/2 transform -translate-x-1/2 bg-amber-600/90 text-white px-6 py-3 rounded-lg shadow-2xl animate-bounce">
              <div className="text-lg font-bold">Reality Unlocked! 🎉</div>
            </div>
          </div>
        )}

        {/* Enhanced Header */}
        <div className="text-center mb-6 sm:mb-8 relative min-h-[200px] pattern-mandala">
          <div className="absolute inset-0 pattern-ikat opacity-30"></div>
          
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-primary mb-3 sm:mb-4 relative z-10">
            The Real Middle
          </h1>
          <p className="text-lg sm:text-xl text-secondary max-w-3xl mx-auto leading-relaxed px-2 relative z-10">
            Think you're middle class? Discover where you really stand in India's income distribution. 
            An interactive reality check about economic inequality and its impact on Indian society.
          </p>
          
          {/* Enhanced floating rupee animations - Much larger and more visible */}
          <div className="header-rupee-1">₹</div>
          <div className="header-rupee-2">₹</div>
          <div className="header-rupee-3">₹</div>
          <div className="header-rupee-4">₹</div>
          
          {/* Additional decorative rupees */}
          <div className="absolute top-[5%] left-[5%] text-2xl text-amber-300 opacity-40 animate-pulse">₹</div>
          <div className="absolute top-[15%] right-[5%] text-xl text-orange-300 opacity-50 animate-bounce" style={{animationDelay: '1s'}}>₹</div>
          <div className="absolute bottom-[5%] right-[30%] text-lg text-yellow-300 opacity-60 animate-pulse" style={{animationDelay: '2s'}}>₹</div>
          <div className="absolute bottom-[15%] left-[10%] text-xl text-amber-400 opacity-45 animate-bounce" style={{animationDelay: '0.5s'}}>₹</div>
        </div>

        {step === 1 && (
          <div className="card tour-modal">
            <h2 className="text-xl sm:text-2xl font-semibold text-primary mb-4 sm:mb-6 text-center">
              What economic class do you think you belong to?
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
              {['Below Poverty Line', 'Lower Class', 'Lower Middle Class', 'Middle Class', 'Upper Middle Class', 'Upper Class'].map((option) => (
                <button
                  key={option}
                  onClick={() => {
                    handleInputChange('perception', option);
                    setStep(2);
                  }}
                  className="p-3 sm:p-4 card border-2 hover:border-amber-400 transition-all duration-200 font-medium text-primary text-sm sm:text-base pattern-block-print"
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="card tour-modal">
            <h2 className="text-xl sm:text-2xl font-semibold text-primary mb-4 sm:mb-6">
              Please provide your financial details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <label className="block text-sm font-medium mb-2 text-secondary">Monthly Income (₹) *</label>
                <input
                  type="number"
                  value={userData.monthlyIncome}
                  onChange={(e) => handleInputChange('monthlyIncome', e.target.value)}
                  className="input-field text-sm sm:text-base"
                  placeholder="e.g., 75000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-secondary">Monthly Savings (₹)</label>
                <input
                  type="number"
                  value={userData.savings}
                  onChange={(e) => handleInputChange('savings', e.target.value)}
                  className="input-field text-sm sm:text-base"
                  placeholder="e.g., 20000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-secondary">Monthly Disposable Income (₹)</label>
                <input
                  type="number"
                  value={userData.disposableIncome}
                  onChange={(e) => handleInputChange('disposableIncome', e.target.value)}
                  className="input-field text-sm sm:text-base"
                  placeholder="e.g., 25000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-secondary">Monthly Expenditure (₹)</label>
                <input
                  type="number"
                  value={userData.expenditure}
                  onChange={(e) => handleInputChange('expenditure', e.target.value)}
                  className="input-field text-sm sm:text-base"
                  placeholder="e.g., 50000"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2 text-secondary">Monthly Debt/Loan Payments (₹)</label>
                <input
                  type="number"
                  value={userData.debt}
                  onChange={(e) => handleInputChange('debt', e.target.value)}
                  className="input-field text-sm sm:text-base"
                  placeholder="e.g., 15000"
                />
              </div>
            </div>
            <button
              onClick={calculateResults}
              disabled={!userData.monthlyIncome}
              className="w-full mt-4 sm:mt-6 btn-primary disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
            >
              Discover The Real Middle
            </button>
          </div>
        )}

        {step === 3 && results && (
          <div className="space-y-6 sm:space-y-8">
            {/* Results Header */}
            <div className="card achievement-badge">
              <div className="text-center mb-4 sm:mb-6">
                <h2 className="text-2xl sm:text-3xl font-bold text-primary mb-3 sm:mb-4">Your Economic Reality</h2>
                <div className="card px-4 py-2 sm:px-6 sm:py-3 inline-block">
                  <span className="text-sm sm:text-lg text-secondary">You identified as: </span>
                  <span className="font-bold text-lg sm:text-xl text-blue-400">{userData.perception}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
                <div className="text-center p-4 sm:p-6 card pattern-paisley">
                  <TrendingUp className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-4 text-amber-400" />
                  <div className="text-lg sm:text-2xl font-bold mb-1 sm:mb-2" style={{ color: results.classInfo.color }}>
                    {results.classInfo.label}
                  </div>
                  <div className="text-muted text-sm sm:text-base">Your actual class</div>
                </div>
                
                <div className="text-center p-4 sm:p-6 card pattern-paisley">
                  <DollarSign className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-4 text-green-400" />
                  <div className="text-lg sm:text-2xl font-bold text-green-400 mb-1 sm:mb-2">
                    {results.percentile.toFixed(1)}%
                  </div>
                  <div className="text-muted text-sm sm:text-base">Income percentile</div>
                </div>
                
                <div className="text-center p-4 sm:p-6 card pattern-paisley">
                  <Users className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-4 text-blue-400" />
                  <div className="text-lg sm:text-2xl font-bold text-blue-400 mb-1 sm:mb-2">
                    {(results.peopleAbove / 1000000).toFixed(0)}M
                  </div>
                  <div className="text-muted text-sm sm:text-base">Indians earn less than you</div>
                </div>
              </div>

              {!showReveal && (
                <div className="text-center">
                  <button
                    onClick={() => setShowReveal(true)}
                    className="btn-primary text-sm sm:text-base pwa-install-btn"
                  >
                    Show Reality Check
                  </button>
                </div>
              )}

              {showReveal && (
                <div className="bg-amber-900/20 border border-amber-700/50 p-4 sm:p-6 rounded-lg animate-fade-in">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400 mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="text-lg font-semibold text-amber-300 mb-3">The Real Middle Revealed</h3>
                      <div className="space-y-2">
                        {results.surpriseFacts.map((fact, index) => (
                          <div key={index} className="text-secondary font-medium animate-slide-in-up text-sm sm:text-base" style={{animationDelay: `${index * 0.2}s`}}>
                            • {fact}
                          </div>
                        ))}
                        {!results.isReallyMiddleClass && results.percentile > 50 && (
                          <div className="text-amber-200 font-bold text-base sm:text-lg mt-4 p-3 sm:p-4 bg-amber-900/30 rounded border border-amber-600 animate-glow">
                            You're not {userData.perception.toLowerCase()} - you're actually {results.classInfo.label.toLowerCase()}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Feature Navigation */}
            <div className="card">
              <h3 className="text-lg sm:text-xl font-semibold text-primary mb-3 sm:mb-4">Explore Different Aspects of Inequality</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-2 sm:gap-3">
                {features.map((feature) => (
                  <button
                    key={feature.id}
                    onClick={() => setCurrentFeature(feature.id)}
                    className={`p-2 sm:p-3 rounded-lg border transition-all duration-200 ${
                      currentFeature === feature.id
                        ? 'bg-amber-600 border-amber-500 text-white'
                        : 'card border-2 text-secondary hover:border-amber-400'
                    }`}
                  >
                    <feature.icon className="w-4 h-4 sm:w-5 sm:h-5 mx-auto mb-1 sm:mb-2" />
                    <div className="text-xs font-medium">{feature.name}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Feature Content */}
            <div className="card">
              {currentFeature === 'overview' && (
                <>
                  <h3 className="text-xl sm:text-2xl font-semibold text-primary mb-4 sm:mb-6 text-center">
                    India's Income Distribution (2023-24 Data)
                  </h3>
                  <div className="card p-3 sm:p-6 pattern-block-print">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={chartData} margin={{ top: 20, right: 10, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                        <XAxis 
                          dataKey="bracket" 
                          angle={-45}
                          textAnchor="end"
                          height={80}
                          fontSize={10}
                          stroke="var(--text-secondary)"
                        />
                        <YAxis 
                          label={{ value: 'Population %', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: 'var(--text-secondary)' } }}
                          stroke="var(--text-secondary)"
                          fontSize={10}
                        />
                        <Tooltip 
                          formatter={(value) => [`${value}%`, 'Population']}
                          labelStyle={{ color: 'var(--text-primary)' }}
                          contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)', borderRadius: '8px' }}
                        />
                        <Bar dataKey="population" radius={[4, 4, 0, 0]}>
                          {chartData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={entry.isUser ? '#f59e0b' : entry.color}
                              stroke={entry.isUser ? '#d97706' : 'none'}
                              strokeWidth={entry.isUser ? 3 : 0}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="text-center mt-4">
                      {results && (
                        <div className="inline-flex items-center gap-2 bg-amber-600/20 px-3 py-2 rounded-lg border border-amber-600">
                          <div className="w-3 h-3 sm:w-4 sm:h-4 bg-amber-500 rounded"></div>
                          <span className="text-amber-300 font-semibold text-sm sm:text-base">Your Position</span>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {currentFeature === 'comparison' && (
                <>
                  <h3 className="text-xl sm:text-2xl font-semibold text-primary mb-4 sm:mb-6 text-center">Income Comparison</h3>
                  <p className="text-secondary text-center mb-6 sm:mb-8 text-sm sm:text-base">
                    Compare incomes to understand privilege gaps in Indian society.
                  </p>
                  <IncomeComparison userIncome={results?.income} />
                </>
              )}

              {currentFeature === 'budget' && (
                <>
                  <h3 className="text-xl sm:text-2xl font-semibold text-primary mb-4 sm:mb-6 text-center">Budget Challenge</h3>
                  <p className="text-secondary text-center mb-6 sm:mb-8 text-sm sm:text-base">
                    Try to allocate the median Indian income of ₹9,000/month. Can you cover basic survival needs?
                  </p>
                  <BudgetChallenge results={results} />
                </>
              )}

              {currentFeature === 'healthcare' && (
                <>
                  <h3 className="text-xl sm:text-2xl font-semibold text-primary mb-4 sm:mb-6 text-center">Healthcare Cost Reality</h3>
                  <HealthcareCostScenarios userIncome={results?.income} />
                </>
              )}

              {currentFeature === 'education' && (
                <>
                  <h3 className="text-xl sm:text-2xl font-semibold text-primary mb-4 sm:mb-6 text-center">Education Cost Barriers</h3>
                  <EducationCostBarriers />
                </>
              )}

              {currentFeature === 'rural-urban' && (
                <>
                  <h3 className="text-xl sm:text-2xl font-semibold text-primary mb-4 sm:mb-6 text-center">Rural vs Urban Divide</h3>
                  <RuralUrbanComparison />
                </>
              )}

              {currentFeature === 'poverty-trap' && (
                <>
                  <h3 className="text-xl sm:text-2xl font-semibold text-primary mb-4 sm:mb-6 text-center">Breaking the Poverty Cycle</h3>
                  <IntergenerationalPovertyTrap />
                </>
              )}

              {currentFeature === 'sources' && (
                <>
                  <h3 className="text-xl sm:text-2xl font-semibold text-primary mb-4 sm:mb-6 text-center">Data Sources & Methodology</h3>
                  <DataSources />
                </>
              )}
            </div>

            {/* Call to Action */}
            <div className="card text-center pattern-ikat">
              <h3 className="text-xl sm:text-2xl font-semibold text-primary mb-3 sm:mb-4">Understanding Leads to Action</h3>
              <p className="text-secondary mb-4 sm:mb-6 max-w-3xl mx-auto text-sm sm:text-base">
                Income inequality in India is not just statistics—it represents millions of lives limited by circumstances of birth. 
                Understanding your economic position is the first step toward building a more equitable society.
              </p>
              <button
                onClick={() => {
                  setStep(1);
                  setCurrentFeature('overview');
                  setUserData({
                    monthlyIncome: '',
                    savings: '',
                    disposableIncome: '',
                    expenditure: '',
                    debt: '',
                    perception: ''
                  });
                  setResults(null);
                  setShowReveal(false);
                  setVisitedSections(['overview']);
                }}
                className="btn-secondary text-sm sm:text-base"
              >
                Start Over
              </button>
            </div>
          </div>
        )}

        {/* Enhanced Branding Footer with Legal Disclaimer */}
        <footer className="mt-12 sm:mt-16 border-t pt-6 sm:pt-8 pattern-block-print" style={{borderColor: 'var(--border-color)'}}>
          <div className="text-center space-y-4 sm:space-y-6">
            {/* Educational Disclaimer */}
            <div className="bg-amber-900/10 border border-amber-600/30 rounded-lg p-4 sm:p-6 max-w-4xl mx-auto">
              <div className="flex items-start gap-3">
                <div className="text-amber-400 mt-1">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <h4 className="font-semibold text-amber-600 mb-2">Educational Use Only</h4>
                  <p className="text-secondary text-sm leading-relaxed">
                    This tool is designed exclusively for educational and research purposes to promote awareness about income inequality in India. 
                    All data is based on publicly available government statistics and peer-reviewed academic research. Results are for 
                    illustrative purposes and should not be considered as financial, economic, or policy advice.
                  </p>
                </div>
              </div>
            </div>
            
            {/* Impact Mojo Branding */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
              <div className="text-amber-400 font-bold text-lg sm:text-xl">
                Impact Mojo
              </div>
              <div className="hidden sm:block text-muted">|</div>
              <a 
                href="https://www.impactmojo.in" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 transition-colors text-sm sm:text-base"
              >
                www.impactmojo.in
              </a>
            </div>
            
            {/* Credits */}
            <div className="text-muted text-xs sm:text-sm space-y-1 sm:space-y-2">
              <div>
                <strong className="text-secondary">Ideas & Conceptualization:</strong> Yogendra Yadav
              </div>
              <div>
                <strong className="text-secondary">Brought to Life by:</strong> Varna Sri Raman
              </div>
              <div className="text-xs">
                Built to promote awareness about income inequality in India
              </div>
            </div>
            
            {/* Legal & Terms Reference */}
            <div className="text-xs pt-3 sm:pt-4 border-t space-y-2" style={{borderColor: 'var(--border-color)', color: 'var(--text-muted)'}}>
              <div>
                Open Source • MIT License • Educational Use
              </div>
              <div>
                Legal Terms, Privacy Policy & Disclaimers: As declared on{' '}
                <a 
                  href="https://www.impactmojo.in" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 transition-colors underline"
                >
                  impactmojo.in
                </a>
              </div>
              <div className="text-xs opacity-75">
                © 2025 Impact Mojo. This project is part of the Impact Mojo knowledge ecosystem.
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default App;