import { Application } from 'pixi.js';
import { EventBus } from '@services/EventBus';

export interface Scene {
  id: string;
  /** Called once when the scene is first entered. */
  enter(app: Application): Promise<void>;
  /** Called every frame. delta is in seconds. */
  update(delta: number): void;
  /** Called when leaving. Clean up containers/listeners. */
  exit(): void;
}

export class SceneManager {
  private app: Application;
  private current: Scene | null = null;
  private registry = new Map<string, () => Promise<Scene>>();

  constructor(app: Application) {
    this.app = app;
  }

  register(id: string, factory: () => Promise<Scene>): void {
    this.registry.set(id, factory);
  }

  async switchTo(id: string): Promise<void> {
    if (this.current) {
      this.current.exit();
      // Destroy any remaining stage children so no zombie text/sprites leak
      // into the next scene. removeChildren alone detaches but doesn't destroy.
      const remaining = [...this.app.stage.children];
      for (const c of remaining) {
        try { c.destroy({ children: true }); } catch {}
      }
      this.app.stage.removeChildren();
    }
    const factory = this.registry.get(id);
    if (!factory) throw new Error(`SceneManager: unknown scene "${id}"`);
    const scene = await factory();
    await scene.enter(this.app);
    this.current = scene;
    EventBus.emit('scene:changed', id);
  }

  update(delta: number): void {
    this.current?.update(delta);
  }

  get currentId(): string | null {
    return this.current?.id ?? null;
  }
}
