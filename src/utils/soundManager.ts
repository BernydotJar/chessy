// Sound System for Chess Moves
// Provides audio feedback for different game events

export type SoundType = 'move' | 'capture' | 'castle' | 'check' | 'checkmate' | 'gameStart' | 'gameEnd';

class SoundManager {
  private enabled: boolean = true;
  private volume: number = 0.5;

  private async playWithWebAudio(frequency: number, duration: number): Promise<void> {
    if (!this.enabled) return;

    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(this.volume, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + duration);

      // Clean up
      setTimeout(() => {
        audioContext.close();
      }, duration * 1000 + 100);
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  }

  async play(type: SoundType): Promise<void> {
    if (!this.enabled) return;

    // Map sound types to frequencies
    const soundMap: Record<SoundType, { frequency: number; duration: number }> = {
      move: { frequency: 440, duration: 0.1 },
      capture: { frequency: 330, duration: 0.15 },
      castle: { frequency: 523, duration: 0.2 },
      check: { frequency: 659, duration: 0.25 },
      checkmate: { frequency: 880, duration: 0.5 },
      gameStart: { frequency: 392, duration: 0.15 },
      gameEnd: { frequency: 349, duration: 0.3 },
    };

    const sound = soundMap[type];
    if (sound) {
      await this.playWithWebAudio(sound.frequency, sound.duration);
    }
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  getVolume(): number {
    return this.volume;
  }
}

// Singleton instance
export const soundManager = new SoundManager();
