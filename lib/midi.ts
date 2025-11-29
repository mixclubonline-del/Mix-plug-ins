export const isControlChange = (message: MIDIMessageEvent): boolean => {
  // MIDI CC messages for channel 1-16 are 0xB0 to 0xBF
  const status = message.data[0] & 0xF0;
  return status === 0xB0;
};