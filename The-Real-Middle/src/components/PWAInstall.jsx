import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Share } from 'lucide-react';

const PWAInstall = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Detect iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Show install banner after user completes assessment
      const assessmentCompleted = localStorage.getItem('realMiddleAssessmentCompleted');
      if (assessmentCompleted && !localStorage.getItem('pwaInstallDismissed')) {
        setTimeout(() => setShowInstallBanner(true), 2000);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      if (isIOS) {
        setShowInstallBanner(true);
      }
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      localStorage.setItem('pwaInstalled', 'true');
    }
    
    setDeferredPrompt(null);
    setShowInstallBanner(false);
  };

  const dismissBanner = () => {
    setShowInstallBanner(false);
    localStorage.setItem('pwaInstallDismissed', 'true');
  };

  // Show install prompt after assessment completion
  useEffect(() => {
    const checkForInstallPrompt = () => {
      const assessmentCompleted = localStorage.getItem('realMiddleAssessmentCompleted');
      const installDismissed = localStorage.getItem('pwaInstallDismissed');
      
      if (assessmentCompleted && !installDismissed && !isInstalled && (deferredPrompt || isIOS)) {
        setTimeout(() => setShowInstallBanner(true), 3000);
      }
    };

    checkForInstallPrompt();
  }, [deferredPrompt, isIOS, isInstalled]);

  if (isInstalled) {
    return null;
  }

  return (
    <>
      {/* Header Install Button - Mobile responsive positioning */}
      {(deferredPrompt || isIOS) && !showInstallBanner && (
        <button
          onClick={handleInstallClick}
          className="fixed top-4 right-4 z-40 bg-amber-600 hover:bg-amber-700 text-white p-3 rounded-lg shadow-lg transition-all duration-200 hover:scale-105 pwa-install-btn
                     sm:top-4 sm:right-4 sm:p-2
                     md:top-4 md:right-4 md:p-3"
          title="Install App"
        >
          <Download className="w-5 h-5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
        </button>
      )}

      {/* Install Banner */}
      {showInstallBanner && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-r from-amber-600 to-orange-600 p-4 shadow-2xl">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-white/20 rounded-full p-2">
                <Smartphone className="w-6 h-6 text-white" />
              </div>
              <div className="text-white">
                <h3 className="font-semibold text-sm sm:text-base">Install The Real Middle</h3>
                <p className="text-amber-100 text-xs sm:text-sm">
                  {isIOS ? 'Add to home screen for quick access' : 'Get the app for easy sharing & quick access'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={handleInstallClick}
                className="bg-white text-amber-600 font-semibold px-4 py-2 rounded-lg hover:bg-amber-50 transition-colors text-sm"
              >
                {isIOS ? 'How to Install' : 'Install'}
              </button>
              <button
                onClick={dismissBanner}
                className="text-white/80 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* iOS Install Instructions Modal */}
      {isIOS && showInstallBanner && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-2xl border border-slate-600 max-w-sm w-full p-6 relative">
            <button
              onClick={dismissBanner}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="text-center">
              <div className="bg-slate-700/50 rounded-full p-4 w-fit mx-auto mb-4">
                <Share className="w-8 h-8 text-blue-400" />
              </div>
              
              <h3 className="text-xl font-bold text-white mb-4">Install on iPhone</h3>
              
              <div className="text-left space-y-3 text-slate-300">
                <div className="flex items-start space-x-3">
                  <div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mt-0.5">1</div>
                  <p>Tap the <strong>Share</strong> button in Safari</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mt-0.5">2</div>
                  <p>Scroll down and tap <strong>"Add to Home Screen"</strong></p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mt-0.5">3</div>
                  <p>Tap <strong>"Add"</strong> to install the app</p>
                </div>
              </div>
              
              <div className="mt-6 p-3 bg-amber-900/20 border border-amber-600/50 rounded-lg">
                <p className="text-amber-200 text-sm">
                  💡 <strong>Tip:</strong> Once installed, you can share results instantly with family & friends!
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PWAInstall;