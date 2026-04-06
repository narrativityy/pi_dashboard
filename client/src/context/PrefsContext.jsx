import { createContext, useContext, useState } from 'react';

const PrefsContext = createContext();

export function PrefsProvider({ children }) {
  const [tempUnit, setTempUnit] = useState(
    () => localStorage.getItem('tempUnit') || 'F'
  );

  function toggleTempUnit() {
    const next = tempUnit === 'F' ? 'C' : 'F';
    localStorage.setItem('tempUnit', next);
    setTempUnit(next);
  }

  return (
    <PrefsContext.Provider value={{ tempUnit, toggleTempUnit }}>
      {children}
    </PrefsContext.Provider>
  );
}

export function usePrefs() {
  return useContext(PrefsContext);
}

export function toDisplayTemp(celsius, unit) {
  if (celsius === null || celsius === undefined) return null;
  return unit === 'F' ? (celsius * 9) / 5 + 32 : celsius;
}
