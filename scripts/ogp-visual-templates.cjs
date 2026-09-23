'use strict';

// Visual cards for the 28 custom OGP designs
const VISUAL_CARDS = {
  'diamond-valley': `
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; width: 100%;">
      <div style="position: relative; width: 120px; height: 120px; display: flex; align-items: center; justify-content: center;">
        <div style="position: absolute; inset: 0; background: radial-gradient(circle, rgba(129, 140, 248, 0.4) 0%, transparent 70%); border-radius: 50%;"></div>
        <svg width="100" height="100" viewBox="0 0 24 24" fill="none">
          <polygon points="6 3 18 3 22 9 12 22 2 9 6 3" stroke="#a5b4fc" stroke-width="1.8" fill="rgba(129, 140, 248, 0.25)"></polygon>
          <polyline points="2 9 12 22 22 9" stroke="#818cf8" stroke-width="1.8"></polyline>
          <line x1="12" y1="3" x2="12" y2="22" stroke="#c7d2fe" stroke-width="1.5"></line>
          <line x1="6" y1="3" x2="12" y2="9" stroke="#c7d2fe" stroke-width="1.5"></line>
          <line x1="18" y1="3" x2="12" y2="9" stroke="#c7d2fe" stroke-width="1.5"></line>
        </svg>
      </div>
      <div style="background: linear-gradient(135deg, rgba(129, 140, 248, 0.2) 0%, rgba(99, 102, 241, 0.1) 100%); border: 1.5px solid rgba(129, 140, 248, 0.5); border-radius: 12px; padding: 10px 24px; text-align: center;">
        <div style="font-size: 14px; color: #c7d2fe; font-weight: 700; letter-spacing: 1px;">GOOGLE PLAY EVENT</div>
        <div style="font-size: 22px; font-weight: 900; color: #ffffff; margin-top: 2px;">2026 DIAMOND VALLEY</div>
      </div>
    </div>
  `,

  'monst-packs': `
    <div style="display: flex; flex-direction: column; align-items: center; gap: 12px; width: 100%;">
      <div style="display: flex; gap: 10px; width: 100%;">
        <div style="flex: 1; background: rgba(245, 158, 11, 0.15); border: 1.5px solid rgba(245, 158, 11, 0.4); border-radius: 12px; padding: 10px; text-align: center;">
          <div style="font-size: 13px; color: #fcd34d; font-weight: 700;">初購入パック</div>
          <div style="font-size: 20px; font-weight: 800; color: #ffffff; margin-top: 2px;">コスパ <span style="color: #fbbf24;">S</span></div>
        </div>
        <div style="flex: 1; background: rgba(56, 189, 248, 0.15); border: 1.5px solid rgba(56, 189, 248, 0.4); border-radius: 12px; padding: 10px; text-align: center;">
          <div style="font-size: 13px; color: #7dd3fc; font-weight: 700;">月間パック</div>
          <div style="font-size: 20px; font-weight: 800; color: #ffffff; margin-top: 2px;">コスパ <span style="color: #38bdf8;">A+</span></div>
        </div>
      </div>
      <div style="background: rgba(16, 185, 129, 0.15); border: 1.5px solid rgba(16, 185, 129, 0.4); border-radius: 12px; padding: 12px; width: 100%; text-align: center;">
        <div style="font-size: 13px; color: #6ee7b7; font-weight: 700;">Playポイント最大還元</div>
        <div style="font-size: 20px; font-weight: 900; color: #ffffff; margin-top: 2px;">実質オーブ単価を最小化</div>
      </div>
    </div>
  `,

  'monst-vs': `
    <div style="display: flex; flex-direction: column; align-items: center; gap: 14px; width: 100%;">
      <div style="background: rgba(56, 189, 248, 0.15); border: 1.5px solid rgba(56, 189, 248, 0.4); border-radius: 14px; padding: 12px 18px; width: 100%; text-align: center;">
        <div style="font-size: 14px; color: #94a3b8; font-weight: 600;">公式 Webショップ</div>
        <div style="font-size: 28px; font-weight: 900; color: #f8fafc; margin-top: 2px;">オーブ <span style="color: #38bdf8;">190</span> 個</div>
      </div>
      <div style="font-size: 18px; font-weight: 900; color: #f59e0b; background: rgba(245, 158, 11, 0.15); padding: 2px 16px; border-radius: 9999px; border: 1px solid #f59e0b55;">VS</div>
      <div style="background: rgba(16, 185, 129, 0.15); border: 1.5px solid rgba(16, 185, 129, 0.4); border-radius: 14px; padding: 12px 18px; width: 100%; text-align: center;">
        <div style="font-size: 14px; color: #94a3b8; font-weight: 600;">Google Play (アプリ内)</div>
        <div style="font-size: 26px; font-weight: 900; color: #f8fafc; margin-top: 2px;">200個 <span style="font-size: 16px; color: #34d399;">+ Play pt</span></div>
      </div>
    </div>
  `,

  'calendar': `
    <div style="display: flex; flex-direction: column; gap: 10px; width: 100%;">
      <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(16, 185, 129, 0.15); border: 1.5px solid rgba(16, 185, 129, 0.4); border-radius: 12px; padding: 10px 16px;">
        <span style="font-size: 15px; color: #a7f3d0; font-weight: 700;">毎月1日</span>
        <span style="font-size: 18px; color: #ffffff; font-weight: 900;">Playポイントデー (最大7倍)</span>
      </div>
      <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(56, 189, 248, 0.15); border: 1.5px solid rgba(56, 189, 248, 0.4); border-radius: 12px; padding: 10px 16px;">
        <span style="font-size: 15px; color: #bae6fd; font-weight: 700;">毎週金曜</span>
        <span style="font-size: 18px; color: #ffffff; font-weight: 900;">ウィークリーリワード</span>
      </div>
      <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(245, 158, 11, 0.15); border: 1.5px solid rgba(245, 158, 11, 0.4); border-radius: 12px; padding: 10px 16px;">
        <span style="font-size: 15px; color: #fde68a; font-weight: 700;">月末・年末</span>
        <span style="font-size: 18px; color: #ffffff; font-weight: 900;">失効対策・ランク判定</span>
      </div>
    </div>
  `,

  'quests': `
    <div style="display: flex; flex-direction: column; align-items: center; gap: 14px; width: 100%;">
      <div style="display: flex; align-items: center; gap: 12px; background: rgba(6, 182, 212, 0.15); border: 1.5px solid rgba(6, 182, 212, 0.4); border-radius: 14px; padding: 14px 20px; width: 100%;">
        <div style="background: #06b6d4; border-radius: 50%; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; font-size: 20px;">✓</div>
        <div>
          <div style="font-size: 13px; color: #a5f3fc; font-weight: 600;">条件達成で即付与</div>
          <div style="font-size: 20px; font-weight: 900; color: #ffffff;">特別ボーナスポイント</div>
        </div>
      </div>
      <div style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 12px; width: 100%; text-align: center;">
        <div style="font-size: 15px; color: #e2e8f0; font-weight: 700;">購入前に「開始」ボタンが必須！</div>
      </div>
    </div>
  `,

  'multiplier-stacking': `
    <div style="display: flex; flex-direction: column; align-items: center; gap: 14px; width: 100%;">
      <div style="display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%;">
        <div style="background: rgba(139, 92, 246, 0.2); border: 1.5px solid rgba(139, 92, 246, 0.5); border-radius: 12px; padding: 12px; text-align: center; flex: 1;">
          <div style="font-size: 12px; color: #ddd6fe; font-weight: 600;">ランク基本</div>
          <div style="font-size: 22px; font-weight: 900; color: #ffffff;">1〜2%</div>
        </div>
        <div style="font-size: 24px; font-weight: 900; color: #a78bfa;">+</div>
        <div style="background: rgba(245, 158, 11, 0.2); border: 1.5px solid rgba(245, 158, 11, 0.5); border-radius: 12px; padding: 12px; text-align: center; flex: 1;">
          <div style="font-size: 12px; color: #fde68a; font-weight: 600;">増量枠</div>
          <div style="font-size: 22px; font-weight: 900; color: #ffffff;">+2〜6倍</div>
        </div>
      </div>
      <div style="background: rgba(16, 185, 129, 0.2); border: 1.5px solid rgba(16, 185, 129, 0.5); border-radius: 14px; padding: 12px; width: 100%; text-align: center;">
        <div style="font-size: 13px; color: #a7f3d0; font-weight: 700;">計算ルール</div>
        <div style="font-size: 20px; font-weight: 900; color: #ffffff; margin-top: 2px;">乗算ではなく加算で計算</div>
      </div>
    </div>
  `,

  'tgs-vip': `
    <div style="display: flex; flex-direction: column; align-items: center; gap: 12px; width: 100%;">
      <div style="background: linear-gradient(135deg, rgba(236, 72, 153, 0.2) 0%, rgba(168, 85, 247, 0.2) 100%); border: 1.5px solid rgba(236, 72, 153, 0.5); border-radius: 14px; padding: 16px; width: 100%; text-align: center;">
        <div style="font-size: 13px; color: #fbcfe8; font-weight: 800; letter-spacing: 1px;">TOKYO GAME SHOW 2026</div>
        <div style="font-size: 26px; font-weight: 900; color: #ffffff; margin-top: 4px;">VIP LOUNGE PASS</div>
      </div>
      <div style="display: flex; gap: 8px; width: 100%;">
        <div style="flex: 1; background: rgba(255,255,255,0.06); border-radius: 10px; padding: 8px; text-align: center; font-size: 14px; color: #e2e8f0; font-weight: 700;">限定グッズ</div>
        <div style="flex: 1; background: rgba(255,255,255,0.06); border-radius: 10px; padding: 8px; text-align: center; font-size: 14px; color: #e2e8f0; font-weight: 700;">ダイヤモンド特典</div>
      </div>
    </div>
  `,

  'promo-missing': `
    <div style="display: flex; flex-direction: column; gap: 10px; width: 100%;">
      <div style="background: rgba(249, 115, 22, 0.15); border: 1.5px solid rgba(249, 115, 22, 0.4); border-radius: 12px; padding: 10px 16px;">
        <div style="font-size: 13px; color: #fed7aa; font-weight: 600;">原因 1</div>
        <div style="font-size: 17px; font-weight: 800; color: #ffffff;">対象ユーザー限定（ターゲット配信）</div>
      </div>
      <div style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 10px 16px;">
        <div style="font-size: 13px; color: #cbd5e1; font-weight: 600;">原因 2</div>
        <div style="font-size: 17px; font-weight: 800; color: #ffffff;">複数アカウントの切り替えミス</div>
      </div>
      <div style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 10px 16px;">
        <div style="font-size: 13px; color: #cbd5e1; font-weight: 600;">原因 3</div>
        <div style="font-size: 17px; font-weight: 800; color: #ffffff;">アプリ内キャッシュ・開始忘れ</div>
      </div>
    </div>
  `,

  '1-value': `
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; width: 100%;">
      <div style="background: rgba(20, 184, 166, 0.2); border: 2px solid #14b8a6; border-radius: 20px; padding: 20px; width: 100%; text-align: center;">
        <div style="font-size: 15px; color: #99f6e4; font-weight: 700;">基本の換算レート</div>
        <div style="font-size: 44px; font-weight: 900; color: #ffffff; margin-top: 4px;">
          1 <span style="font-size: 24px; color: #2dd4bf;">pt</span> ＝ 1 <span style="font-size: 24px; color: #2dd4bf;">円</span>
        </div>
      </div>
      <div style="font-size: 16px; color: #cbd5e1; font-weight: 600;">100円課金で 1〜2 pt 還元</div>
    </div>
  `,

  '100-value': `
    <div style="display: flex; flex-direction: column; gap: 10px; width: 100%;">
      <div style="font-size: 14px; color: #7dd3fc; font-weight: 700; text-align: center;">100ポイント貯める課金額</div>
      <div style="display: flex; justify-content: space-between; background: rgba(255,255,255,0.06); padding: 8px 14px; border-radius: 8px;">
        <span style="color: #cbd5e1; font-weight: 600;">ブロンズ (1.0%)</span>
        <span style="color: #ffffff; font-weight: 800;">10,000円</span>
      </div>
      <div style="display: flex; justify-content: space-between; background: rgba(255,255,255,0.06); padding: 8px 14px; border-radius: 8px;">
        <span style="color: #cbd5e1; font-weight: 600;">ゴールド (1.3%)</span>
        <span style="color: #ffffff; font-weight: 800;">約 7,700円</span>
      </div>
      <div style="display: flex; justify-content: space-between; background: rgba(14, 165, 233, 0.2); border: 1px solid #0ea5e9; padding: 8px 14px; border-radius: 8px;">
        <span style="color: #bae6fd; font-weight: 700;">ダイヤモンド (2.0%)</span>
        <span style="color: #ffffff; font-weight: 900;">5,000円</span>
      </div>
    </div>
  `,

  'cash-conversion': `
    <div style="display: flex; flex-direction: column; align-items: center; gap: 14px; width: 100%;">
      <div style="background: rgba(239, 68, 68, 0.15); border: 1.5px solid rgba(239, 68, 68, 0.5); border-radius: 12px; padding: 12px 18px; width: 100%; text-align: center;">
        <div style="font-size: 14px; color: #fca5a5; font-weight: 700;">現金化・PayPay交換</div>
        <div style="font-size: 26px; font-weight: 900; color: #ef4444; margin-top: 2px;">公式規約で不可 ✕</div>
      </div>
      <div style="background: rgba(16, 185, 129, 0.15); border: 1.5px solid rgba(16, 185, 129, 0.5); border-radius: 12px; padding: 12px 18px; width: 100%; text-align: center;">
        <div style="font-size: 14px; color: #6ee7b7; font-weight: 700;">推奨する賢い使い道</div>
        <div style="font-size: 22px; font-weight: 900; color: #ffffff; margin-top: 2px;">Playクレジット・割引 ◎</div>
      </div>
    </div>
  `,

  'cannot-join': `
    <div style="display: flex; flex-direction: column; gap: 10px; width: 100%;">
      <div style="display: flex; align-items: center; gap: 10px; background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.4); padding: 10px 14px; border-radius: 10px;">
        <span style="color: #fbbf24; font-weight: 900;">1.</span>
        <span style="color: #ffffff; font-weight: 700; font-size: 16px;">年齢制限（13歳以上）</span>
      </div>
      <div style="display: flex; align-items: center; gap: 10px; background: rgba(255, 255, 255, 0.05); padding: 10px 14px; border-radius: 10px;">
        <span style="color: #94a3b8; font-weight: 900;">2.</span>
        <span style="color: #ffffff; font-weight: 700; font-size: 16px;">国/地域設定（日本）</span>
      </div>
      <div style="display: flex; align-items: center; gap: 10px; background: rgba(255, 255, 255, 0.05); padding: 10px 14px; border-radius: 10px;">
        <span style="color: #94a3b8; font-weight: 900;">3.</span>
        <span style="color: #ffffff; font-weight: 700; font-size: 16px;">支払いプロファイルの有効性</span>
      </div>
    </div>
  `,

  'earn-free': `
    <div style="display: flex; flex-direction: column; gap: 10px; width: 100%;">
      <div style="background: rgba(16, 185, 129, 0.2); border: 1px solid #10b981; border-radius: 12px; padding: 10px 16px;">
        <div style="font-size: 13px; color: #a7f3d0; font-weight: 700;">方法 1</div>
        <div style="font-size: 18px; font-weight: 900; color: #ffffff;">毎週のウィークリーリワード</div>
      </div>
      <div style="background: rgba(255, 255, 255, 0.06); border-radius: 12px; padding: 10px 16px;">
        <div style="font-size: 13px; color: #cbd5e1; font-weight: 700;">方法 2</div>
        <div style="font-size: 18px; font-weight: 900; color: #ffffff;">無料アプリインストール特典</div>
      </div>
      <div style="background: rgba(255, 255, 255, 0.06); border-radius: 12px; padding: 10px 16px;">
        <div style="font-size: 13px; color: #cbd5e1; font-weight: 700;">方法 3</div>
        <div style="font-size: 18px; font-weight: 900; color: #ffffff;">Google アンケートモニター併用</div>
      </div>
    </div>
  `,

  'super-weekly': `
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; width: 100%;">
      <div style="background: linear-gradient(135deg, rgba(168, 85, 247, 0.25) 0%, rgba(236, 72, 153, 0.2) 100%); border: 2px solid #c084fc; border-radius: 18px; padding: 16px; width: 100%; text-align: center;">
        <div style="font-size: 13px; color: #f3e8ff; font-weight: 800; letter-spacing: 0.5px;">プラチナ・ダイヤモンド限定</div>
        <div style="font-size: 32px; font-weight: 900; color: #ffffff; margin-top: 4px;">最大 1,000 pt</div>
      </div>
      <div style="font-size: 15px; color: #d8b4fe; font-weight: 700;">Pixel端末・特別賞品が当たるチャンス</div>
    </div>
  `,

  'fastest-silver': `
    <div style="display: flex; flex-direction: column; align-items: center; gap: 14px; width: 100%;">
      <div style="background: rgba(148, 163, 184, 0.15); border: 1.5px solid rgba(148, 163, 184, 0.5); border-radius: 16px; padding: 14px 20px; width: 100%; text-align: center;">
        <div style="font-size: 14px; color: #cbd5e1; font-weight: 700;">シルバー達成条件</div>
        <div style="font-size: 38px; font-weight: 900; color: #ffffff; margin-top: 2px;">250 <span style="font-size: 20px; color: #94a3b8;">pt</span></div>
      </div>
      <div style="background: rgba(16, 185, 129, 0.2); border: 1px solid #10b981; border-radius: 10px; padding: 8px 16px; font-size: 16px; color: #ffffff; font-weight: 800;">
        ✓ 毎週のリワードが永久解放！
      </div>
    </div>
  `,

  'super-ticket': `
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; width: 100%;">
      <div style="background: linear-gradient(135deg, rgba(245, 158, 11, 0.25) 0%, rgba(217, 119, 6, 0.15) 100%); border: 2px dashed #f59e0b; border-radius: 16px; padding: 18px 24px; width: 100%; text-align: center;">
        <div style="font-size: 13px; color: #fde68a; font-weight: 800; letter-spacing: 2px;">PREMIUM REWARD</div>
        <div style="font-size: 28px; font-weight: 900; color: #ffffff; margin-top: 4px;">SUPER TICKET</div>
      </div>
      <div style="font-size: 15px; color: #cbd5e1; font-weight: 600;">使い方・獲得条件・対象キャンペーン解説</div>
    </div>
  `,

  'credit-not-working': `
    <div style="display: flex; flex-direction: column; gap: 10px; width: 100%;">
      <div style="background: rgba(239, 68, 68, 0.15); border: 1.5px solid rgba(239, 68, 68, 0.4); border-radius: 12px; padding: 10px 16px;">
        <div style="font-size: 13px; color: #fca5a5; font-weight: 700;">残高上限エラー</div>
        <div style="font-size: 17px; font-weight: 800; color: #ffffff;">Google Play残高の上限に達している</div>
      </div>
      <div style="background: rgba(255, 255, 255, 0.05); border-radius: 12px; padding: 10px 16px;">
        <div style="font-size: 13px; color: #cbd5e1; font-weight: 700;">有効期限</div>
        <div style="font-size: 17px; font-weight: 800; color: #ffffff;">交換したクレジットは1年で失効</div>
      </div>
      <div style="background: rgba(255, 255, 255, 0.05); border-radius: 12px; padding: 10px 16px;">
        <div style="font-size: 13px; color: #cbd5e1; font-weight: 700;">アカウント不一致</div>
        <div style="font-size: 17px; font-weight: 800; color: #ffffff;">課金時と別のアカウントが選択中</div>
      </div>
    </div>
  `,

  'coupon-not-applied': `
    <div style="display: flex; flex-direction: column; gap: 10px; width: 100%;">
      <div style="background: rgba(249, 115, 22, 0.15); border: 1.5px solid rgba(249, 115, 22, 0.4); border-radius: 12px; padding: 10px 16px;">
        <div style="font-size: 13px; color: #fed7aa; font-weight: 700;">最低金額未達</div>
        <div style="font-size: 17px; font-weight: 800; color: #ffffff;">例: 500円クーポンは500円以上の商品</div>
      </div>
      <div style="background: rgba(255, 255, 255, 0.05); border-radius: 12px; padding: 10px 16px;">
        <div style="font-size: 13px; color: #cbd5e1; font-weight: 700;">対象外アイテム</div>
        <div style="font-size: 17px; font-weight: 800; color: #ffffff;">定期購入（サブスク）には使えない</div>
      </div>
      <div style="background: rgba(255, 255, 255, 0.05); border-radius: 12px; padding: 10px 16px;">
        <div style="font-size: 13px; color: #cbd5e1; font-weight: 700;">手動選択が必要</div>
        <div style="font-size: 17px; font-weight: 800; color: #ffffff;">支払い画面でタップして適用する</div>
      </div>
    </div>
  `,

  '500-1000-value': `
    <div style="display: flex; flex-direction: column; gap: 12px; width: 100%;">
      <div style="background: rgba(2, 132, 199, 0.2); border: 1.5px solid #0284c7; border-radius: 12px; padding: 12px 18px;">
        <div style="display: flex; justify-content: space-between; align-items: baseline;">
          <span style="font-size: 20px; font-weight: 900; color: #ffffff;">500 pt</span>
          <span style="font-size: 18px; font-weight: 800; color: #38bdf8;">＝ 500円相当</span>
        </div>
        <div style="font-size: 13px; color: #bae6fd; margin-top: 4px;">必要課金額: 2.5万〜5万円</div>
      </div>
      <div style="background: rgba(2, 132, 199, 0.2); border: 1.5px solid #0284c7; border-radius: 12px; padding: 12px 18px;">
        <div style="display: flex; justify-content: space-between; align-items: baseline;">
          <span style="font-size: 20px; font-weight: 900; color: #ffffff;">1,000 pt</span>
          <span style="font-size: 18px; font-weight: 800; color: #38bdf8;">＝ 1,000円相当</span>
        </div>
        <div style="font-size: 13px; color: #bae6fd; margin-top: 4px;">必要課金額: 5万〜10万円（ゴールド到達）</div>
      </div>
    </div>
  `,

  'levels-guide': `
    <div style="display: flex; flex-direction: column; gap: 8px; width: 100%;">
      <div style="display: flex; justify-content: space-between; background: rgba(129, 140, 248, 0.2); border-left: 4px solid #818cf8; padding: 6px 14px; border-radius: 6px;">
        <span style="color: #c7d2fe; font-weight: 800;">ダイヤモンド</span>
        <span style="color: #ffffff; font-weight: 800;">15,000 pt (2.0%)</span>
      </div>
      <div style="display: flex; justify-content: space-between; background: rgba(99, 102, 241, 0.15); border-left: 4px solid #6366f1; padding: 6px 14px; border-radius: 6px;">
        <span style="color: #a5b4fc; font-weight: 800;">プラチナ</span>
        <span style="color: #ffffff; font-weight: 800;">4,000 pt (1.4%)</span>
      </div>
      <div style="display: flex; justify-content: space-between; background: rgba(245, 158, 11, 0.15); border-left: 4px solid #f59e0b; padding: 6px 14px; border-radius: 6px;">
        <span style="color: #fde68a; font-weight: 800;">ゴールド</span>
        <span style="color: #ffffff; font-weight: 800;">1,000 pt (1.3%)</span>
      </div>
      <div style="display: flex; justify-content: space-between; background: rgba(148, 163, 184, 0.15); border-left: 4px solid #94a3b8; padding: 6px 14px; border-radius: 6px;">
        <span style="color: #cbd5e1; font-weight: 800;">シルバー</span>
        <span style="color: #ffffff; font-weight: 800;">250 pt (1.25%)</span>
      </div>
      <div style="display: flex; justify-content: space-between; background: rgba(217, 119, 6, 0.12); border-left: 4px solid #b45309; padding: 6px 14px; border-radius: 6px;">
        <span style="color: #fcd34d; font-weight: 700;">ブロンズ</span>
        <span style="color: #ffffff; font-weight: 700;">0 pt (1.0%)</span>
      </div>
    </div>
  `,

  'device-change': `
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; width: 100%;">
      <div style="display: flex; align-items: center; gap: 16px;">
        <div style="background: rgba(13, 148, 136, 0.2); border: 1.5px solid #0d9488; border-radius: 12px; padding: 12px 18px; text-align: center;">
          <div style="font-size: 13px; color: #5eead4;">旧端末</div>
          <div style="font-size: 18px; font-weight: 800; color: #ffffff;">Google垢</div>
        </div>
        <div style="font-size: 24px; color: #2dd4bf; font-weight: 900;">➔</div>
        <div style="background: rgba(13, 148, 136, 0.2); border: 1.5px solid #0d9488; border-radius: 12px; padding: 12px 18px; text-align: center;">
          <div style="font-size: 13px; color: #5eead4;">新端末</div>
          <div style="font-size: 18px; font-weight: 800; color: #ffffff;">自動同期</div>
        </div>
      </div>
      <div style="background: rgba(16, 185, 129, 0.2); border: 1px solid #10b981; border-radius: 10px; padding: 10px 18px; text-align: center; color: #ffffff; font-weight: 800; font-size: 16px;">
        ✓ ポイント・ランクは消えません！
      </div>
    </div>
  `,

  'country-change': `
    <div style="display: flex; flex-direction: column; gap: 10px; width: 100%;">
      <div style="background: rgba(220, 38, 38, 0.2); border: 1.5px solid #dc2626; border-radius: 12px; padding: 10px 16px;">
        <div style="font-size: 13px; color: #fca5a5; font-weight: 700;">重要制限</div>
        <div style="font-size: 18px; font-weight: 900; color: #ffffff;">国変更は 365日に1回 だけ</div>
      </div>
      <div style="background: rgba(255, 255, 255, 0.05); border-radius: 12px; padding: 10px 16px;">
        <div style="font-size: 13px; color: #cbd5e1; font-weight: 700;">残高・ポイント</div>
        <div style="font-size: 16px; font-weight: 800; color: #ffffff;">旧国のポイント・残高は引き継げない</div>
      </div>
    </div>
  `,

  'campaign-base': `
    <div style="display: flex; flex-direction: column; gap: 10px; width: 100%;">
      <div style="background: rgba(245, 158, 11, 0.2); border: 1.5px solid #f59e0b; border-radius: 12px; padding: 12px 16px; text-align: center;">
        <div style="font-size: 13px; color: #fde68a; font-weight: 700;">最大還元率</div>
        <div style="font-size: 26px; font-weight: 900; color: #ffffff; margin-top: 2px;">3倍 〜 最大7倍</div>
      </div>
      <div style="background: rgba(255, 255, 255, 0.06); border-radius: 12px; padding: 10px 16px; font-size: 15px; color: #e2e8f0; font-weight: 700; text-align: center;">
        予定課金はキャンペーンを待つのが鉄則！
      </div>
    </div>
  `,

  'getting-started-base': `
    <div style="display: flex; flex-direction: column; gap: 10px; width: 100%;">
      <div style="display: flex; align-items: center; gap: 12px; background: rgba(16, 185, 129, 0.2); border: 1px solid #10b981; border-radius: 12px; padding: 10px 16px;">
        <span style="background: #10b981; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 900;">1</span>
        <span style="font-size: 16px; font-weight: 800; color: #ffffff;">Playストアから無料登録</span>
      </div>
      <div style="display: flex; align-items: center; gap: 12px; background: rgba(255,255,255,0.06); border-radius: 12px; padding: 10px 16px;">
        <span style="background: #64748b; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 900;">2</span>
        <span style="font-size: 16px; font-weight: 800; color: #ffffff;">100円課金ごとに1pt貯まる</span>
      </div>
      <div style="display: flex; align-items: center; gap: 12px; background: rgba(255,255,255,0.06); border-radius: 12px; padding: 10px 16px;">
        <span style="background: #64748b; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 900;">3</span>
        <span style="font-size: 16px; font-weight: 800; color: #ffffff;">ランクアップで還元率アップ</span>
      </div>
    </div>
  `,

  'weekly-reward-base': `
    <div style="display: flex; flex-direction: column; align-items: center; gap: 14px; width: 100%;">
      <div style="background: rgba(59, 130, 246, 0.2); border: 1.5px solid #3b82f6; border-radius: 16px; padding: 16px 20px; width: 100%; text-align: center;">
        <div style="font-size: 14px; color: #93c5fd; font-weight: 700;">毎週金曜日 リセット</div>
        <div style="font-size: 32px; font-weight: 900; color: #ffffff; margin-top: 4px;">ハズレなし無料抽選</div>
      </div>
      <div style="font-size: 15px; color: #cbd5e1; font-weight: 700;">シルバー以上で毎週ポイントがもらえる</div>
    </div>
  `,

  'best-use-base': `
    <div style="display: flex; flex-direction: column; gap: 8px; width: 100%;">
      <div style="display: flex; justify-content: space-between; background: rgba(16, 185, 129, 0.2); border-left: 4px solid #10b981; padding: 8px 14px; border-radius: 6px;">
        <span style="color: #6ee7b7; font-weight: 800;">1位: ゲーム内アイテム</span>
        <span style="color: #ffffff; font-weight: 800;">還元率 最大</span>
      </div>
      <div style="display: flex; justify-content: space-between; background: rgba(56, 189, 248, 0.15); border-left: 4px solid #38bdf8; padding: 8px 14px; border-radius: 6px;">
        <span style="color: #7dd3fc; font-weight: 800;">2位: 専用クーポン</span>
        <span style="color: #ffffff; font-weight: 800;">高コスパ</span>
      </div>
      <div style="display: flex; justify-content: space-between; background: rgba(255, 255, 255, 0.06); border-left: 4px solid #94a3b8; padding: 8px 14px; border-radius: 6px;">
        <span style="color: #cbd5e1; font-weight: 800;">3位: Playクレジット</span>
        <span style="color: #ffffff; font-weight: 800;">全アプリ共通</span>
      </div>
    </div>
  `,

  'diamond-worth-it-base': `
    <div style="display: flex; flex-direction: column; align-items: center; gap: 14px; width: 100%;">
      <div style="background: linear-gradient(135deg, rgba(129, 140, 248, 0.25) 0%, rgba(99, 102, 241, 0.15) 100%); border: 2px solid #818cf8; border-radius: 16px; padding: 14px 20px; width: 100%; text-align: center;">
        <div style="font-size: 13px; color: #c7d2fe; font-weight: 700;">最上位ダイヤモンド</div>
        <div style="font-size: 32px; font-weight: 900; color: #ffffff; margin-top: 2px;">還元率 2.0%</div>
      </div>
      <div style="font-size: 15px; color: #cbd5e1; font-weight: 700;">VIPサポート・限定グッズの損得計算</div>
    </div>
  `,

  'multiple-accounts-base': `
    <div style="display: flex; flex-direction: column; align-items: center; gap: 14px; width: 100%;">
      <div style="background: rgba(239, 68, 68, 0.15); border: 1.5px solid rgba(239, 68, 68, 0.5); border-radius: 12px; padding: 12px 18px; width: 100%; text-align: center;">
        <div style="font-size: 13px; color: #fca5a5; font-weight: 700;">ポイント合算・移行</div>
        <div style="font-size: 26px; font-weight: 900; color: #ef4444; margin-top: 2px;">合算不可 ✕</div>
      </div>
      <div style="background: rgba(255, 255, 255, 0.06); border-radius: 12px; padding: 12px 16px; width: 100%; text-align: center; font-size: 15px; color: #e2e8f0; font-weight: 700;">
        課金アカウントを1つに集約するのが最得！
      </div>
    </div>
  `
};

module.exports = { VISUAL_CARDS };
