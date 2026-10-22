import { useState, useEffect, useCallback, useRef } from 'react';
import { db } from '../db/database';
import { verifyPin, hashPin } from '../lib/crypto';
import { AppSettings } from '../types';

export function useAppLock(settings?: AppSettings) {
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [hasCheckedInitial, setHasCheckedInitial] = useState(false);
  const lastActivityRef = useRef<number>(Date.now());

  // Check initial lock state
  useEffect(() => {
    if (settings && !hasCheckedInitial) {
      if (settings.appLockEnabled && settings.pinHash) {
        setIsLocked(true);
      }
      setHasCheckedInitial(true);
    }
  }, [settings, hasCheckedInitial]);

  // Activity tracker for auto-lock
  useEffect(() => {
    if (!settings?.appLockEnabled || !settings?.autoLockMinutes || settings.autoLockMinutes <= 0) {
      return;
    }

    const timeoutMs = settings.autoLockMinutes * 60 * 1000;

    const handleActivity = () => {
      lastActivityRef.current = Date.now();
    };

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('touchstart', handleActivity);

    const interval = setInterval(() => {
      if (!isLocked && Date.now() - lastActivityRef.current > timeoutMs) {
        setIsLocked(true);
      }
    }, 10000);

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
      clearInterval(interval);
    };
  }, [settings?.appLockEnabled, settings?.autoLockMinutes, isLocked]);

  const unlockWithPin = useCallback(
    async (pin: string): Promise<boolean> => {
      if (!settings?.pinHash || !settings?.pinSalt) return true;
      const isValid = await verifyPin(pin, settings.pinHash, settings.pinSalt);
      if (isValid) {
        setIsLocked(false);
        lastActivityRef.current = Date.now();
        return true;
      }
      return false;
    },
    [settings]
  );

  const enableLock = useCallback(async (newPin: string, autoLockMinutes: number = 5) => {
    const { hash, salt } = await hashPin(newPin);
    const curr = await db.settings.get('default');
    if (curr) {
      await db.settings.put({
        ...curr,
        appLockEnabled: true,
        pinHash: hash,
        pinSalt: salt,
        autoLockMinutes,
      });
    }
  }, []);

  const disableLock = useCallback(async (pin: string): Promise<boolean> => {
    if (!settings?.pinHash || !settings?.pinSalt) return false;
    const isValid = await verifyPin(pin, settings.pinHash, settings.pinSalt);
    if (!isValid) return false;

    const curr = await db.settings.get('default');
    if (curr) {
      await db.settings.put({
        ...curr,
        appLockEnabled: false,
        pinHash: undefined,
        pinSalt: undefined,
      });
    }
    setIsLocked(false);
    return true;
  }, [settings]);

  return {
    isLocked,
    setIsLocked,
    unlockWithPin,
    enableLock,
    disableLock,
  };
}
