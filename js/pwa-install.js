'use strict';

import { STATE, ANALYTICS } from './config.js';

let deferredInstallPrompt = null;

function getInstallCopy() {
    const copy = {
        JP: {
            title: '次回もすぐ日記を開けます',
            body: 'この端末のホーム画面に追加すると、金曜の記録をすぐ始められます。',
            button: 'ホーム画面に追加'
        },
        US: {
            title: 'Open your diary faster next time',
            body: 'Add this tool to your device for quicker weekly entries.',
            button: 'Install app'
        },
        KR: {
            title: '다음 일지를 더 빠르게 열 수 있어요',
            body: '이 도구를 기기에 추가하면 매주 기록을 빠르게 시작할 수 있습니다.',
            button: '앱 설치'
        },
        TW: {
            title: '下次更快開啟日記',
            body: '將此工具加到裝置，即可更快開始每週記錄。',
            button: '安裝應用程式'
        },
        HK: {
            title: '下次更快開啟香港版日記',
            body: '將香港版加到裝置後，即可更快開始每週記錄。',
            button: '安裝應用程式'
        },
        IN: {
            title: 'Open your India diary faster next time',
            body: 'Add the India edition to your device for quicker weekly entries.',
            button: 'Install app'
        }
    };
    return copy[STATE.currentRegion] || copy.JP;
}

function showInstallPromptAfterDiarySave() {
    if (!deferredInstallPrompt || !STATE.dom.diaryMode) return;
    if (document.getElementById('pwa-install-card')) return;

    const copy = getInstallCopy();
    const card = document.createElement('aside');
    card.id = 'pwa-install-card';
    card.className = 'pwa-install-card';

    const text = document.createElement('div');
    const title = document.createElement('strong');
    const body = document.createElement('p');
    const button = document.createElement('button');
    title.textContent = copy.title;
    body.textContent = copy.body;
    button.type = 'button';
    button.textContent = copy.button;
    text.append(title, body);
    card.append(text, button);
    STATE.dom.diaryMode.appendChild(card);

    button.addEventListener('click', async () => {
        const promptEvent = deferredInstallPrompt;
        deferredInstallPrompt = null;
        card.remove();
        await promptEvent.prompt();
        const choice = await promptEvent.userChoice;
        if (choice.outcome === 'accepted') {
            ANALYTICS.track('pwa_install_accepted', {
                region: STATE.currentRegion,
                install_surface: 'after_diary_save'
            });
        }
    }, { once: true });
}

export function initPwaInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (event) => {
        event.preventDefault();
        deferredInstallPrompt = event;
    });

    document.addEventListener('playpoint:diary-saved', showInstallPromptAfterDiarySave);
}
