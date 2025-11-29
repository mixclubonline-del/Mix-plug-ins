
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { findPlugin, INITIAL_PLUGIN_SIZES, INITIAL_PLUGIN_POSITIONS, INITIAL_PLUGIN_STATES, PluginKey, TierName } from './constants'; 
import { MixxClubLogo, HaloIcon, SaveIcon, SettingsIcon, LinkIcon, GridIcon, ResetIcon, LightbulbIcon } from './components/shared/Icons';
import { HaloSchematic } from './components/HaloSchematic';
import { SessionContext, PluginPositions, PluginSize, PluginSizes, PluginPosition, SpecificPluginSettingsMap, PluginStates, MidiMappingMap, PluginComponentProps, Preset, PanelType, SidechainLink, AudioSignal, GlobalSettings } from './types'; 
import { ResizableContainer } from './components/shared/ResizableContainer';
import { motion, AnimatePresence } from 'framer-motion';
import { useMidi } from './hooks/useMidi';
import { isControlChange } from './lib/midi';
import { usePresets } from './hooks/usePresets';
import { RoutingView } from './components/RoutingView';
import { PluginBrowser } from './components/PluginBrowser';
import { SidePanel } from './components/SidePanel';
import { PrimeBrainStub } from './lib/PrimeBrainStub';
import { useSimulatedAudio } from './hooks/useSimulatedAudio';
import { SettingsPanel } from './components/SettingsPanel'; // Import the new SettingsPanel
import { mapRange } from './lib/utils'; // Import mapRange
import { useGlobalSettings } from './hooks/useGlobalSettings'; // Import the new hook
import { AIAudioPlayer } from './components/AIAudioPlayer';
import { AmbientBackground } from './components/shared/AmbientBackground';

