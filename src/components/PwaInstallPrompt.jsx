import React, { useEffect, useMemo, useState } from 'react';
import { Download, Share2, Smartphone, X } from 'lucide-react';

const SNOOZE_KEY = 'mk-pos-pwa-install-snoozed-until';
const SNOOZE_MS = 24 * 60 * 60 * 1000;

const isStandaloneDisplay = () => {
  if (typeof window === 'undefined') return false;

  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.navigator.standalone === true
  );
};

const getPlatform = () => {
  if (typeof window === 'undefined') return 'other';

  const ua = window.navigator.userAgent || '';
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (
    window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1
  );

  if (isIOS) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return 'other';
};

const isSnoozed = () => {
  const until = Number(window.localStorage.getItem(SNOOZE_KEY) || 0);
  return until > Date.now();
};

function PwaInstallPrompt() {
  const [installEvent, setInstallEvent] = useState(null);
  const [visible, setVisible] = useState(false);
  const [installed, setInstalled] = useState(() => isStandaloneDisplay());
  const [installing, setInstalling] = useState(false);
  const platform = useMemo(() => getPlatform(), []);
  const currentHost = typeof window === 'undefined' ? 'this site' : window.location.host;

  useEffect(() => {
    if (installed || isSnoozed()) return undefined;

    const fallbackTimer = window.setTimeout(() => {
      if (!isStandaloneDisplay()) {
        setVisible(true);
      }
    }, 2500);

    const showInstallPrompt = (event) => {
      event.preventDefault();
      setInstallEvent(event);
      setVisible(true);
    };

    const markInstalled = () => {
      setInstalled(true);
      setVisible(false);
      setInstallEvent(null);
      window.localStorage.removeItem(SNOOZE_KEY);
    };

    window.addEventListener('beforeinstallprompt', showInstallPrompt);
    window.addEventListener('appinstalled', markInstalled);

    if (platform === 'ios') {
      setVisible(true);
    }

    return () => {
      window.clearTimeout(fallbackTimer);
      window.removeEventListener('beforeinstallprompt', showInstallPrompt);
      window.removeEventListener('appinstalled', markInstalled);
    };
  }, [installed, platform]);

  const dismissPrompt = () => {
    window.localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_MS));
    setVisible(false);
  };

  const installApp = async () => {
    if (!installEvent) return;

    setInstalling(true);
    try {
      await installEvent.prompt();
      const result = await installEvent.userChoice;

      if (result.outcome === 'accepted') {
        setInstalled(true);
        setVisible(false);
      } else {
        dismissPrompt();
      }
    } finally {
      setInstallEvent(null);
      setInstalling(false);
    }
  };

  if (installed || !visible) return null;

  const canInstall = Boolean(installEvent);

  return (
    <div className="fixed inset-x-3 bottom-3 z-[1000] sm:inset-x-auto sm:right-4 sm:w-[360px]">
      <div className="rounded-lg border border-emerald-200 bg-white p-4 shadow-xl">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
            <Smartphone size={22} aria-hidden="true" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-gray-900">Install ManaKirana POS</h2>
                <p className="mt-1 text-sm leading-5 text-gray-600">
                  Add this app to your home screen for quicker access and a full-screen experience.
                </p>
              </div>
              <button
                type="button"
                onClick={dismissPrompt}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                aria-label="Dismiss install prompt"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            {platform === 'ios' && !canInstall ? (
              <div className="mt-3 rounded-md bg-gray-50 p-3 text-sm text-gray-700">
                Tap <Share2 className="inline-block align-[-3px]" size={16} aria-hidden="true" /> Share, then choose
                <span className="font-semibold"> Add to Home Screen</span>.
              </div>
            ) : null}

            {platform !== 'ios' && !canInstall ? (
              <div className="mt-3 rounded-md bg-gray-50 p-3 text-sm text-gray-700">
                Open {currentHost} directly in Chrome. If install is missing from the menu,
                update Chrome, close private browsing, and reopen the site from a normal tab.
              </div>
            ) : null}

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={dismissPrompt}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-200 px-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Later
              </button>
              {canInstall ? (
                <button
                  type="button"
                  onClick={installApp}
                  disabled={installing}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  <Download size={17} aria-hidden="true" />
                  {installing ? 'Opening...' : 'Install'}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PwaInstallPrompt;
