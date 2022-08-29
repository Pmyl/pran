export class AudioPlayer {
  private _audio: HTMLAudioElement;

  private constructor(audioBlob: Blob) {
    this._audio = new Audio(URL.createObjectURL(audioBlob));
  }

  public static createFromFile(filePath: string): Promise<AudioPlayer> {
    return fetch(filePath)
      .then(response => response.blob())
      .then(audioBlob => new AudioPlayer(audioBlob));
  }

  public play() {
    (this._audio.cloneNode() as HTMLAudioElement).play().catch(() => {});
  }
}