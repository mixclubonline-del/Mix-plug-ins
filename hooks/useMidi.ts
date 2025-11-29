import { useState, useEffect, useCallback } from 'react';

export interface MidiInput {
  id: string;
  name?: string;
}

export type MidiMessageCallback = (message: MIDIMessageEvent) => void;

export const useMidi = () => {
  const [inputs, setInputs] = useState<MidiInput[]>([]);
  const [selectedInputId, setSelectedInputId] = useState<string | null>(null);
  const [midiAccess, setMidiAccess] = useState<MIDIAccess | null>(null);

  const onStateChange = useCallback(() => {
    if (midiAccess) {
      const availableInputs: MidiInput[] = [];
      midiAccess.inputs.forEach(input => {
        availableInputs.push({ id: input.id, name: input.name });
      });
      setInputs(availableInputs);
      // If the selected device is disconnected, reset selection
      if (selectedInputId && !availableInputs.some(i => i.id === selectedInputId)) {
        setSelectedInputId(null);
      }
    }
  }, [midiAccess, selectedInputId]);

  useEffect(() => {
    const initMidi = async () => {
      try {
        if (navigator.requestMIDIAccess) {
          const access = await navigator.requestMIDIAccess({ sysex: false });
          setMidiAccess(access);
          access.onstatechange = onStateChange;
        } else {
          console.warn('Web MIDI API is not supported in this browser.');
        }
      } catch (error) {
        console.error('Could not access MIDI devices.', error);
      }
    };
    initMidi();
    
    return () => {
      if (midiAccess) {
        midiAccess.onstatechange = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  useEffect(() => {
    onStateChange();
  }, [midiAccess, onStateChange]);

  const attachMidiListener = useCallback((callback: MidiMessageCallback) => {
    if (midiAccess) {
      // First, clear any existing listeners to prevent duplicates
      midiAccess.inputs.forEach(i => i.onmidimessage = null);

      if (selectedInputId) {
          const input = midiAccess.inputs.get(selectedInputId);
          if (input) {
            input.onmidimessage = callback;
            return () => {
                if (input) {
                    input.onmidimessage = null;
                }
            };
          }
      }
    }
    return () => {}; // Return an empty cleanup function if no listener was attached
  }, [midiAccess, selectedInputId]);

  return {
    inputs,
    selectedInputId,
    setSelectedInputId,
    attachMidiListener,
  };
};