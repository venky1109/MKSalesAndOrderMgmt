// utils/useLiveTimer.js
import { useEffect, useState } from 'react';

export const useLiveTimer = () => {
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);
};
