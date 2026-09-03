'use strict';

import { CONFIGS } from './config.js';

// 静的HTMLの地域別文言と、実行時に data-lang-key へ再適用される文言を同じ表現にそろえる。
if (CONFIGS.KR?.uiText) {
    CONFIGS.KR.uiText.title = 'Google Play Points 계산기 | 다음 등급까지 얼마가 필요할까?';
}

if (CONFIGS.TW?.uiText) {
    CONFIGS.TW.uiText.tabReverse = '反推模式';
    CONFIGS.TW.uiText.sectionTitleReverse = '反推模式';
}
