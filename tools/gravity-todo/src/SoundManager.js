// 爆発音を合成するクラス
export class SoundManager {
  constructor(audioContextFactory = null) {
    this.audioContextFactory = audioContextFactory ?? (() => {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      return AudioContextClass ? new AudioContextClass() : null;
    });
    this.audioContext = null;
  }

  // 音声コンテキストを遅延初期化する
  async getAudioContext() {
    if (!this.audioContext) {
      this.audioContext = this.audioContextFactory();
    }

    if (!this.audioContext) {
      return null;
    }

    if (this.audioContext.state === 'suspended' && typeof this.audioContext.resume === 'function') {
      await this.audioContext.resume();
    }

    return this.audioContext;
  }

  // 爆発音を短いノイズ風トーンで鳴らす
  async playExplosion(intensity = 1) {
    try {
      const audioContext = await this.getAudioContext();
      if (!audioContext) {
        return;
      }

      const safeIntensity = Math.min(Math.max(intensity, 0.2), 1.5);
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      const now = audioContext.currentTime;

      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(180, now);
      oscillator.frequency.exponentialRampToValueAtTime(50, now + 0.18);

      gainNode.gain.setValueAtTime(0.0001, now);
      gainNode.gain.exponentialRampToValueAtTime(0.18 * safeIntensity, now + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.start(now);
      oscillator.stop(now + 0.21);
    } catch (error) {
      console.warn('Failed to play explosion sound:', error);
    }
  }
}
