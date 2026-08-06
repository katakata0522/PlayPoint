'use strict';

function createLocales(todayStr) {
  const siteUpdatedAt = todayStr < '2026-07-26' ? '2026-07-26' : todayStr;
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
            closeAria: 'Close', showHelpAria: 'Show explanation', shareResultAria: 'Share calculation result', prevYearAria: 'Previous year', nextYearAria: 'Next year',
            mainTitle: 'Google Play Points Calculator',
            siteAlias: 'Also known as Play Points Calculator / unofficial tool',
            siteDescription: 'Calculate how much you need to spend to reach the next Google Play Points level.<br>Enter your current status, target status, and points needed to estimate spending with campaign multipliers.',
            linkAttention: '⚠️ Country notes',
            linkLatest: '🆕 Latest Hub',
            linkArticles: '📝 Articles',
            linkKatakata: '🧪 KatakataLab',
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
            packAmountLabel: 'Average pack spending per transaction (optional)',
            packAmountPlaceholder: 'e.g., 98',
            sectionTitleRate: 'Points rate settings',
            labelBaseRate: 'Earn rate per $1 (direct entry)',
            labelMultiplier: 'Campaign multiplier (alternative input)',
            warningRate: 'The calculator uses the higher estimate from direct rate entry or level rate × multiplier. These are alternative inputs. Confirm eligibility, activation, and caps in the official offer.',
            calculateButton: 'Calculate amount',
            copyButton: 'Copy',
            tweetButton: 'Share on X',
            sectionTitleReverse: 'Reverse mode',
            labelAmountYen: 'Amount spent (USD)',
            amountYenPlaceholder: 'e.g., 50',
            labelMultiplierReverse: 'Campaign multiplier (alternative input)',
            reverseCalculateButton: 'Calculate points',
            sectionTitleDiary: 'Weekly Awards Diary',
            currentYearLabel: 'Current year',
            initialMonthLabel: 'January',
            monthlySummaryTitle: 'Monthly Summary',
            yearlySummaryTitle: 'Yearly Summary',
            yearlyChartTitle: 'Yearly record chart',
            yearlyChartDescription: 'Compare monthly recorded points only on this device.',
            totalLabel: 'Total:',
            averageLabel: 'Average:',
            perWeekUnit: 'pts/week',
            guestNotice: '[!] Diary data is stored only in this browser’s local storage. It will not move to another device or browser and can be lost when site data is cleared or private browsing ends. Keep an exported copy if needed.',
            reminderTitle: 'Friday Reward Notification (Calendar)',
            reminderDesc: 'For eligible accounts with regular weekly prizes, set a Friday reminder to check the Perks screen.',
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
            linkWidget: 'Free widget',
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
          "name": "Is this an official Google page?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "No. This site is an unofficial personal tool and is not operated by Google. Use the calculation result as an estimate, and check the official Google Play screen for the latest status conditions and benefits."
          }
        },
        {
          "@type": "Question",
          "name": "Is my weekly reward diary data saved?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Diary data is stored only in this browser's local storage. It does not move to another device or browser and can be lost when site data is cleared or private browsing ends. Keep an exported copy if needed."
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
            <h3>Q. Is this an official Google page?</h3>
            <p>A. No. This site is an unofficial personal tool and is not operated by Google. Use the calculation result as an estimate, and check the official Google Play screen for the latest status conditions and benefits.</p>
        </div>
        <div class="faq-item">
            <h3>Q. Is my weekly reward diary data saved?</h3>
            <p>A. Diary data is stored only in this browser's local storage. It does not move to another device or browser and can be lost when site data is cleared or private browsing ends. Keep an exported copy if needed.</p>
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
        <figure class="calculation-flow-figure">
            <img src="../images/calculation-flow.svg" width="960" height="360" loading="lazy" decoding="async" alt="Three-step flow from points needed through the selected reward condition to estimated spending">
            <figcaption>Three steps from the points gap and reward condition to an estimated spending amount. The 1,728-point figure is an input example.</figcaption>
        </figure>
        <p class="calculation-method-note"><strong>Calculation and verification:</strong> Inputs are calculated in this browser and are not sent externally. The estimate uses the required points and selected reward condition; when a pack amount is entered, the total is rounded up by purchase unit. See the <a href="../author/katakata.html" rel="author">operator and verification policy</a> for sourcing, updates, and corrections.</p>
    </section>
    <!-- DESCRIPTION_SECTION_END -->`,
        metaLine: `        <!-- META_LINE_START -->
        <p class="meta-line">Operator: <a href="../author/katakata.html" rel="author">katakata</a> / Last Updated: ${siteUpdatedAt}</p>
        <!-- META_LINE_END -->`,
        authorName: 'katakata'
    },
    'ko': {
        region: 'KR',
        langCode: 'ko',           // BCP47 言語コード
        inLanguage: 'ko',
        title: 'Google Play Points 계산기 | 등급 업까지 얼마 남았지?',
        description: '구글 플레이 포인트 등급 달성 계산기. 실버, 골드, 플래티넘, 다이아몬드 등급까지 필요한 결제 금액을 등급별 기본 적립률과 이벤트 배율로 계산합니다.',
        modifiedAt: '2026-07-26',
        ogTitle: 'Google Play Points 계산기 | 등급 업까지 얼마 남았지?',
        ogDescription: '구글 플레이 포인트 등급 달성 조건 및 획득 포인트를 무료로 시뮬레이션하는 계산기입니다.',
        currency: 'KRW',
        appName: 'Google Play Points 계산기',
        alternateName: '구글 플레이 포인트 계산기',
        appDesc: '구글 플레이 포인트의 현재 등급에서 목표 등급까지 필요한 결제 금액을 계산할 수 있는 도구입니다.',
        staticText: {
            closeAria: '닫기', showHelpAria: '설명 보기', shareResultAria: '계산 결과 공유', prevYearAria: '이전 연도', nextYearAria: '다음 연도',
            mainTitle: 'Google Play Points 계산기',
            siteAlias: '별칭: 구글 플레이 포인트 계산기 / 비공식 도구',
            siteDescription: '먼저 현재 등급, 목표 등급, 목표까지 필요한 포인트를 입력하세요.<br>등급 달성에 필요한 결제 금액과 결제 금액으로 받을 수 있는 포인트를 계산합니다.',
            linkAttention: '⚠️ 국가별 안내',
            linkLatest: '🆕 최신 정보',
            linkArticles: '📝 가이드',
            linkKatakata: '🧪 KatakataLab',
            tabMain: '일반 계산',
            tabReverse: '역산 모드',
            tabDiary: '주간 리워드 일기',
            sectionTitleStatus: '등급 입력',
            labelCurrentStatus: '현재 등급',
            labelTargetStatus: '목표 등급',
            labelNeededPoints: '목표까지 필요한 포인트',
            neededPointsPlaceholder: '예: 120',
            packAmountLabel: '1회당 평균 결제 팩 금액 (선택 사항)',
            packAmountPlaceholder: '예: 10000',
            sectionTitleRate: '적립 설정',
            labelBaseRate: '1,000원당 적립률(직접 입력)',
            labelMultiplier: '이벤트 배율(다른 입력 방식)',
            warningRate: '직접 입력한 적립률과 등급 기본 적립률×배율 중 높은 예상치를 사용합니다. 두 항목은 서로 다른 입력 방식이며, 실제 대상·활성화·상한은 공식 혜택 화면에서 확인해야 합니다.',
            calculateButton: '결제 금액 계산',
            copyButton: '복사하기',
            tweetButton: '결과를 X에 공유',
            sectionTitleReverse: '역산 모드',
            labelAmountYen: '결제 금액 (₩)',
            amountYenPlaceholder: '예: 50000',
            labelMultiplierReverse: '이벤트 배율(다른 입력 방식)',
            reverseCalculateButton: '포인트 계산',
            sectionTitleDiary: '주간 리워드 일기',
            currentYearLabel: '현재 연도',
            initialMonthLabel: '1월',
            monthlySummaryTitle: '월간 합계',
            yearlySummaryTitle: '연간 합계',
            yearlyChartTitle: '연간 기록 그래프',
            yearlyChartDescription: '월별 기록 포인트를 이 기기 안에서만 비교합니다.',
            totalLabel: '합계:',
            averageLabel: '평균:',
            perWeekUnit: 'pt/주',
            guestNotice: '[!] 일지 데이터는 이 브라우저의 로컬 저장소에만 보관됩니다. 사이트 데이터 삭제, 비공개 탐색 종료, 다른 기기·브라우저로 이동할 때는 이어지지 않으므로 필요하면 내보낸 데이터를 보관하세요.',
            reminderTitle: '금요 리워드 알림 (캘린더)',
            reminderDesc: '일반 주간 리워드가 표시되는 대상 계정이라면 매주 금요일 확인 알림을 등록할 수 있습니다.',
            btnGoogleCal: 'Google 캘린더 등록',
            btnICal: '캘린더 앱 (iCal) 등록',
            backupTitle: '데이터 백업 및 복원',
            exportBtn: '데이터 내보내기 (복사)',
            importBtn: '데이터 가져오기 (복원)',
            confirmImportBtn: '복원 실행',
            backupPlaceholder: '내보낸 데이터를 여기에 붙여넣어 주세요',
            linkPrivacy: '개인정보처리방침 (일본어)',
            linkTerms: '이용약관 (일본어)',
            linkQA: 'Q&A 및 후기 (일본어)',
            linkFeedback: '의견 제안',
            linkAbout: 'Play 포인트란?',
            linkWidget: '무료 위젯',
            linkDiscount: '💡 할인 구매 가이드',
            linkAuthor: '운영자 및 정책 (일본어)'
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
          "name": "이 콘텐츠는 공식 페이지인가요?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "아니요. 이 사이트는 Google이 운영하는 공식 페이지가 아니라 개인이 운영하는 비공식 계산 도구입니다. 계산 결과는 참고용으로만 사용하고, 최신 등급 조건과 혜택은 Google Play 공식 화면에서 확인해 주세요."
          }
        },
        {
          "@type": "Question",
          "name": "주간 리워드 일지 데이터는 저장되나요?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "일지 데이터는 이 브라우저의 로컬 저장소에만 보관됩니다. 사이트 데이터 삭제, 비공개 탐색 종료, 다른 기기나 브라우저로 이동할 때는 자동으로 이어지지 않으므로 필요하면 내보낸 데이터를 보관하세요."
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
            <h3>Q. 이 콘텐츠는 공식 페이지인가요?</h3>
            <p>A. 아니요. 이 사이트는 Google이 운영하는 공식 페이지가 아니라 개인이 운영하는 비공식 계산 도구입니다. 계산 결과는 참고용으로만 사용하고, 최신 등급 조건과 혜택은 Google Play 공식 화면에서 확인해 주세요.</p>
        </div>
        <div class="faq-item">
            <h3>Q. 주간 리워드 일지 데이터는 저장되나요?</h3>
            <p>A. 일지 데이터는 이 브라우저의 로컬 저장소에만 보관됩니다. 사이트 데이터 삭제, 비공개 탐색 종료, 다른 기기나 브라우저로 이동할 때는 자동으로 이어지지 않으므로 필요하면 내보낸 데이터를 보관하세요.</p>
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
        <figure class="calculation-flow-figure">
            <img src="../images/calculation-flow.svg" width="960" height="360" loading="lazy" decoding="async" alt="필요 포인트와 적립 조건에서 예상 결제 금액까지 이어지는 3단계 계산 흐름">
            <figcaption>필요 포인트와 적립 조건으로 예상 결제 금액을 구하는 3단계입니다. 그림의 1,728pt는 입력 예시입니다.</figcaption>
        </figure>
        <p class="calculation-method-note"><strong>계산 및 검증:</strong> 입력값은 외부로 전송하지 않고 이 브라우저에서 계산합니다. 필요한 포인트와 선택된 적립 조건으로 금액을 추정하며, 패키지 금액을 입력한 경우 구매 단위로 올림합니다. 출처, 업데이트 및 정정 기준은 <a href="../author/katakata.html" rel="author">운영자 및 검증 방침</a>에서 확인할 수 있습니다.</p>
    </section>
    <!-- DESCRIPTION_SECTION_END -->`,
        metaLine: `        <!-- META_LINE_START -->
        <p class="meta-line">운영자: <a href="../author/katakata.html" rel="author">katakata</a> / 최종 업데이트: ${siteUpdatedAt}</p>
        <!-- META_LINE_END -->`,
        authorName: 'katakata'
    },
    'tw': {
        region: 'TW',
        langCode: 'zh-TW',        // BCP47 言語コード（"tw" は非標準のため必ず zh-TW を使用）
        inLanguage: 'zh-TW',
        title: 'Google Play Points 計算器｜距離升級還差多少？',
        description: 'Google Play Points 點數等級計算器。計算達到銀級、金級、白金級、鑽石級所需的消費金額，支援活動倍率、剩餘點數與每週獎勵紀錄。',
        ogTitle: 'Google Play Points 計算器｜距離升級還差多少？',
        ogDescription: '免費模擬 Google Play 點數升級需求、逆算模式與加倍活動的點數試算工具。',
        currency: 'TWD',
        appName: 'Google Play Points 計算器',
        alternateName: 'Google Play 點數計算器',
        appDesc: '本工具可協助計算從目前等級達到 Google Play 點數目標等級所需的消費金額。',
        staticText: {
            closeAria: '關閉', showHelpAria: '顯示說明', shareResultAria: '分享計算結果', prevYearAria: '上一年', nextYearAria: '下一年',
            mainTitle: 'Google Play Points 計算器',
            siteAlias: '別稱: Google Play 點數計算器 / 非官方工具',
            siteDescription: '請先輸入目前等級、目標等級，以及距離目標還需要的點數。<br>此工具會估算達成等級所需消費金額，以及消費金額可獲得的點數。',
            linkAttention: '⚠️ 地區注意事項',
            linkLatest: '🆕 最新資訊',
            linkArticles: '📝 指南',
            linkKatakata: '🧪 KatakataLab',
            tabMain: '一般計算',
            tabReverse: '逆算模式',
            tabDiary: '每週獎勵日記',
            sectionTitleStatus: '輸入等級',
            labelCurrentStatus: '目前等級',
            labelTargetStatus: '目標等級',
            labelNeededPoints: '距離目標所需點數',
            neededPointsPlaceholder: '例如：125',
            packAmountLabel: '單筆平均購買禮包金額 (選填)',
            packAmountPlaceholder: '例：300',
            sectionTitleRate: '回饋設定',
            labelBaseRate: '每 NT$30 回饋率（直接輸入）',
            labelMultiplier: '活動倍率（另一種輸入方式）',
            warningRate: '計算器會使用直接輸入回饋率與等級基本回饋率×倍率中較高的估算值。兩者是不同輸入方式；實際資格、啟用與上限請查看官方活動畫面。',
            calculateButton: '計算消費金額',
            copyButton: '複製',
            tweetButton: '分享至 X',
            sectionTitleReverse: '逆算模式',
            labelAmountYen: '消費金額 (NT$)',
            amountYenPlaceholder: '例如：1500',
            labelMultiplierReverse: '活動倍率（另一種輸入方式）',
            reverseCalculateButton: '計算點數',
            sectionTitleDiary: '每週獎勵日記',
            currentYearLabel: '目前年份',
            initialMonthLabel: '1月',
            monthlySummaryTitle: '月度統計',
            yearlySummaryTitle: '年度統計',
            yearlyChartTitle: '年度記錄圖表',
            yearlyChartDescription: '只在此裝置上比較每月記錄的點數。',
            totalLabel: '合計:',
            averageLabel: '平均:',
            perWeekUnit: 'pt/週',
            guestNotice: '[!] 日記資料只儲存在此瀏覽器的本機儲存空間。清除網站資料、結束無痕瀏覽或改用其他裝置與瀏覽器時不會自動移轉；如有需要請保留匯出資料。',
            reminderTitle: '週五獎勵提醒 (日曆)',
            reminderDesc: '若帳號顯示一般每週獎勵，可設定每週五檢查獎勵頁面的提醒。',
            btnGoogleCal: '新增至 Google 日曆',
            btnICal: '新增至日曆 App (iCal)',
            backupTitle: '資料備份與還原',
            exportBtn: '匯出資料 (複製)',
            importBtn: '匯入資料 (還原)',
            confirmImportBtn: '執行還原',
            backupPlaceholder: '請將匯出的資料貼至此處',
            linkPrivacy: '隱私權政策 (日文)',
            linkTerms: '服務條款 (日文)',
            linkQA: 'Q&A 與後記 (日文)',
            linkFeedback: '意見回饋',
            linkAbout: '什麼是 Play Points？',
            linkWidget: '免費小工具',
            linkDiscount: '💡 優惠儲值指南',
            linkAuthor: '營運者與政策 (日文)'
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
          "name": "這是官方內容嗎？",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "不是。本站不是 Google 官方營運的頁面，而是個人製作的非官方試算工具。計算結果請作為參考，最新等級條件與優惠內容請以 Google Play 官方畫面為準。"
          }
        },
        {
          "@type": "Question",
          "name": "每週獎勵紀錄的資料會被儲存嗎？",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "日記資料只儲存在此瀏覽器的本機儲存空間。清除網站資料、結束無痕瀏覽或改用其他裝置與瀏覽器時不會自動移轉；如有需要請保留匯出資料。"
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
            <h3>Q. 這是官方內容嗎？</h3>
            <p>A. 不是。本站不是 Google 官方營運的頁面，而是個人製作的非官方試算工具。計算結果請作為參考，最新等級條件與優惠內容請以 Google Play 官方畫面為準。</p>
        </div>
        <div class="faq-item">
            <h3>Q. 每週獎勵紀錄的資料會被儲存嗎？</h3>
            <p>A. 日記資料只儲存在此瀏覽器的本機儲存空間。清除網站資料、結束無痕瀏覽或改用其他裝置與瀏覽器時不會自動移轉；如有需要請保留匯出資料。</p>
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
        <figure class="calculation-flow-figure">
            <img src="../images/calculation-flow.svg" width="960" height="360" loading="lazy" decoding="async" alt="從所需點數與回饋條件到預估消費金額的三步驟計算流程">
            <figcaption>從點數差距與回饋條件算出預估消費金額的三個步驟。圖中的1,728pt是輸入範例。</figcaption>
        </figure>
        <p class="calculation-method-note"><strong>計算與驗證:</strong> 輸入內容不會傳送到外部，而是在此瀏覽器中完成計算。系統依所需點數與採用的回饋條件估算金額；輸入套組金額時，會以購買單位向上取整。資料來源、更新與更正原則請參閱<a href="../author/katakata.html" rel="author">營運者與驗證方針</a>。</p>
    </section>
    <!-- DESCRIPTION_SECTION_END -->`,
        metaLine: `        <!-- META_LINE_START -->
        <p class="meta-line">營運者: <a href="../author/katakata.html" rel="author">katakata</a> / 最後更新: ${siteUpdatedAt}</p>
        <!-- META_LINE_END -->`,
        authorName: 'katakata'
    }
};

}

module.exports = {
  createLocales
};
