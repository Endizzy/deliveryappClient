import { createContext, useContext, useEffect, useState } from "react";

const TimeContext = createContext(Date.now());

export function TimeCounterProvider({ children }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <TimeContext.Provider value={now}>
      {children}
    </TimeContext.Provider>
  );
}

export function useNow() {
  return useContext(TimeContext);
}