const App: React.FC = () => {
  const [activePlugin, setActivePlugin] = useState<PluginKey | null>(null); 
  const [view, setView] = useState<'plugin' | 'halo'>('plugin');
  const [sessionContext, setSessionContext] = useState<SessionContext>({ mood: 'Neutral' });
  const [pluginStates, setPluginStates] = useState<PluginStates>(INITIAL_PLUGIN_STATES); 
  const [pluginSizes, setPluginSizes] = useState<PluginSizes>(INITIAL_PLUGIN_SIZES);
  const [pluginPositions, setPluginPositions] = useState<PluginPositions>(INITIAL_PLUGIN_POSITIONS);
  const [activePluginZIndex, setActivePluginZIndex] = useState(10); 
  const [activePanel, setActivePanel] = useState<PanelType>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const transitionStartRef = useRef<number | null>(null);

  const { audioSignal, isPlaying, loadAudio, play, pause, stopAndPlayDefault } = useSimulatedAudio();

  // Global Settings State using the new persistence hook
  const { globalSettings, setGlobalSettings } = useGlobalSettings();

  // Calculate dynamic transition duration based on animationIntensity
  const dynamicTransitionDuration = mapRange(globalSettings.animationIntensity, 0, 100, 0.5, 0.2);

  // MIDI State
  const { inputs: midiInputs, selectedInputId, setSelectedInputId, attachMidiListener } = useMidi();
  const [midiMappings, setMidiMappings] = useState<MidiMappingMap>({});
  const [midiLearnTarget, setMidiLearnTarget] = useState<{ pluginKey: PluginKey, paramName: string, min: number, max: number } | null>(null);

  // Preset State
  const { presets, savePreset, deletePreset } = usePresets();

  // Routing State
  const [sidechainLinks, setSidechainLinks] = useState<SidechainLink[]>([]);
  
  const handleSelectPlugin = (pluginKey: PluginKey) => {
      setIsTransitioning(true);
      transitionStartRef.current = performance.now();
      setActivePlugin(pluginKey);
      PrimeBrainStub.sendEvent('plugin_activated', { pluginKey, name: findPlugin(pluginKey).name });
  };
  
  const handleClosePlugin = () => {
      setIsTransitioning(true);
      transitionStartRef.current = performance.now();
      setActivePlugin(null);
  }

  // Effect to manage `isTransitioning` for a set duration after `handleSelectPlugin` or `handleClosePlugin`
  useEffect(() => {
      if (isTransitioning) {
          const timer = setTimeout(() => {
              setIsTransitioning(false);
          }, dynamicTransitionDuration * 1000 + 100); // Allow some time for the layout animation to complete
          return () => clearTimeout(timer);
      }
  }, [isTransitioning, dynamicTransitionDuration]);

  const handlePluginStateChange = useCallback(<K extends PluginKey>(
    pluginId: K, 
    newState: Partial<SpecificPluginSettingsMap[K]> | ((prevState: SpecificPluginSettingsMap[K]) => Partial<SpecificPluginSettingsMap[K]>)
  ) => {
    setPluginStates(prevStates => {
      const currentPluginState = prevStates[pluginId];
      let updatedPartialState: Partial<SpecificPluginSettingsMap[K]>;

      if (typeof newState === 'function') {
        updatedPartialState = (newState as Function)(currentPluginState);
      } else {
        updatedPartialState = newState;
      }

      return {
        ...prevStates,
        [pluginId]: {
          ...currentPluginState,
          ...updatedPartialState
        } as SpecificPluginSettingsMap[K]
      };
    });
  }, []);

  const handleGlobalSettingsChange = useCallback((newSettings: Partial<GlobalSettings>) => {
      setGlobalSettings(newSettings); // This now uses the setter from the hook, which handles persistence
      PrimeBrainStub.sendEvent('global_settings_change', newSettings);
  }, [setGlobalSettings]);
  
  const handleAudioReady = useCallback(async (base64Audio: string) => {
    await loadAudio(base64Audio);
    play(); // Auto-play when ready
  }, [loadAudio, play]);


  const handleMidiMessage = useCallback((message: MIDIMessageEvent) => {
    if (!isControlChange(message) || !message.target) return;

    const [, cc, value] = message.data;
    const deviceId = (message.target as any).id;
    const mappingKey = `${deviceId}-${cc}`;

    if (midiLearnTarget) {
        const newMapping = {
            pluginKey: midiLearnTarget.pluginKey,
            paramName: midiLearnTarget.paramName,
            min: midiLearnTarget.min,
            max: midiLearnTarget.max,
        };
        setMidiMappings(prev => ({ ...prev, [mappingKey]: newMapping }));
        PrimeBrainStub.sendEvent('midi_mapped', { deviceId, cc, ...newMapping });
        setMidiLearnTarget(null);
        return;
    }

    const mapping = midiMappings[mappingKey];
    if (mapping) {
        const { pluginKey, paramName, min, max } = mapping;
        const scaledValue = min + (value / 127) * (max - min);
        handlePluginStateChange(pluginKey as PluginKey, (prevState: any) => ({
            ...prevState,
            [paramName]: scaledValue,
        }));
    }
  }, [midiLearnTarget, midiMappings, handlePluginStateChange]);

  useEffect(() => {
    const cleanup = attachMidiListener(handleMidiMessage);
    return cleanup;
  }, [attachMidiListener, handleMidiMessage]);

  const handleMidiLearnStart = useCallback((pluginKey: PluginKey, paramName: string, min: number, max: number) => {
    setMidiLearnTarget(prev => {
        if (prev && prev.pluginKey === pluginKey && prev.paramName === paramName) {
            return null;
        }
        PrimeBrainStub.sendEvent('midi_learn_started', { pluginKey, paramName });
        return { pluginKey, paramName, min, max };
    });
  }, []);

  const handleSavePreset = () => {
    const name = window.prompt("Enter a name for your preset:");
    if (name) {
      const isOverwriting = presets.some(p => p.name === name);
      if (isOverwriting) {
        if (!window.confirm(`A preset named "${name}" already exists. Overwrite it?`)) {
          return;
        }
      }
      savePreset(name, pluginStates);
      PrimeBrainStub.sendEvent('preset_saved', { name });
    }
  };

  const handleLoadPreset = (name: string) => {
    const preset = presets.find(p => p.name === name);
    if (preset) {
      setPluginStates(preset.states);
      PrimeBrainStub.sendEvent('preset_loaded', { name });
    }
  };

  const handleDeletePreset = (name: string) => {
    if (window.confirm(`Are you sure you want to delete the preset "${name}"?`)) {
      deletePreset(name);
      PrimeBrainStub.sendEvent('preset_deleted', { name });
    }
  };
  
  const handleAddLink = useCallback((newLink: SidechainLink) => {
    setSidechainLinks(prev => {
      if (prev.some(link => link.to === newLink.to)) return prev;
      PrimeBrainStub.sendEvent('sidechain_linked', newLink);
      return [...prev, newLink];
    });
  }, []);

  const handleRemoveLink = useCallback((linkToRemove: SidechainLink) => {
    setSidechainLinks(prev => prev.filter(link => !(link.from === linkToRemove.from && link.to === linkToRemove.to)));
    PrimeBrainStub.sendEvent('sidechain_unlinked', linkToRemove);
    const targetPluginKey = linkToRemove.to;
    const pluginInfo = findPlugin(targetPluginKey);
    if (pluginInfo.canBeSidechainTarget) {
      handlePluginStateChange(targetPluginKey, { sidechainActive: false } as any);
    }
  }, [handlePluginStateChange]);

  const handleResetSession = () => {
      if (window.confirm("Are you sure you want to reset your session? All settings will be lost.")) {
          localStorage.clear();
          PrimeBrainStub.sendEvent('session_reset', {});
          window.location.reload();
      }
  };

  const renderActivePlugin = () => {
    if (!activePlugin) return null;

    const pluginInfo = findPlugin(activePlugin);
    const ActivePluginComponent = pluginInfo.component as React.FC<PluginComponentProps<any>>;
    type CurrentPluginSettings = React.ComponentProps<typeof ActivePluginComponent>['pluginState'];
    
    const pluginProps = {
      name: pluginInfo.name,
      description: pluginInfo.description,
      sessionContext,
      setSessionContext: (newContext: SessionContext) => setSessionContext(newContext),
      pluginState: pluginStates[activePlugin] as CurrentPluginSettings, 
      setPluginState: (newState: Partial<CurrentPluginSettings> | ((prevState: CurrentPluginSettings) => Partial<CurrentPluginSettings>)) => handlePluginStateChange(activePlugin, newState as any),
      isLearning: (paramName: string) => midiLearnTarget?.pluginKey === activePlugin && midiLearnTarget?.paramName === paramName,
      onMidiLearn: (paramName: string, min: number, max: number) => handleMidiLearnStart(activePlugin, paramName, min, max),
      isSidechainTarget: sidechainLinks.some(link => link.to === activePlugin),
      audioSignal: audioSignal, // Pass the global audio signal here
      onClose: handleClosePlugin, // Pass the close handler to the plugin
      globalSettings: globalSettings, // Pass global settings to plugins
    };

    return (
       <ResizableContainer
        key={activePlugin}
        layoutId={activePlugin}
        initialSize={pluginSizes[activePlugin]}
        initialPosition={pluginPositions[activePlugin]}
        onResizeStop={(newSize) => setPluginSizes(prev => ({ ...prev, [activePlugin]: newSize }))}
        onDragStop={(newPosition) => setPluginPositions(prev => ({ ...prev, [activePlugin]: newPosition }))}
        onInteractionStart={() => setActivePluginZIndex(50)}
        onInteractionStop={() => setActivePluginZIndex(40)}
        zIndex={activePluginZIndex}
        onAnimationComplete={() => setIsTransitioning(false)}
        globalSettings={globalSettings} // Pass global settings
      >
        <ActivePluginComponent {...pluginProps} />
      </ResizableContainer>
    );
  };
  
  return (
    <div className="text-white min-h-screen bg-[#0d1117] relative overflow-hidden">
      <AmbientBackground mood={sessionContext.mood} intensity={globalSettings.animationIntensity} />
      <div className="relative flex flex-col h-screen z-10">
        <AnimatePresence>
          {activePlugin && (
            <motion.header 
              className="absolute top-0 left-0 right-0 flex items-center justify-between z-20 p-4"
              initial={{ y: -60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -60, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
                <div className="flex items-center gap-4">
                    <MixxClubLogo className="h-8 w-8" />
                    <h1 className="font-orbitron text-xl font-bold tracking-wider">MixxClub</h1>
                </div>
                
                <div className="flex items-center gap-2 p-2 rounded-full bg-black/30 backdrop-blur-md border border-white/20">
                    <AIAudioPlayer 
                        isPlaying={isPlaying}
                        onAudioReady={handleAudioReady}
                        onPlay={play}
                        onPause={pause}
                        onStop={stopAndPlayDefault}
                    />
                    <div className="w-px h-6 bg-white/20" />
                    <button onClick={handleClosePlugin} className="group p-2 text-white/60 hover:text-white transition-colors" title="Plugin Browser">
                        <GridIcon className="w-5 h-5 transition-all text-cyan-300 group-hover:drop-shadow-[0_0_3px_var(--glow-cyan)] icon-pulse-animated" />
                    </button>
                     <button onClick={() => setActivePanel('presets')} className="group p-2 text-white/60 hover:text-white transition-all duration-300 hover:scale-105" title="Presets">
                         <SaveIcon className="w-5 h-5 transition-all group-hover:drop-shadow-[0_0_4px_white]" />
                     </button>
                     <button onClick={() => setActivePanel('settings')} className="group p-2 text-white/60 hover:text-white transition-all duration-300 hover:scale-105" title="Settings">
                         <SettingsIcon className="w-5 h-5 transition-all group-hover:drop-shadow-[0_0_4px_white]" />
                     </button>
                     <button onClick={() => setActivePanel('routing')} className="group p-2 text-white/60 hover:text-white transition-all duration-300 hover:scale-105" title="Routing">
                         <LinkIcon className="w-5 h-5 transition-all group-hover:drop-shadow-[0_0_4px_white]" />
                     </button>
                     <button onClick={() => setActivePanel(p => p === 'console' ? null : 'console')} className="group p-2 text-white/60 hover:text-white transition-all duration-300 hover:scale-105" title="AI Console">
                         <LightbulbIcon className="w-5 h-5 transition-all group-hover:drop-shadow-[0_0_4px_white]" />
                     </button>
                      <button onClick={handleResetSession} className="group p-2 text-white/60 hover:text-white transition-all duration-300 hover:scale-105" title="Reset Session">
                         <ResetIcon className="w-5 h-5 transition-all group-hover:drop-shadow-[0_0_4px_white]" />
                     </button>
                     <button 
                        onClick={() => setView(view === 'plugin' ? 'halo' : 'plugin')}
                        className="p-2 rounded-full bg-white/10 text-cyan-300 hover:bg-cyan-400/20 hover:text-white transition-all duration-300 group hover:scale-105"
                        aria-label="Toggle Halo View"
                      >
                        <HaloIcon className="h-5 w-5 halo-icon-animated transition-all group-hover:drop-shadow-[0_0_4px_var(--glow-cyan)]" />
                     </button>
                </div>
            </motion.header>
          )}
        </AnimatePresence>

        <main className="flex-1 flex items-center justify-center transition-all duration-500">
          <AnimatePresence mode="wait">
            {view === 'halo' ? (
              <motion.div 
                key="halo" 
                initial={{opacity: 0}} 
                animate={{opacity: 1}} 
                exit={{opacity: 0}} 
                transition={{ duration: dynamicTransitionDuration, ease: 'easeInOut' }}
                className="w-full h-full"
              >
                <HaloSchematic 
                  setActivePlugin={(p: PluginKey) => { 
                    handleSelectPlugin(p); 
                    setView('plugin');
                  }} 
                  sessionContext={sessionContext}
                  pluginStates={pluginStates} 
                />
              </motion.div>
            ) : (
               activePlugin ? (
                  <div key="plugin-active" className="w-full h-full">{renderActivePlugin()}</div>
               ) : (
                  <PluginBrowser 
                    key="plugin-browser" 
                    onSelectPlugin={handleSelectPlugin} 
                    activePlugin={activePlugin}
                    isTransitioning={isTransitioning}
                    globalSettings={globalSettings} // Pass global settings
                  />
               )
            )}
          </AnimatePresence>
        </main>

        <AnimatePresence>
          {activePanel === 'routing' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100]"
              transition={{ duration: dynamicTransitionDuration, ease: 'easeInOut' }}
            >
              <RoutingView 
                sidechainLinks={sidechainLinks}
                onAddLink={handleAddLink}
                onRemoveLink={handleRemoveLink}
                onClose={() => setActivePanel(null)}
              />
            </motion.div>
          )}
        </AnimatePresence>
        
        <SidePanel
            activePanel={activePanel}
            setActivePanel={setActivePanel}
            presets={presets}
            onSavePreset={handleSavePreset}
            onLoadPreset={handleLoadPreset}
            onDeletePreset={handleDeletePreset}
            midiInputs={midiInputs}
            selectedMidiInput={selectedInputId}
            onMidiInputChange={(id) => {
              setSelectedInputId(id || null);
              setMidiLearnTarget(null);
            }}
            globalSettings={globalSettings} // Pass global settings
            sessionContext={sessionContext} // Pass session context
        />
        
        <SettingsPanel
            isActive={activePanel === 'settings'}
            onClose={() => setActivePanel(null)}
            globalSettings={globalSettings}
            setGlobalSettings={handleGlobalSettingsChange}
        />

      </div>
    </div>
  );
};

export default App;
