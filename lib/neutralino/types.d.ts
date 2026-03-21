interface NeutralinoOS {
  execCommand(command: string): Promise<{ stdOut: string; stdErr: string; exitCode: number }>;
  getEnv(key: string): Promise<string>;
  showNotification(title: string, content: string, icon?: string): Promise<void>;
}

interface NeutralinoWindow {
  setTitle(title: string): Promise<void>;
  minimize(): Promise<void>;
  maximize(): Promise<void>;
  unmaximize(): Promise<void>;
  show(): Promise<void>;
  hide(): Promise<void>;
  focus(): Promise<void>;
  isMaximized(): Promise<boolean>;
  isVisible(): Promise<boolean>;
}

interface NeutralinoComputer {
  getMousePosition(): Promise<{ x: number; y: number }>;
}

interface NeutralinoEvents {
  on(event: string, handler: (...args: unknown[]) => void): void;
  off(event: string, handler: (...args: unknown[]) => void): void;
}

interface Neutralino {
  os: NeutralinoOS;
  window: NeutralinoWindow;
  computer: NeutralinoComputer;
  events: NeutralinoEvents;
  init(): void;
}

declare global {
  interface Window {
    Neutralino?: Neutralino;
  }
}

export {};
