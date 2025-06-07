(function() {
    'use strict'; // Strictモードを有効化

    // --- 定数定義 ---
    const CLASS_VISIBLE = 'visible';
    const CLASS_HAS_RESULT = 'has-result';
    const CLASS_ACTIVE = 'active';
    const CLASS_HIDDEN = 'hidden';
    const SELECTOR_INFO_BTN = '.info-btn';
    const SELECTOR_TOOLTIP_BOX = '.tooltip-box';
    const SELECTOR_RESULT_ERROR = 'span[style*="color: red"]';

    // --- 国別設定オブジェクト ---
    // 現在のバージョンを示すキー ( 'JP' or 'US' )
    let currentRegion = 'JP'; 

    // 各国の設定をまとめる
    const regionConfigs = {
        'JP': {
            statuses: { "ブロンズ": 1.0, "シルバー": 1.25, "ゴールド": 1.5, "プラチナ": 1.75, "ダイヤモンド": 2.0 },
            statusRates: { 1.0: 1.0, 1.25: 1.25, 1.5: 1.5, 1.75: 1.75, 2.0: 2.0 },
            thresholds: { "シルバー": 250, "ゴールド": 1000, "プラチナ": 3000, "ダイヤモンド": 15000 },
            statusPointsMapping: { 1.0: ["シルバー", "ゴールド", "プラチナ", "ダイヤモンド"], 1.25: ["ゴールド", "プラチナ", "ダイヤモンド"], 1.5: ["プラチナ", "ダイヤモンド"], 1.75: ["ダイヤモンド"], 2.0: [] },
            uiText: {
                yenLabel: "円",
            }
        },
        'US': { // 海外版の設定 (値は仮のものです。後で正しいものに直しましょう！)
            statuses: { "Bronze": 1.0, "Silver": 1.1, "Gold": 1.2, "Platinum": 1.4, "Diamond": 1.6 },
            statusRates: { 1.0: 1.0, 1.1: 1.1, 1.2: 1.2, 1.4: 1.4, 1.6: 1.6 },
            thresholds: { "Silver": 150, "Gold": 600, "Platinum": 2500, "Diamond": 12000 },
            statusPointsMapping: { 1.0: ["Silver", "Gold", "Platinum", "Diamond"], 1.1: ["Gold", "Platinum", "Diamond"], 1.2: ["Platinum", "Diamond"], 1.4: ["Diamond"], 1.6: [] },
            uiText: {
                yenLabel: "USD",
            }
        }
    };

    // --- DOM要素参照 (初期化時に設定) ---
    let mainModeDiv, reverseModeDiv, tabButtons,
        currentStatusSelect, baseRateInput, targetStatusSelect, neededPointsInput, multiplierInput, calculateButton, resultDiv, copyButton, tweetButton,
        amountYenInput, reverseStatusSelect, reverseBaseRateInput, reverseMultiplierInput, reverseCalculateButton, reverseResultDiv,
        infoButtons, shareTwitterReverseButton;

    // --- 関数定義 ---

    function getRemainingMonths() {
        const today = new Date();
        return 12 - today.getMonth();
    }

    function updateBaseRateAndTarget() {
        const config = regionConfigs[currentRegion];
        if (!currentStatusSelect || !baseRateInput || !targetStatusSelect || !config) return;

        const currentStatusValue = parseFloat(currentStatusSelect.value);
        baseRateInput.value = (config.statusRates[currentStatusValue] || 1.0).toFixed(2);

        targetStatusSelect.innerHTML = "";
        const availableTargets = config.statusPointsMapping[currentStatusValue] || [];
        availableTargets.forEach(targetLabel => {
            const points = config.thresholds[targetLabel];
            if (points) {
                const option = document.createElement("option");
                option.value = points;
                option.textContent = `${targetLabel} (${points}pt)`;
                option.dataset.statusLabel = targetLabel;
                targetStatusSelect.appendChild(option);
            }
        });
        if (availableTargets.length === 0) {
            const option = document.createElement("option");
            option.textContent = "次の目標はありません";
            option.disabled = true;
            targetStatusSelect.appendChild(option);
        }
    }

    function updateReverseBaseRate() {
        const config = regionConfigs[currentRegion];
        if (!reverseStatusSelect || !reverseBaseRateInput || !config) return;
        const selectedStatusValue = parseFloat(reverseStatusSelect.value);
        reverseBaseRateInput.value = (config.statusRates[selectedStatusValue] || 1.0).toFixed(2);
    }
    
    function populateStatusSelects() {
        const config = regionConfigs[currentRegion];
        const statuses = config.statuses;
        
        currentStatusSelect.innerHTML = '';
        reverseStatusSelect.innerHTML = '';

        for (const [name, value] of Object.entries(statuses)) {
            currentStatusSelect.add(new Option(name, value));
            reverseStatusSelect.add(new Option(name, value));
        }
        
        // デフォルト値（ゴールドなど）を選択
        const goldValue = Object.keys(config.statuses).find(key => key.includes('ゴールド') || key.includes('Gold'));
        if(goldValue) {
            currentStatusSelect.value = config.statuses[goldValue];
            reverseStatusSelect.value = config.statuses[goldValue];
        }
    }

    function getValidNumberInput(element, minValue = -Infinity, maxValue = Infinity) {
        if (!element) return null;
        const value = parseFloat(element.value);
        if (isNaN(value) || value < minValue || value > maxValue) return null;
        return value;
    }

    function displayError(targetElement, message) {
        if (!targetElement) return;
        targetElement.innerHTML = `<span style="color: red;">${message}</span>`;
        targetElement.classList.add(CLASS_HAS_RESULT);
        targetElement.removeAttribute('data-required-yen');
        targetElement.removeAttribute('data-target-status-label');
        targetElement.removeAttribute('data-earned-points');
        targetElement.removeAttribute('data-amount-yen');
        if (tweetButton && targetElement === resultDiv) tweetButton.classList.add(CLASS_HIDDEN);
        if (shareTwitterReverseButton && targetElement === reverseResultDiv) shareTwitterReverseButton.classList.add(CLASS_HIDDEN);
    }

    function clearResult(targetElement) {
        if (!targetElement) return;
        targetElement.innerHTML = "";
        targetElement.classList.remove(CLASS_HAS_RESULT);
        targetElement.removeAttribute('data-required-yen');
        targetElement.removeAttribute('data-target-status-label');
        targetElement.removeAttribute('data-earned-points');
        targetElement.removeAttribute('data-amount-yen');
        if (tweetButton && targetElement === resultDiv) tweetButton.classList.add(CLASS_HIDDEN);
        if (shareTwitterReverseButton && targetElement === reverseResultDiv) shareTwitterReverseButton.classList.add(CLASS_HIDDEN);
    }

    function getFinalRate(baseRateElement, statusSelectElement, multiplierElement) {
        const config = regionConfigs[currentRegion];
        const editedBaseRate = getValidNumberInput(baseRateElement, 0.01);
        const multiplier = getValidNumberInput(multiplierElement, 1);
        const statusValue = parseFloat(statusSelectElement.value);
        const statusRate = config.statusRates[statusValue];
        if (editedBaseRate === null || multiplier === null || !statusRate) return null;
        return Math.max(editedBaseRate, statusRate * multiplier);
    }

    function calculate() {
        if (!resultDiv || !targetStatusSelect) return;
        clearResult(resultDiv);
        const neededPoints = getValidNumberInput(neededPointsInput, 0.01);
        const finalRate = getFinalRate(baseRateInput, currentStatusSelect, multiplierInput);
        const selectedTargetOption = targetStatusSelect.options[targetStatusSelect.selectedIndex];
        const targetStatusLabel = selectedTargetOption ? selectedTargetOption.dataset.statusLabel : null;

        if (neededPoints === null || finalRate === null || !targetStatusLabel) {
             displayError(resultDiv, "有効な数値を入力し、目標ステータスを選択してください");
             return;
        }
        if (finalRate <= 0) {
             displayError(resultDiv, "計算に使用する還元率が0以下です");
             return;
        }

        const remainingMonths = getRemainingMonths();
        if (remainingMonths <= 0) { displayError(resultDiv, "残り月数計算エラー"); return; }

        const totalYenNeeded = Math.ceil((neededPoints / finalRate) * 100);
        const monthlyYenNeeded = Math.ceil(totalYenNeeded / remainingMonths);
        const config = regionConfigs[currentRegion];

        resultDiv.innerHTML = `
            ◆ 目標までの必要ポイント: <b>${neededPoints.toLocaleString('ja-JP')} pt</b><br>
            ◆ 合計の必要課金額目安: <b>${totalYenNeeded.toLocaleString('ja-JP')} ${config.uiText.yenLabel}</b><br>
            ◆ 月平均 (${remainingMonths}ヶ月): <b>約 ${monthlyYenNeeded.toLocaleString('ja-JP')} ${config.uiText.yenLabel}/月</b><br>
            <span style="font-size:0.8em; color:#666;">(適用還元率: ${finalRate.toFixed(2)} pt/100円)</span>
        `;
        resultDiv.classList.add(CLASS_HAS_RESULT);
        resultDiv.dataset.requiredYen = totalYenNeeded;
        resultDiv.dataset.targetStatusLabel = targetStatusLabel;
        if (tweetButton) tweetButton.classList.remove(CLASS_HIDDEN);
    }

    function reverseCalculate() {
        if (!reverseResultDiv) return;
        clearResult(reverseResultDiv);
        const amountYen = getValidNumberInput(amountYenInput, 0);
        const finalRate = getFinalRate(reverseBaseRateInput, reverseStatusSelect, reverseMultiplierInput);

        if (amountYen === null || finalRate === null) {
            displayError(reverseResultDiv, "有効な数値を入力してください");
            return;
        }
         if (finalRate < 0) {
             displayError(reverseResultDiv, "計算に使用する還元率が負数です");
             return;
         }
        const earnedPoints = (amountYen / 100) * finalRate;
        const config = regionConfigs[currentRegion];

        reverseResultDiv.innerHTML = `
            ◆ 獲得ポイント予測: <b>${earnedPoints.toFixed(2)} pt</b><br>
             <span style="font-size:0.8em; color:#666;">(適用還元率: ${finalRate.toFixed(2)} pt/100円)</span>
             `;
        reverseResultDiv.classList.add(CLASS_HAS_RESULT);
        reverseResultDiv.dataset.earnedPoints = earnedPoints.toFixed(2);
        reverseResultDiv.dataset.amountYen = amountYen;
        if (shareTwitterReverseButton) shareTwitterReverseButton.classList.remove(CLASS_HIDDEN);
    }

    function copyResult() {
        if (!resultDiv) return;
        let textToCopy = "";
        const mainResultLines = resultDiv.querySelectorAll('b');
        if (mainResultLines.length > 0) {
            textToCopy = Array.from(mainResultLines)
                             .map(b => {
                                 const labelNode = b.previousSibling;
                                 const labelText = labelNode ? labelNode.textContent.trim().split(':')[0] : '';
                                 return labelText ? `${labelText}: ${b.innerText}` : b.innerText;
                             })
                             .join('\n');
        } else {
             textToCopy = (resultDiv.innerText || resultDiv.textContent || "").trim();
        }

        const isErrorMessage = resultDiv.querySelector(SELECTOR_RESULT_ERROR);
        if (isErrorMessage || !textToCopy || !resultDiv.classList.contains(CLASS_HAS_RESULT)) {
            alert("コピーする計算結果がありません");
            return;
        }

        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(textToCopy).then(() => {
                alert("計算結果をコピーしました！");
            }).catch(err => {
                fallbackCopyTextToClipboard(textToCopy);
            });
        } else {
            fallbackCopyTextToClipboard(textToCopy);
        }
    }

    function fallbackCopyTextToClipboard(text) {
        const tempTextArea = document.createElement("textarea");
        tempTextArea.value = text;
        tempTextArea.style.position = 'absolute'; tempTextArea.style.top = '-9999px'; tempTextArea.style.left = '-9999px';
        document.body.appendChild(tempTextArea);
        tempTextArea.focus(); tempTextArea.select();
        try {
            const successful = document.execCommand('copy');
            alert(successful ? "計算結果をコピーしました！" : "コピーに失敗しました");
        } catch (err) {
            alert("コピー中にエラーが発生しました");
        } finally {
            document.body.removeChild(tempTextArea);
        }
    }

    function switchMode(mode) {
        if (!mainModeDiv || !reverseModeDiv || !tabButtons) return;
        mainModeDiv.style.display = (mode === 'main') ? 'block' : 'none';
        reverseModeDiv.style.display = (mode === 'reverse') ? 'block' : 'none';
        tabButtons.forEach(button => {
            button.classList.toggle(CLASS_ACTIVE, button.dataset.mode === mode);
        });
        clearResult(resultDiv);
        clearResult(reverseResultDiv);
    }

    function toggleTooltip(event) {
        const btn = event.currentTarget;
        if (!btn) return;
        event.preventDefault(); event.stopPropagation();
        const tooltip = btn.nextElementSibling;
        if (!tooltip || !tooltip.classList.contains(SELECTOR_TOOLTIP_BOX.substring(1))) return;
        const isCurrentlyVisible = tooltip.classList.contains(CLASS_VISIBLE);
        closeAllTooltips(btn);
        if (!isCurrentlyVisible) {
            tooltip.classList.add(CLASS_VISIBLE);
            btn.setAttribute('aria-expanded', 'true');
        }
    }

    function closeAllTooltips(excludeButton = null) {
        document.querySelectorAll(`${SELECTOR_TOOLTIP_BOX}.${CLASS_VISIBLE}`).forEach(box => {
            const correspondingBtn = box.previousElementSibling;
            if (excludeButton && correspondingBtn === excludeButton) return;
            box.classList.remove(CLASS_VISIBLE);
            if (correspondingBtn && correspondingBtn.matches(SELECTOR_INFO_BTN)) {
                correspondingBtn.setAttribute('aria-expanded', 'false');
            }
        });
    }

    function handleDocumentClick(event) {
        if (!event.target.closest(SELECTOR_INFO_BTN) && !event.target.closest(SELECTOR_TOOLTIP_BOX)) {
            closeAllTooltips();
        }
    }

    function handleKeyDown(event) {
        if (event.key === 'Escape') {
            closeAllTooltips();
        }
    }

    function shareOnTwitter() {
        if (!resultDiv || !resultDiv.classList.contains(CLASS_HAS_RESULT)) {
            alert("シェアできる有効な計算結果がありません。");
            return;
        }
        const requiredYenRaw = resultDiv.dataset.requiredYen;
        const targetStatusLabel = resultDiv.dataset.targetStatusLabel;
        if (!requiredYenRaw || !targetStatusLabel || resultDiv.querySelector(SELECTOR_RESULT_ERROR)) {
            alert("シェアできる有効な計算結果がありません。");
            return;
        }
        const requiredYen = parseFloat(requiredYenRaw);
        const formattedYen = requiredYen.toLocaleString('ja-JP');
        const siteUrl = "https://playpoint-sim.com/";
        const tweetText = `【Play ポイント試算結果】\n${targetStatusLabel}ステータス到達まで\n${formattedYen}円課金が必要です。\n\n#Playポイント計算してみた\n#GooglePlayポイント\n\n${siteUrl}`;
        const encodedText = encodeURIComponent(tweetText);
        window.open(`https://twitter.com/intent/tweet?text=${encodedText}`, '_blank');
    }

    function shareOnTwitterReverse() {
        if (!reverseResultDiv || !reverseResultDiv.classList.contains(CLASS_HAS_RESULT)) {
            alert("シェアできる有効な計算結果がありません。");
            return;
        }
        const earnedPointsRaw = reverseResultDiv.dataset.earnedPoints;
        const amountYenRaw = reverseResultDiv.dataset.amountYen;
        if (reverseResultDiv.querySelector(SELECTOR_RESULT_ERROR) || !earnedPointsRaw || !amountYenRaw) {
            alert("シェアできる有効な計算結果がありません。");
            return;
        }
        const earnedPoints = parseFloat(earnedPointsRaw);
        const amountYen = parseFloat(amountYenRaw);
        const formattedPoints = earnedPoints.toLocaleString('ja-JP', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
        const formattedYen = amountYen.toLocaleString('ja-JP');
        const siteUrl = "https://playpoint-sim.com/";
        const hashtags = "#Playポイント計算してみた\n#GooglePlayポイント";
        const tweetText = `${formattedYen}円使うと、約 ${formattedPoints}ポイント 獲得できます！\n\n${hashtags}\n\n${siteUrl}`;
        const encodedText = encodeURIComponent(tweetText);
        window.open(`https://twitter.com/intent/tweet?text=${encodedText}`, '_blank');
    }

    // --- 初期化処理 ---
    document.addEventListener('DOMContentLoaded', function() {
        // DOM要素参照
        mainModeDiv = document.getElementById("mainMode");
        reverseModeDiv = document.getElementById("reverseMode");
        tabButtons = document.querySelectorAll(".tab-switch button");
        infoButtons = document.querySelectorAll(SELECTOR_INFO_BTN);
        currentStatusSelect = document.getElementById("currentStatus");
        baseRateInput = document.getElementById("baseRate");
        targetStatusSelect = document.getElementById("targetStatus");
        neededPointsInput = document.getElementById("neededPoints");
        multiplierInput = document.getElementById("multiplier");
        calculateButton = document.getElementById("calculateButton");
        resultDiv = document.getElementById("result");
        copyButton = document.getElementById("copyButton");
        tweetButton = document.getElementById("tweetButton");
        amountYenInput = document.getElementById("amountYen");
        reverseStatusSelect = document.getElementById("reverseStatus");
        reverseBaseRateInput = document.getElementById("reverseBaseRate");
        reverseMultiplierInput = document.getElementById("reverseMultiplier");
        reverseCalculateButton = document.getElementById("reverseCalculateButton");
        reverseResultDiv = document.getElementById("reverseResult");
        shareTwitterReverseButton = document.getElementById('share-twitter-reverse');

        // イベントリスナー
        currentStatusSelect.addEventListener('change', updateBaseRateAndTarget);
        calculateButton.addEventListener('click', calculate);
        copyButton.addEventListener('click', copyResult);
        tweetButton.addEventListener('click', shareOnTwitter);
        reverseStatusSelect.addEventListener('change', updateReverseBaseRate);
        reverseCalculateButton.addEventListener('click', reverseCalculate);
        shareTwitterReverseButton.addEventListener('click', shareOnTwitterReverse);
        tabButtons.forEach(button => button.addEventListener('click', () => switchMode(button.dataset.mode)));
        infoButtons.forEach(button => {
            button.addEventListener('click', toggleTooltip);
            button.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleTooltip(e); } });
        });
        document.addEventListener('click', handleDocumentClick);
        document.addEventListener('keydown', handleKeyDown);

        // 初期表示設定
        populateStatusSelects();
        updateBaseRateAndTarget();
        updateReverseBaseRate();
        switchMode('main');
    });

})();