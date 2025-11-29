import { useState, useEffect, useCallback } from 'react';
import { Preset, PluginStates } from '../types';

const PRESETS_STORAGE_KEY = 'mixxclub_presets_v1';

export const usePresets = () => {
  const [presets, setPresets] = useState<Preset[]>([]);

  useEffect(() => {
    try {
      const storedPresets = localStorage.getItem(PRESETS_STORAGE_KEY);
      if (storedPresets) {
        setPresets(JSON.parse(storedPresets));
      }
    } catch (error) {
      console.error("Failed to load presets from localStorage", error);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets));
    } catch (error) {
      console.error("Failed to save presets to localStorage", error);
    }
  }, [presets]);

  const savePreset = useCallback((name: string, states: PluginStates) => {
    setPresets(prevPresets => {
      const existingPresetIndex = prevPresets.findIndex(p => p.name === name);
      const newPreset = { name, states };
      if (existingPresetIndex > -1) {
        // Overwrite existing preset
        const updatedPresets = [...prevPresets];
        updatedPresets[existingPresetIndex] = newPreset;
        return updatedPresets;
      } else {
        // Add new preset
        return [...prevPresets, newPreset];
      }
    });
  }, []);

  const deletePreset = useCallback((name: string) => {
    setPresets(prevPresets => prevPresets.filter(p => p.name !== name));
  }, []);

  return { presets, savePreset, deletePreset };
};
