'use strict';

function createLocales(todayStr) {
  return {
    'en': {
        region: 'US',
        langCode: 'en',           // BCP47 言語コード（lang属性・inLanguageに使用）
        inLanguage: 'en',
        title: 'Google Play Points Calculator | How much to reach the next level?',
        description: 'Google Play Points calculator. Estimate how much you need to spend to reach Silver, Gold, Platinum, or Diamond with campaign multipliers and weekly reward notes.',
        ogTitle: 'Google Play Points Calculator | How much to reach the next level?',
        ogDescription: 'Estimate Google Play Points level-up spending, reverse calculations, and campaign multiplier effects.',
        currency: 'USD',
        appName: 'Google Play Points Calculator',
        alternateName: 'Play Points Calculator',
        appDesc: 'An unofficial simulation tool to calculate required spending to reach Google Play Points goals based on your current status.',
        staticText: {
            mainTitle: 'Google Play Points Calculator',
            siteAlias: 'Also known as Play Points Calculator / unofficial tool',
            siteDescription: 'Calculate how much you need to spend to reach the next Google Play Points level.<br>Enter your current status, target status, and points needed to estimate spending with campaign multipliers.',
            linkAttention: '⚠️ Country notes',
            linkLatest: '🆕 Latest Hub',
            linkArticles: '📝 Articles',
            linkKatakata: '🧪 KatakataLab',
            fridayReminderText: 'After claiming your Weekly Reward, record it in your diary.',
            tabMain: 'Standard',
            tabReverse: 'Reverse',
            tabDiary: 'Weekly Awards Diary',
            firstStepTitle: 'Enter just 3 items first',
            firstStepCurrent: 'Current status',
            firstStepTarget: 'Target status',
            firstStepNeeded: 'Points needed',
            sectionTitleStatus: 'Status input',
            labelCurrentStatus: 'Current status',
            labelTargetStatus: 'Target status',
            labelNeededPoints: 'Points needed',
            neededPointsPlaceholder: 'e.g., 125',
            subtractRewardsLabel: 'Subtract estimated weekly rewards until end of year',
            packAmountLabel: 'Average pack spending per transaction (optional)',
            packAmountPlaceholder: 'e.g., 98',
            sectionTitleRate: 'Points rate settings',
            labelBaseRate: 'Base points per $1',
            labelMultiplier: 'Campaign multiplier (e.g., 3x)',
            warningRate: '* The calculator uses whichever is better: your input value or status rate x campaign multiplier.',
            calculateButton: 'Calculate amount',
            copyButton: 'Copy',
            tweetButton: 'Share on X',
            sectionTitleReverse: 'Reverse mode',
            labelAmountYen: 'Amount spent (USD)',
            amountYenPlaceholder: 'e.g., 50',
            labelMultiplierReverse: 'Campaign multiplier',
            reverseCalculateButton: 'Calculate points',
            sectionTitleDiary: 'Weekly Awards Diary',
            diaryHintCard: '<strong>Every Friday is Weekly Reward Day!</strong> Get your rewards from the Google Play Store and record them in your diary.',
            currentYearLabel: 'Current year',
            initialMonthLabel: 'January',
            monthlySummaryTitle: 'Monthly Summary',
            yearlySummaryTitle: 'Yearly Summary',
            totalLabel: 'Total:',
            averageLabel: 'Average:',
            perWeekUnit: 'pts/week',
            guestNotice: '[!] Right now, your diary records are saved only in this browser. If you clear cache or browsing data, the records may be lost.',
            reminderTitle: 'Friday Reward Notification (Calendar)',
            reminderDesc: 'Set up a weekly recurring reminder for the Weekly Reward and make logging a habit.',
            btnGoogleCal: 'Add to Google Calendar',
            btnICal: 'Add to Calendar App (iCal)',
            backupTitle: 'Backup & Restore Data',
            exportBtn: 'Export Data (Copy)',
            importBtn: 'Import Data (Restore)',
            confirmImportBtn: 'Execute Restore',
            backupPlaceholder: 'Paste your exported data here',
            linkPrivacy: 'Privacy Policy',
            linkTerms: 'Terms of Service',
            linkQA: 'Q&A & Afterword',
            linkFeedback: 'Feedback',
            linkAbout: 'What are Play Points?',
            linkDiscount: '💡 Discount Guide',
            linkAuthor: 'Operator & Policy'
        },
        faqJsonLd: `    <!-- FAQ_JSON_LD_START -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "How is the spending goal calculated?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "By inputting your current points and target status, we calculate the required spending based on your base point rate and any active multiplier campaigns."
          }
        },
        {
          "@type": "Question",
          "name": "What is the reverse calculation mode?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "By inputting the spending amount, the tool simulates the expected points you will earn based on your current status and campaign settings."
          }
        },
        {
          "@type": "Question",
          "name": "Is my weekly reward diary data saved?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "The data you enter is only saved in your browser's local storage. You can export it as a JSON file or restore it to prevent data loss due to cache clearance."
          }
        }
      ]
    }
    </script>
    <!-- FAQ_JSON_LD_END -->`,
        faqSection: `    <!-- FAQ_SECTION_START -->
    <section class="section">
        <h2>❓ Frequently Asked Questions (FAQ)</h2>
        <div class="faq-item">
            <h3>Q. How is the spending goal calculated?</h3>
            <p>A. By inputting your current points and target status, we calculate the required spending based on your base point rate and any active multiplier campaigns.</p>
        </div>
        <div class="faq-item">
            <h3>Q. What is the reverse calculation mode?</h3>
            <p>A. By inputting the spending amount, the tool simulates the expected points you will earn based on your current status and campaign settings.</p>
        </div>
        <div class="faq-item">
            <h3>Q. Is my weekly reward diary data saved?</h3>
            <p>A. The data you enter is only saved in your browser's local storage. You can export it as a JSON file or restore it to prevent data loss due to cache clearance.</p>
        </div>
    </section>
    <!-- FAQ_SECTION_END -->`,
        descriptionSection: `    <!-- DESCRIPTION_SECTION_START -->
    <section class="section">
        <h2>What You Can Do with Google Play Points Calculator</h2>
        <p>On this page, you can check <strong>how much you need to level up</strong>, <strong>how many points you can earn with your current spending</strong>, and <strong>how advantageous it will be during multiplier campaigns</strong>.</p>
        <p>This is especially helpful when you want to make decisions based on numbers rather than intuition, such as "just a little more to Platinum," "want to know if I can reach Diamond," or "wondering if I should wait for a point boost campaign."</p>
        <ul>
            <li>Estimate the required spending to reach Platinum or Diamond status.</li>
            <li>Compare base rewards and campaign multiplier rates for reverse calculations.</li>
            <li>Manage your weekly earned points manually in the Weekly Reward Diary.</li>
        </ul>
    </section>
    <!-- DESCRIPTION_SECTION_END -->`,
        metaLine: `        <!-- META_LINE_START -->
        <p class="meta-line">Operator: <a href="../author/katakata.html" rel="author">katakata</a> / Last Updated: ${todayStr}</p>
        <!-- META_LINE_END -->`,
        authorName: 'katakata'
    },
    'ko': {
        region: 'KR',
        langCode: 'ko',           // BCP47 言語コード
        inLanguage: 'ko',
        title: 'Google Play Points 계산기 | 등급 업까지 얼마 남았지?',
        description: '구글 플레이 포인트 등급 달성 계산기. 실버, 골드, 플래티넘, 다이아몬드 등급까지 필요한 결제 금액을 환율과 보너스 이벤트에 맞춰 시뮬레이션합니다.',
        ogTitle: 'Google Play Points 계산기 | 등급 업까지 얼마 남았지?',
        ogDescription: '구글 플레이 포인트 등급 달성 조건 및 획득 포인트를 무료로 시뮬레이션하는 계산기입니다.',
        currency: 'KRW',
        appName: 'Google Play Points 계산기',
        alternateName: '구글 플레이 포인트 계산기',
        appDesc: '구글 플레이 포인트의 현재 등급에서 목표 등급까지 필요한 결제 금액을 계산할 수 있는 도구입니다.',
        staticText: {
            mainTitle: 'Google Play Points 계산기',
            siteAlias: '별칭: 구글 플레이 포인트 계산기 / 비공식 도구',
            siteDescription: '현재 등급에서 목표 등급까지 필요한 결제 금액을 계산할 수 있습니다!<br>결제 금액으로 획득할 수 있는 포인트도 계산 가능합니다!',
            tabMain: '일반 계산',
            tabReverse: '역산 모드',
            tabDiary: '주간 리워드 일기'
        },
        faqJsonLd: `    <!-- FAQ_JSON_LD_START -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "등급 달성 계산은 어떻게 진행되나요?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "현재 상태와 목표 등급까지 부족한 포인트를 입력하면, 기본 적립률 및 보너스 이벤트 배율에 따라 필요한 결제 금액을 산출합니다."
          }
        },
        {
          "@type": "Question",
          "name": "역산 모드는 무엇인가요?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "결제할 금액을 입력하면, 현재 등급 및 보너스 이벤트 설정에 따라 획득 예상 포인트를 시뮬레이션합니다."
          }
        },
        {
          "@type": "Question",
          "name": "주간 리워드 일지 데이터는 저장되나요?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "입력하신 데이터는 브라우저의 로컬 스토리지에만 저장됩니다. 캐시 삭제에 대비해 JSON 파일로 내보내기(백업) 및 복원이 가능합니다."
          }
        }
      ]
    }
    </script>
    <!-- FAQ_JSON_LD_END -->`,
        faqSection: `    <!-- FAQ_SECTION_START -->
    <section class="section">
        <h2>❓ 자주 묻는 질문 (FAQ)</h2>
        <div class="faq-item">
            <h3>Q. 등급 달성 계산은 어떻게 진행되나요?</h3>
            <p>A. 현재 상태와 목표 등급까지 부족한 포인트를 입력하면, 기본 적립률 및 보너스 이벤트 배율에 따라 필요한 결제 금액을 산출합니다.</p>
        </div>
        <div class="faq-item">
            <h3>Q. 역산 모드는 무엇인가요?</h3>
            <p>A. 결제할 금액을 입력하면, 현재 등급 및 보너스 이벤트 설정에 따라 획득 예상 포인트를 시뮬레이션합니다.</p>
        </div>
        <div class="faq-item">
            <h3>Q. 주간 리워드 일지 데이터는 저장되나요?</h3>
            <p>A. 입력하신 데이터는 브라우저의 로컬 스토리지에만 저장됩니다. 캐시 삭제에 대비해 JSON 파일로 내보내기(백업) 및 복원이 가능합니다.</p>
        </div>
    </section>
    <!-- FAQ_SECTION_END -->`,
        descriptionSection: `    <!-- DESCRIPTION_SECTION_START -->
    <section class="section">
        <h2>구글 플레이 포인트 계산기로 할 수 있는 것</h2>
        <p>이 페이지에서는 구글 플레이 포인트의 <strong>등급 업까지 필요한 결제 금액</strong>, <strong>현재 결제 금액으로 획득 가능한 포인트</strong>, <strong>이벤트 시 얼마나 더 이득인지</strong>를 한눈에 확인할 수 있습니다.</p>
        <p>특히 '플래티넘까지 조금 남았을 때', '다이아몬드 달성 가능 여부를 알고 싶을 때', '포인트 증량 이벤트를 기다려야 할지 고민될 때' 감이 아닌 숫자로 쉽게 판단할 수 있도록 도와줍니다.</p>
        <ul>
            <li>플래티넘, 다이아몬드 등급 달성에 필요한 결제 금액 시뮬레이션</li>
            <li>기본 적립률과 이벤트 배율을 비교하면서 획득 포인트 역산</li>
            <li>주간 리워드 일기로 매주 획득한 포인트를 편리하게 관리</li>
        </ul>
    </section>
    <!-- DESCRIPTION_SECTION_END -->`,
        metaLine: `        <!-- META_LINE_START -->
        <p class="meta-line">운영자: <a href="../author/katakata.html" rel="author">katakata</a> / 최종 업데이트: ${todayStr}</p>
        <!-- META_LINE_END -->`,
        authorName: 'katakata'
    },
    'tw': {
        region: 'TW',
        langCode: 'zh-TW',        // BCP47 言語コード（"tw" は非標準のため必ず zh-TW を使用）
        inLanguage: 'zh-TW',
        title: 'Google Play Points 計算器｜距離升級還差多少？',
        description: 'Google Play 點數等級計算器。計算達到銀級、金級、白金級、鑽石級所需的消費金額，支援倍率活動與每週獎勵紀錄。',
        ogTitle: 'Google Play Points 計算器｜距離升級還差多少？',
        ogDescription: '免費模擬 Google Play 點數升級需求、逆算模式與加倍活動的點數試算工具。',
        currency: 'TWD',
        appName: 'Google Play Points 計算器',
        alternateName: 'Google Play 點數計算器',
        appDesc: '本工具可協助計算從目前等級達到 Google Play 點數目標等級所需的消費金額。',
        staticText: {
            mainTitle: 'Google Play Points 計算器',
            siteAlias: '別稱: Google Play 點數計算器 / 非官方工具',
            siteDescription: '可以計算從目前等級達到目標等級所需的消費金額！<br>還能計算消費金額可獲得的預估點數！',
            tabMain: '一般計算',
            tabReverse: '逆算模式',
            tabDiary: '每週獎勵日記'
        },
        faqJsonLd: `    <!-- FAQ_JSON_LD_START -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "升級目標的消費金額是如何計算的？",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "輸入目前的點數與目標等級所需的點數後，系統會根據您目前的基本回饋率及加倍活動倍率，計算出所需的消費金額。"
          }
        },
        {
          "@type": "Question",
          "name": "什麼是逆算模式？",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "輸入預計消費的金額後，系統會根據目前的等級與活動設定，估算您可獲得的預期點數。"
          }
        },
        {
          "@type": "Question",
          "name": "每週獎勵紀錄的資料會被儲存嗎？",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "您輸入的資料僅會儲存在瀏覽器的本機儲存空間（Local Storage）中。為了防止因清除快取而遺失資料，您可以將資料匯出為 JSON 檔案或進行還原。"
          }
        }
      ]
    }
    </script>
    <!-- FAQ_JSON_LD_END -->`,
        faqSection: `    <!-- FAQ_SECTION_START -->
    <section class="section">
        <h2>❓ 常見問題 (FAQ)</h2>
        <div class="faq-item">
            <h3>Q. 升級目標的消費金額是如何計算的？</h3>
            <p>A. 輸入目前的點數與目標等級所需的點數後，系統會根據您目前的基本回饋率及加倍活動倍率，計算出所需的消費金額。</p>
        </div>
        <div class="faq-item">
            <h3>Q. 什麼是逆算模式？</h3>
            <p>A. 輸入預計消費的金額後，系統會根據目前的等級與活動設定，估算您可獲得的預期點數。</p>
        </div>
        <div class="faq-item">
            <h3>Q. 每週獎勵紀錄的資料會被儲存嗎？</h3>
            <p>A. 您輸入的資料僅會儲存在瀏覽器的本機儲存空間（Local Storage）中。為了防止因清除快取而遺失資料，您可以將資料匯出為 JSON 檔案或進行還原。</p>
        </div>
    </section>
    <!-- FAQ_SECTION_END -->`,
        descriptionSection: `    <!-- DESCRIPTION_SECTION_START -->
    <section class="section">
        <h2>Google Play 點數計算器可以做什麼？</h2>
        <p>在此頁面中，您可以確認 <strong>距離升級還差多少消費金額</strong>、<strong>以目前的消費額可以獲得多少點數</strong>，以及 <strong>在點數加倍活動期間能多獲得多少點數</strong>。</p>
        <p>特別是在「距離白金級還差一點點」、「想知道是否能達到鑽石級」或「正在猶豫是否要等待點數加倍活動」時，能協助您以具體數字而非憑感覺進行判斷。</p>
        <ul>
            <li>估算達到白金級、鑽石級所需的消費金額。</li>
            <li>比較基本回饋與活動加倍倍率，進行點數逆算。</li>
            <li>利用每週獎勵日記，在手邊輕鬆記錄與管理每週獲得的點數。</li>
        </ul>
    </section>
    <!-- DESCRIPTION_SECTION_END -->`,
        metaLine: `        <!-- META_LINE_START -->
        <p class="meta-line">營運者: <a href="../author/katakata.html" rel="author">katakata</a> / 最後更新: ${todayStr}</p>
        <!-- META_LINE_END -->`,
        authorName: 'katakata'
    }
};

}

module.exports = {
  createLocales
};
