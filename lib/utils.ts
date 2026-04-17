
import { Mood } from '../types';

// A simple utility to conditionally join class names, similar to 'clsx' or 'classnames'
export function cn(...inputs: (string | boolean | undefined | null)[]) {
  return inputs.filter(Boolean).join(' ');
}

/**
 * Maps a value from one numerical range to another.
 * @param value The value to map.
 * @param inMin The minimum value of the input range.
 * @param inMax The maximum value of the input range.
 * @param outMin The minimum value of the output range.
 * @param outMax The maximum value of the output range.
 * @returns The mapped value.
 */
export function mapRange(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number {
  return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
}

export const getMoodHue = (mood: Mood): number => {
    const moodHueMap: Record<Mood, number> = {
        'Neutral': 200,
        'Warm': 30,
        'Bright': 190,
        'Dark': 260,
        'Energetic': 330
    };
    return moodHueMap[mood] || 200;
};
