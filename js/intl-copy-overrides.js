'use strict';

import { CONFIGS } from './config.js';

// 静的生成の正本と、実行時に data-lang-key へ再適用される文言を同じ表現にそろえる。
if (CONFIGS.US?.uiText) {
    CONFIGS.US.uiText.tabDiary = 'Log weekly';
    CONFIGS.US.uiText.sectionTitleDiary = 'Weekly Rewards Diary';
}

if (CONFIGS.KR?.uiText) {
    CONFIGS.KR.uiText.title = 'Google Play Points 계산기 | 다음 등급까지 얼마가 필요할까?';
}

if (CONFIGS.TW?.uiText) {
    CONFIGS.TW.uiText.tabReverse = '這筆消費有幾點？';
    CONFIGS.TW.uiText.sectionTitleReverse = '反推模式';
}
