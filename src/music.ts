export class GiftAudio {
  private audio?: HTMLAudioElement;
  private context?: AudioContext;
  private timer?: ReturnType<typeof setInterval>;
  private playing = false;
  private notes = [261.63, 329.63, 392, 523.25, 440, 392, 329.63, 293.66];
  private step = 0;
  constructor(private url: string) {}
  async play() {
    if (this.playing) return;
    if (this.url) {
      this.audio ??= new Audio(this.url);
      this.audio.loop = true;
      this.audio.volume = 0.35;
      await this.audio.play();
      this.playing = true;
      return;
    }
    this.context ??= new AudioContext();
    await this.context.resume();
    this.playing = true;
    const note = () => {
      if (!this.context) return;
      const osc = this.context.createOscillator();
      const gain = this.context.createGain();
      const t = this.context.currentTime;
      osc.type = "sine";
      osc.frequency.value = this.notes[this.step++ % this.notes.length];
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.055, t + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
      osc.connect(gain);
      gain.connect(this.context.destination);
      osc.start(t);
      osc.stop(t + 1.9);
    };
    note();
    this.timer = setInterval(note, 850);
  }
  pause() {
    this.audio?.pause();
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
    void this.context?.suspend();
    this.playing = false;
  }
  dispose() {
    this.pause();
    void this.context?.close();
    if (this.audio) this.audio.src = "";
    this.audio = undefined;
    this.context = undefined;
  }
}
