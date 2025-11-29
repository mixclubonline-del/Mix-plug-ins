import { useState, useEffect, useCallback } from 'react';
import { GlobalSettings } from '../types';

const SETTINGS_STORAGE_KEY = 'mixxclub_settings_v1';

const defaultSettings: GlobalSettings = {
    uiTheme: 'dark',
    animationIntensity: 50,
    visualizerComplexity: 'high',
};

export const useGlobalSettings = () => {
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings>(() => {
    try {
      const storedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (storedSettings) {
        return { ...defaultSettings, ...JSON.parse(storedSettings) };
      }
    } catch (error) {
      console.error("Failed to load global settings from localStorage", error);
    }
    return defaultSettings;
  });

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(globalSettings));
    } catch (error) {
      console.error("Failed to save global settings to localStorage", error);
    }
  }, [globalSettings]);

  const updateGlobalSettings = useCallback((newSettings: Partial<GlobalSettings>) => {
    setGlobalSettings(prevSettings => ({
        ...prevSettings,
        ...newSettings,
    }));
  }, []);

  return { globalSettings, setGlobalSettings: updateGlobalSettings };
};
