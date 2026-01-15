import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { AudioNotifier } from "../utils/notifysound/notifysound.js";

const SoundContext = createContext(null);

// один notifier на всё приложение
const notifier = new AudioNotifier({
  src: "/sounds/new-order.mp3",
  volume: 0.9,
  minIntervalMs: 1200,
});

export function SoundProvider({ children }) {
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem("soundEnabled") === "1";
  });

  // включаем/выключаем и сохраняем
  useEffect(() => {
    notifier.setEnabled(soundEnabled);
    localStorage.setItem("soundEnabled", soundEnabled ? "1" : "0");
  }, [soundEnabled]);

  // важно: unlock должен вызываться из user gesture (клик по свитчу/кнопке)
  const unlock = async () => {
    return await notifier.unlock();
  };

  const value = useMemo(
    () => ({
      soundEnabled,
      setSoundEnabled,
      unlock,
      notifier, // чтобы OrderPanel мог играть звук
    }),
    [soundEnabled]
  );

  return <SoundContext.Provider value={value}>{children}</SoundContext.Provider>;
}

export function useSound() {
  const ctx = useContext(SoundContext);
  if (!ctx) throw new Error("useSound must be used within SoundProvider");
  return ctx;
}
