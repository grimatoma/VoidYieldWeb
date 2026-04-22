import { Application, Container, Graphics, Text, TextStyle } from 'pixi.js';
import { EventBus } from '@services/EventBus';

function showSceneError(app: Application, sceneId: string, err: unknown): void {
  const msg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
  const overlay = new Container();
  const bg = new Graphics()
    .rect(0, 0, app.screen.width, app.screen.height)
    .fill({ color: 0x0D1B3E, alpha: 0.95 });
  overlay.addChild(bg);
  const title = new Text({
    text: `Scene "${sceneId}" failed to load`,
    style: new TextStyle({ fontFamily: 'monospace', fontSize: 16, fill: '#E53935', align: 'center' }),
  });
  title.anchor.set(0.5);
  title.x = app.screen.width / 2;
  title.y = app.screen.height / 2 - 20;
  overlay.addChild(title);
  const detail = new Text({
    text: msg.slice(0, 200),
    style: new TextStyle({
      fontFamily: 'monospace', fontSize: 11, fill: '#D4A843',
      align: 'center', wordWrap: true, wordWrapWidth: Math.min(560, app.screen.width - 40),
    }),
  });
  detail.anchor.set(0.5, 0);
  detail.x = app.screen.width / 2;
  detail.y = app.screen.height / 2 + 10;
  overlay.addChild(detail);
  app.stage.addChild(overlay);
}

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
    try {
      await scene.enter(this.app);
    } catch (err) {
      // If enter throws partway, the stage may be in an inconsistent state and
      // the scene ref never gets installed — which looks like "the map didn't
      // load" to the user. Surface the error rather than silently swallowing.
      console.error(`[SceneManager] scene "${id}" failed to enter:`, err);
      showSceneError(this.app, id, err);
      throw err;
    }
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
