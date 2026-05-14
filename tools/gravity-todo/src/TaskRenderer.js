// TaskRenderer — パフォーマンス最適化版
// shadowBlur を除去（GPU負荷の最大原因）。テキスト縁取りは strokeText のみで実現。
export class TaskRenderer {
  constructor(ctx) {
    this.ctx = ctx;
    this.textColor = getComputedStyle(document.body).getPropertyValue('--text-main').trim() || '#f4f4f5';
  }

  draw(bodies) {
    const ctx = this.ctx;
    // フォントとアラインメントはフレーム頭で1回だけ設定
    ctx.font = "700 18px 'Noto Sans JP'";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';

    // 高負荷なshadowBlurのダウングレード判定: タスクが15個以下なら強発光、30個以下なら弱発光、それ以上はオフ
    let taskCount = 0;
    for (let i = 0; i < bodies.length; i++) {
      if (bodies[i].label === 'task' && bodies[i].taskText) taskCount++;
    }

    let blurAmount = 0;
    if (taskCount <= 15) {
      blurAmount = 12; // 強発光
    } else if (taskCount <= 30) {
      blurAmount = 6;  // 弱発光
    }

    for (let i = 0; i < bodies.length; i++) {
      const body = bodies[i];
      if (body.label !== 'task' || !body.taskText) continue;

      ctx.save();
      ctx.translate(body.position.x, body.position.y);
      ctx.rotate(body.angle);
      
      // ブロックの枠線色を発光色として使用
      const strokeColor = body.render.strokeStyle || '#ffffff';

      // ネオングロウ効果（テキストとブロック縁）
      if (blurAmount > 0) {
        ctx.shadowColor = strokeColor;
        ctx.shadowBlur = blurAmount;
      }

      ctx.strokeStyle = 'rgba(0,0,0,0.8)';
      ctx.strokeText(body.taskText, 0, 0);
      
      // テキスト自体も少し発光させる
      ctx.fillStyle = this.textColor;
      ctx.fillText(body.taskText, 0, 0);
      
      ctx.restore();
    }
  }
}
