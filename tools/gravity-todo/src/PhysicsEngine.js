import { ParticleSystem } from './ParticleSystem.js';
import { StorageManager } from './StorageManager.js';
import { UIManager } from './UIManager.js';
import { TaskRenderer } from './TaskRenderer.js';
import { InteractionManager } from './InteractionManager.js';
import { SoundManager } from './SoundManager.js';
import { SettingsManager } from './SettingsManager.js';
import { TaskDetailPanel } from './TaskDetailPanel.js';
import { BGMManager } from './BGMManager.js';
import { GyroManager } from './GyroManager.js';
import { TimeTheme } from './TimeTheme.js';

export class PhysicsEngine {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      throw new Error(`Canvas container #${containerId} not found.`);
    }

    this.Engine    = Matter.Engine;
    this.Render    = Matter.Render;
    this.Runner    = Matter.Runner;
    this.Bodies    = Matter.Bodies;
    this.Body      = Matter.Body;
    this.Composite = Matter.Composite;
    this.Events    = Matter.Events;

    this.engine = this.Engine.create();
    this.world  = this.engine.world;
    this.width  = window.innerWidth;
    this.height = window.innerHeight;
    this.isNukingAll    = false;
    this.nukeTimeoutIds = [];
    this.dpr = window.devicePixelRatio || 1;

    this.render = this.Render.create({
      element: this.container,
      engine:  this.engine,
      options: {
        width: this.width,
        height: this.height,
        wireframes: false,
        background: 'transparent',
        pixelRatio: this.dpr,
      },
    });

    this.ctx = this.render.context;

    // Sub-modules
    this.particleSystem = new ParticleSystem(this.ctx);
    this.soundManager   = new SoundManager();
    this.uiManager      = new UIManager();
    this.taskRenderer   = new TaskRenderer(this.ctx);
    this.bgmManager     = new BGMManager();
    this.gyroManager    = new GyroManager(this.engine);
    this.timeTheme      = new TimeTheme();
    this.timeTheme.startAutoUpdate();
    this.taskDetailPanel = new TaskDetailPanel();
    this.taskDetailPanel.onExplodeRequest = (body) => this.destroyTask(body);
    this.taskDetailPanel.onChanged = () => {
      this.updateBlockDensity(this.taskDetailPanel.currentBody);
      void this.persistTasks();
      this.syncTaskList();
    };
    this.taskDetailPanel.onOpenStateChange = (isOpen) => {
      this.runner.enabled = !isOpen; // モーダル展開中は物理演算をポーズ
    };

    this.initWorld();

    this.interactionManager = new InteractionManager(
      this.engine, this.render, this.world,
      (body) => this.destroyTask(body),
      (body) => this.taskDetailPanel.open(body)
    );
    this.syncTaskList();

    // レンダリング開始
    this.Render.run(this.render);
    this.runner = this.Runner.create();
    this.Runner.run(this.runner, this.engine);

    this.Events.on(this.render, 'afterRender', () => {
      const bodies = this.Composite.allBodies(this.world);
      this.taskRenderer.draw(bodies);
      this.particleSystem.updateAndDraw();
    });

    // 画面外に飛んでいったブロックを自動で上空に戻す（Auto-Rescue）
    this.Events.on(this.engine, 'afterUpdate', () => {
      const margin = 500; // 画面外の許容範囲
      const bodies = this.getTaskBodies();
      for (let i = 0; i < bodies.length; i++) {
        const b = bodies[i];
        if (b.position.y > this.height + margin || b.position.x < -margin || b.position.x > this.width + margin) {
          // 画面上部中央へテレポート
          this.Body.setPosition(b, { x: this.width / 2, y: -50 });
          this.Body.setVelocity(b, { x: 0, y: 0 });
          this.Body.setAngularVelocity(b, 0);
        }
      }
    });

    // レイアウト確定後にタスク復元（床位置が正確になるのを待つ）
    this.ready = new Promise((resolve) => {
      requestAnimationFrame(() => {
        // app-readyクラス追加後の一次レイアウトを待つ
        setTimeout(async () => {
          this.rebuildFloor();
          await this.restoreTasks();
          resolve();
        }, 100);

        // CSSトランジション(0.5s)完了後に、最終的な正確な位置で床を再構築
        // これにより、入力フォームにブロックがめり込むのを防ぎます
        setTimeout(() => {
          this.rebuildFloor();
        }, 650);
      });
    });

    this.autoSaveIntervalId = window.setInterval(() => {
      void this.persistTasks();
    }, 30 * 60 * 1000); // 30分ごとに自動保存

    this.resizeHandler = this.debounce(() => this.handleResize(), 200);
    window.addEventListener('resize', this.resizeHandler);
  }

  // ---------- 床Y座標をフォーム上端から動的取得 ----------
  getFloorY() {
    const inputEl = document.querySelector('.input-container');
    if (!inputEl) return this.height - 200;
    return inputEl.getBoundingClientRect().top;
  }

  createWorldBounds() {
    const wallOpts = {
      isStatic: true,
      render: { fillStyle: '#000000', opacity: 0 },
      friction: 0.5,
    };
    const thickness = 200;
    const floorY = this.getFloorY();

    return {
      ground:    this.Bodies.rectangle(this.width / 2, floorY + thickness / 2, this.width * 2, thickness, wallOpts),
      leftWall:  this.Bodies.rectangle(-100, this.height / 2, 200, this.height * 3, wallOpts),
      rightWall: this.Bodies.rectangle(this.width + 100, this.height / 2, 200, this.height * 3, wallOpts),
    };
  }

  initWorld() {
    const bounds = this.createWorldBounds();
    this.ground    = bounds.ground;
    this.leftWall  = bounds.leftWall;
    this.rightWall = bounds.rightWall;
    this.Composite.add(this.world, [this.ground, this.leftWall, this.rightWall]);
  }

  // 床を再構築する（リサイズ・初回用）
  rebuildFloor() {
    this.Composite.remove(this.world, this.ground);
    this.Composite.remove(this.world, this.leftWall);
    this.Composite.remove(this.world, this.rightWall);
    const bounds = this.createWorldBounds();
    this.ground    = bounds.ground;
    this.leftWall  = bounds.leftWall;
    this.rightWall = bounds.rightWall;
    this.Composite.add(this.world, [this.ground, this.leftWall, this.rightWall]);
  }

  addTask(text, x = null, y = null, angle = 0, options = {}) {
    const { persist = true } = options;
    // 二重防御: ここでもHTMLメタ文字を除去
    const sanitized = String(text).replace(/[<>&"'`]/g, '');
    const safeText = sanitized.length > 20 ? sanitized.substring(0, 19) + '\u2026' : sanitized;
    if (safeText.length === 0) return;

    this.ctx.font = "700 18px 'Noto Sans JP'";
    const textWidth = this.ctx.measureText(safeText).width;
    const w = Math.max(textWidth + 44, 100);
    const h = 52;

    // X範囲: 画面幅の10%〜90%
    const margin = this.width * 0.1;
    const spawnX = x !== null ? x : margin + Math.random() * (this.width - margin * 2);
    const spawnY = y !== null ? y : -80;

    // 個別色 > グローバル設定の優先順位
    const blockColor  = options.blockColor  || SettingsManager.getBlockColor();
    const blockBorder = options.blockBorder || SettingsManager.getBlockBorder();

    const block = this.Bodies.rectangle(spawnX, spawnY, w, h, {
      label: 'task',
      angle: angle,
      restitution: 0.35,
      friction: 0.8,
      density: 0.05,
      chamfer: { radius: 8 },
      render: {
        fillStyle:   blockColor,
        strokeStyle: blockBorder,
        lineWidth: 2.5,
      },
    });

    block.taskText = safeText;
    block.subTasks = Array.isArray(options.subTasks) ? options.subTasks : [];
    this.Composite.add(this.world, block);

    if (persist) void this.persistTasks();
    this.uiManager.updateNukeButtonVisibility(this.getTaskCount());
    this.syncTaskList();
  }

  // 全ブロックの色を一括変更
  recolorAllBlocks() {
    const color  = SettingsManager.getBlockColor();
    const border = SettingsManager.getBlockBorder();
    this.getTaskBodies().forEach(body => {
      body.render.fillStyle   = color;
      body.render.strokeStyle = border;
    });
  }

  async restoreTasks() {
    const { hasSavedState, tasks } = await StorageManager.loadState();
    if (!hasSavedState) {
      setTimeout(() => this.addTask('企画書作成'), 300);
      setTimeout(() => this.addTask('メール返信'), 700);
      document.dispatchEvent(new CustomEvent('gravity:firstVisit'));
    } else {
      tasks.forEach(t => {
        const safeX = (t.x < 0 || t.x > this.width) ? this.width / 2 : t.x;
        const safeY = t.y > this.getFloorY() ? this.getFloorY() - 100 : t.y;
        this.addTask(t.text, safeX, safeY, t.angle, {
          persist: false,
          subTasks: t.subTasks || [],
          blockColor:  t.blockColor  || null,
          blockBorder: t.blockBorder || null,
        });
      });
      if (tasks.length > 0) void this.persistTasks();
    }
    this.uiManager.updateNukeButtonVisibility(this.getTaskCount());
  }

  persistTasks() {
    return StorageManager.saveTasks(this.Composite.allBodies(this.world));
  }

  destroyTask(body, skipUndo = false) {
    if (!body || body.label !== 'task') return;
    
    // Undo用のデータをクローン
    const taskData = {
      text: body.taskText,
      x: body.position.x,
      y: body.position.y,
      angle: body.angle,
      subTasks: body.subTasks ? JSON.parse(JSON.stringify(body.subTasks)) : [],
      blockColor: body.render.fillStyle,
      blockBorder: body.render.strokeStyle
    };

    try {
      this.Composite.remove(this.world, body);
    } catch (e) {
      console.warn('destroyTask: remove failed', e);
      return;
    }

    void this.soundManager.playExplosion(1);
    const c = body.render.strokeStyle || '#ff3366';
    this.particleSystem.explode(body.position.x, body.position.y, c);
    this.spawnDebris(body.position.x, body.position.y, body.render.fillStyle, c); // 破片生成
    this.uiManager.triggerShake();
    void this.persistTasks();
    this.uiManager.updateNukeButtonVisibility(this.getTaskCount());
    this.syncTaskList();

    // Undoスナックバーの表示（全消しの時は呼ばない）
    if (!skipUndo && !this.isNukingAll) {
      this.uiManager.showUndo(() => {
        this.addTask(taskData.text, taskData.x, taskData.y, taskData.angle, {
          persist: true,
          subTasks: taskData.subTasks,
          blockColor: taskData.blockColor,
          blockBorder: taskData.blockBorder
        });
      });
    }
  }

  nukeAll() {
    if (this.isNukingAll) return;
    this.nukeTimeoutIds = [];

    const bodies = this.getTaskBodies();
    if (bodies.length === 0) return;
    this.isNukingAll = true;

    bodies.forEach((body, i) => {
      const id = setTimeout(() => {
        try { this.Composite.remove(this.world, body); } catch (e) { console.warn('nukeAll: remove failed', e); return; }
        void this.soundManager.playExplosion(0.7);
        const c = body.render.strokeStyle || '#ff3366';
        this.particleSystem.explode(body.position.x, body.position.y, c);
        this.spawnDebris(body.position.x, body.position.y, body.render.fillStyle, c); // 破片生成
        this.uiManager.updateNukeButtonVisibility(this.getTaskCount());
        this.syncTaskList();
      }, i * 50);
      this.nukeTimeoutIds.push(id);
    });

    this.uiManager.triggerShake(bodies.length * 50 + 400);

    const finalId = setTimeout(() => {
      void this.persistTasks(); // 保存は最後に1回だけ
      this.uiManager.updateNukeButtonVisibility(this.getTaskCount());
      this.syncTaskList();
      this.isNukingAll = false;
      this.nukeTimeoutIds = [];
    }, bodies.length * 50 + 100);
    this.nukeTimeoutIds.push(finalId);
  }

  getTaskBodies() {
    return this.Composite.allBodies(this.world).filter(b => b.label === 'task');
  }

  confirmAndNukeAll() {
    const count = this.getTaskCount();
    if (count === 0) return;
    const ok = window.confirm(`${count}件のタスクをすべて爆破します。元に戻せません。実行しますか？`);
    if (ok) this.nukeAll();
  }

  syncTaskList() {
    this.uiManager?.renderTaskList?.(this.getTaskBodies(), {
      onOpenDetail: (body) => this.taskDetailPanel.open(body),
      onComplete: (body) => this.floatAndExplode(body),
      onDestroy: (body) => this.destroyTask(body)
    });
  }

  getTaskCount() {
    return this.getTaskBodies().length;
  }

  // タスクを上空から降らせて再配置する（整理ボタン用）
  rearrangeTasks() {
    const bodies = this.getTaskBodies();
    if (bodies.length === 0) return;
    
    // 少しずつ時間をずらして上空へワープさせる
    bodies.forEach((body, i) => {
      setTimeout(() => {
        // 壁の内側に収まるランダムなX座標
        const spawnX = this.width * 0.2 + Math.random() * (this.width * 0.6);
        this.Body.setPosition(body, { x: spawnX, y: -50 - Math.random() * 50 });
        this.Body.setVelocity(body, { x: 0, y: 0 });
        this.Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.2);
      }, i * 40); // 40ms間隔でパラパラと落とす
    });
  }

  // サブタスクの完了率に応じてブロックの密度を変化させる
  updateBlockDensity(body) {
    if (!body || body.label !== 'task') return;
    const subs = body.subTasks;
    if (!Array.isArray(subs) || subs.length === 0) return;

    const total = subs.length;
    const done  = subs.filter(s => s.done).length;
    const ratio = done / total; // 0.0 ~ 1.0

    // 全部完了 → 浮上して爆破！
    if (ratio >= 1.0) {
      this.floatAndExplode(body);
      return;
    }

    // 密度を線形に変化: 0.05（未完了）→ 0.005（ほぼ完了）
    const newDensity = 0.05 - (ratio * 0.045);
    this.Body.setDensity(body, newDensity);

    // ブロックの透明度も変化（完了に近づくと明るく発光）
    const glow = ratio * 0.5;
    const baseColor = body.render.strokeStyle || '#ff3366';
    body.render.lineWidth = 2.5 + ratio * 2; // 枠線が太くなる
  }

  // 映画的な物理破片（Debris）の生成
  spawnDebris(x, y, fillStyle, strokeStyle) {
    const debrisCount = 4 + Math.floor(Math.random() * 3); // 4〜6個（少なめに制限）
    const debrisBodies = [];
    
    for (let i = 0; i < debrisCount; i++) {
      const size = 8 + Math.random() * 12; // 小さめの破片
      const angle = Math.random() * Math.PI * 2;
      const speed = 10 + Math.random() * 15;
      
      const debris = this.Bodies.rectangle(x, y, size, size, {
        label: 'debris',
        restitution: 0.6,
        friction: 0.1,
        frictionAir: 0.02,
        render: {
          fillStyle: fillStyle || '#18181b',
          strokeStyle: strokeStyle || '#ff3366',
          lineWidth: 2
        },
        // 破片同士や他のタスクと衝突しない（壁と床のみ衝突）ようにカリングしCPU負荷を削減
        collisionFilter: {
          category: 0x0002,
          mask: 0x0001 // 壁・床のデフォルトカテゴリ(0x0001)とのみ衝突
        }
      });
      
      // 放射状に弾け飛ぶ力を加える
      this.Body.setVelocity(debris, {
        x: Math.cos(angle) * speed,
        y: Math.sin(angle) * speed - 5 // やや上向き
      });
      
      // 回転も加える
      this.Body.setAngularVelocity(debris, (Math.random() - 0.5) * 0.5);
      
      debrisBodies.push(debris);
    }
    
    this.Composite.add(this.world, debrisBodies);
    
    // パフォーマンスのため、1.5秒後に自動消滅させる
    setTimeout(() => {
      try {
        this.Composite.remove(this.world, debrisBodies);
      } catch (e) {
        // ignore
      }
    }, 1500);
  }

  // 全サブタスク完了時: ブロックが上に浮かんで弾ける
  floatAndExplode(body) {
    if (!body || body._floating) return;
    body._floating = true; // 二重起動防止フラグ

    // 初期山なりの上向き速度を付与
    this.Body.setVelocity(body, { x: (Math.random() - 0.5) * 3, y: -12 });

    // 重力を打ち消す力を毎フレーム加える（Matter.jsの天井となる座標より上に行くまで続ける）
    // engine.world.gravity.y = 1 のとき、mass * gravity * scaleForce で打ち消す
    const floatForce = () => {
      if (!body.position || body.position.y < -120) return;
      // 重力そのまま上房向へ：重力を反転 + 追加の上向き力
      const gy = this.engine.gravity.y;
      const antiGravity = body.mass * gy * 0.0001; // 重力を完全に打ち消す
      const liftForce   = 0.0005;                  // 追加の浮力
      this.Body.applyForce(body, body.position, { x: 0, y: -(antiGravity + liftForce) });
    };

    this.Events.on(this.engine, 'afterUpdate', floatForce);

    // 1.5秒後に爆破（天井層付近まで浮上する時間）
    setTimeout(() => {
      this.Events.off(this.engine, 'afterUpdate', floatForce);
      this.destroyTask(body);
    }, 1500);
  }

  handleResize() {
    this.width  = window.innerWidth;
    this.height = window.innerHeight;
    this.dpr    = window.devicePixelRatio || 1;

    this.render.canvas.width  = this.width * this.dpr;
    this.render.canvas.height = this.height * this.dpr;
    this.render.options.width      = this.width;
    this.render.options.height     = this.height;
    this.render.options.pixelRatio = this.dpr;

    if (this.render.canvas.style) {
      this.render.canvas.style.width  = `${this.width}px`;
      this.render.canvas.style.height = `${this.height}px`;
    }

    this.rebuildFloor();
  }

  debounce(fn, wait) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
  }

  destroy() {
    window.removeEventListener('resize', this.resizeHandler);
    clearInterval(this.autoSaveIntervalId);
    this.nukeTimeoutIds.forEach(id => clearTimeout(id));
    this.gyroManager.destroy();
    this.timeTheme.stop();
    this.Runner.stop(this.runner);
    this.Render.stop(this.render);
  }
}
