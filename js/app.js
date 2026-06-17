/**
 * ミートキャリア「3分で、今の自分に気づくワーク」
 * メインアプリケーションロジック
 */

document.addEventListener('DOMContentLoaded', () => {
  const app = new WorkApp();
  app.init();
});

class WorkApp {
  constructor() {
    this.currentStep = 0; // 0 = hero, 1-5 = questions, 6 = result
    this.answers = {};
    this.totalSteps = QUESTIONS.length;
  }

  init() {
    this.renderHero();
    this.setupBeforeUnload();
  }

  // --- Hero Screen ---
  renderHero() {
    const container = document.getElementById('app-content');
    container.innerHTML = `
      <div class="screen active" id="screen-hero">
        <h1 class="hero-title fade-in-up">
          <span class="accent">3分</span>で、今の自分に<br>気づくワーク
        </h1>
        <p class="hero-subtitle fade-in-up delay-1">
          そのモヤモヤ、<br>言葉にしてみませんか？
        </p>
        <div class="hero-badges fade-in-up delay-1">
          <span class="hero-badge">3分で完了</span>
          <span class="hero-badge">すぐ始められる</span>
          <span class="hero-badge">無料</span>
        </div>
        <div class="hero-principles fade-in-up delay-2">
          <ul>
            <li>5つの質問に直感で答える</li>
            <li>モヤモヤが言葉になって見えてくる</li>
            <li>答えを出さなくて大丈夫</li>
          </ul>
        </div>
        <div class="social-proof fade-in-up delay-2">
          <div class="social-proof-badges">
            <picture>
              <source srcset="assets/badge_94.webp" type="image/webp">
              <img src="assets/badge_94.png" alt="サポート満足度94%" class="social-proof-badge" width="80" height="60">
            </picture>
            <picture>
              <source srcset="assets/badge_6000.webp" type="image/webp">
              <img src="assets/badge_6000.png" alt="カウンセリング実績6,000件" class="social-proof-badge" width="80" height="60">
            </picture>
          </div>
        </div>
        <button class="btn-primary btn-pulse fade-in-up delay-3" id="btn-start">
          無料でやってみる
        </button>
      </div>
    `;

    document.getElementById('btn-start').addEventListener('click', () => {
      Analytics.trackStart();
      this.nextStep();
    });
  }

  // --- Step Screen ---
  renderStep(stepIndex) {
    const q = QUESTIONS[stepIndex];
    const progress = ((stepIndex) / this.totalSteps) * 100;
    const container = document.getElementById('app-content');

    let optionsHTML = q.options.map(opt => `
      <div class="option-card" data-id="${opt.id}" data-tag="${opt.tag}">
        ${opt.text}
      </div>
    `).join('');

    container.innerHTML = `
      <div class="screen active" id="screen-step-${q.id}">
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${progress}%"></div>
        </div>
        <div class="step-header fade-in-up">
          <span class="step-label">${q.heading}</span>
          <p class="step-subheading">${q.subheading}</p>
          <h2 class="step-question">${q.question}</h2>
          <p class="step-note">${q.note}</p>
        </div>
        <div class="options fade-in-up delay-1">
          ${optionsHTML}
        </div>
        <button class="btn-primary btn-next fade-in-up delay-2" id="btn-next" disabled>
          次へ
        </button>
      </div>
    `;

    // Animate progress bar
    requestAnimationFrame(() => {
      const fill = container.querySelector('.progress-fill');
      if (fill) {
        fill.style.width = `${((stepIndex + 1) / this.totalSteps) * 100}%`;
      }
    });

    this.setupOptionListeners(q);
  }

  setupOptionListeners(question) {
    const cards = document.querySelectorAll('.option-card');
    const nextBtn = document.getElementById('btn-next');

    if (question.type === 'single') {
      cards.forEach(card => {
        card.addEventListener('click', () => {
          // Visual feedback
          cards.forEach(c => c.classList.remove('selected'));
          card.classList.add('selected');

          // Save answer
          this.answers[question.id] = {
            type: 'single',
            id: card.dataset.id,
            tag: card.dataset.tag,
            text: card.textContent.trim()
          };

          // Enable next button
          nextBtn.disabled = false;
        });
      });

      nextBtn.addEventListener('click', () => {
        if (this.answers[question.id]) {
          Analytics.trackStep(question.id, this.answers[question.id].tag);
          this.nextStep();
        }
      });

    } else if (question.type === 'multi') {
      const selectedTags = new Set();

      cards.forEach(card => {
        card.addEventListener('click', () => {
          card.classList.toggle('selected');

          if (card.classList.contains('selected')) {
            selectedTags.add(card.dataset.tag);
          } else {
            selectedTags.delete(card.dataset.tag);
          }

          nextBtn.disabled = selectedTags.size === 0;
        });
      });

      nextBtn.addEventListener('click', () => {
        const selectedCards = document.querySelectorAll('.option-card.selected');
        this.answers[question.id] = {
          type: 'multi',
          tags: Array.from(selectedTags),
          texts: Array.from(selectedCards).map(c => c.textContent.trim())
        };

        Analytics.trackStepMulti(question.id, Array.from(selectedTags));
        this.nextStep();
      });
    }
  }

  // --- Result Screen ---
  renderResult() {
    const container = document.getElementById('app-content');

    // Get dynamic messages based on answers
    const step1Tag = this.answers[1]?.tag || 'moyamoya';
    const step2Tags = this.answers[2]?.tags || [];
    const step3Tag = this.answers[3]?.tag || 'authenticity';
    const step4Tag = this.answers[4]?.tag || 'vague';
    const step5Tag = this.answers[5]?.tag || 'verbalize';

    const openingData = RESULT_MESSAGES.opening[step1Tag] || RESULT_MESSAGES.opening.moyamoya;
    const middleData = RESULT_MESSAGES.middle[step3Tag] || RESULT_MESSAGES.middle.authenticity;
    const closingData = RESULT_MESSAGES.closing[step5Tag] || RESULT_MESSAGES.closing.verbalize;
    const selfStateData = RESULT_MESSAGES.selfState[step4Tag] || RESULT_MESSAGES.selfState.vague;
    const reflection = RESULT_MESSAGES.reflection;
    const cta = RESULT_MESSAGES.cta;

    const reflectionItems = reflection.questions.map(q => `<li>${q}</li>`).join('');

    // Build Step2 background factor tags
    const backgroundTagsHTML = step2Tags.map(tag => {
      const bg = RESULT_MESSAGES.background[tag];
      return bg ? `<span class="result-factor-tag">${bg.label}</span>` : '';
    }).filter(Boolean).join('');

    // Build background insights (visible)
    const backgroundInsightsHTML = step2Tags.map(tag => {
      const bg = RESULT_MESSAGES.background[tag];
      return bg ? `<li>${bg.insight}</li>` : '';
    }).filter(Boolean).join('');

    // Build background deeper analysis (blurred)
    const backgroundDeeperHTML = step2Tags.map(tag => {
      const bg = RESULT_MESSAGES.background[tag];
      return bg ? `<li>「${bg.label}」への具体的なアプローチと、あなたに合った次のステップ</li>` : '';
    }).filter(Boolean).join('');

    // Build UTM-aware CTA URL
    const utm = Analytics.getUTMParams();
    let ctaUrl = cta.buttonUrl;
    const queryParams = [];
    if (utm.utm_source !== '(direct)') queryParams.push(`utm_source=${encodeURIComponent(utm.utm_source)}`);
    if (utm.utm_medium !== '(none)') queryParams.push(`utm_medium=${encodeURIComponent(utm.utm_medium)}`);
    queryParams.push('utm_campaign=kizuki_work');
    queryParams.push(`utm_content=result_${step5Tag}`);
    if (queryParams.length > 0) ctaUrl += '?' + queryParams.join('&');

    container.innerHTML = `
      <div class="screen active" id="screen-result">
        <div class="progress-bar">
          <div class="progress-fill" style="width: 100%"></div>
        </div>

        <!-- Section 1: Opening (Step1) -->
        <div class="result-card fade-in-up" data-track-section="opening">
          <p class="result-heading">ワークおつかれさまでした</p>
          <p class="result-text">${openingData.outline}</p>
          <p class="result-teaser-text">${openingData.teaser}</p>
          <div class="result-blurred-teaser">
            <p class="result-text-blurred">${openingData.full}</p>
            <div class="result-blur-overlay"></div>
          </div>
        </div>

        <div class="result-divider fade-in-up delay-1"></div>

        <!-- Section 2: Background Factors (Step2) -->
        <div class="result-card fade-in-up delay-1" data-track-section="background">
          <p class="result-heading">あなたのモヤモヤの背景</p>
          <div class="result-factor-tags">
            ${backgroundTagsHTML}
          </div>
          <p class="result-factor-summary">${step2Tags.length}つの要素が、今のあなたの気持ちに影響しているようです。</p>
          <ul class="result-insight-list result-insight-visible">${backgroundInsightsHTML}</ul>
          <div class="result-blurred-teaser result-blurred-teaser-tall">
            <p class="result-blurred-label">▼ もう少し詳しく見てみると…</p>
            <ul class="result-text-blurred result-insight-list">${backgroundDeeperHTML}</ul>
            <div class="result-blur-overlay"></div>
          </div>
        </div>

        <div class="result-divider fade-in-up delay-2"></div>

        <!-- Section 3: Values (Step3) -->
        <div class="result-card fade-in-up delay-2" data-track-section="values">
          <p class="result-heading">あなたが今、大切にしたいこと</p>
          <p class="result-text">${middleData.outline}</p>
          <p class="result-teaser-text">${middleData.teaser}</p>
          <div class="result-blurred-teaser result-blurred-teaser-tall">
            <p class="result-text-blurred">${middleData.full}</p>
            <div class="result-blur-overlay"></div>
          </div>
        </div>

        <div class="result-divider fade-in-up delay-3"></div>

        <!-- Section 4: Self-State (Step4) -->
        <div class="result-card fade-in-up delay-3" data-track-section="self_state">
          <p class="result-heading">今のあなたの状態</p>
          <p class="result-self-state-label">${selfStateData.label}</p>
          <p class="result-text">${selfStateData.insight}</p>
          <p class="result-teaser-text">${selfStateData.detail}</p>
          <div class="result-blurred-teaser result-blurred-teaser-tall">
            <p class="result-blurred-label">▼ もう少し詳しく見てみると…</p>
            <p class="result-text-blurred">この状態にいるあなたに最適なアプローチ方法と、今日からできる具体的なステップをまとめました。自分の特性を活かした、無理のない前進の仕方があります。</p>
            <div class="result-blur-overlay"></div>
          </div>
        </div>

        <!-- Email Capture -->
        <div class="email-capture-section fade-in-up delay-4" id="email-capture-section" data-track-section="email">
          <div class="email-capture-card">
            <p class="email-capture-icon">📩</p>
            <p class="email-capture-heading">ぼかし部分の全文を<br>無料でお届けします</p>
            <p class="email-capture-text">
              あなたの回答をもとにした<br><strong>詳しい結果の全文</strong>と、<br>あなたへの<strong>メッセージ</strong>をお届けします。
            </p>
            <p class="email-capture-note">メールアドレスの入力だけでOK</p>
            <div class="email-form" id="email-form">
              <input type="email" class="email-input" id="email-input"
                placeholder="メールアドレスを入力" required
                autocomplete="email" inputmode="email">
              <button class="btn-primary btn-email-submit" id="btn-email-submit">
                無料で全文を読む
              </button>
            </div>
          </div>
          <div id="email-success" class="email-success" style="display:none">
            <div class="email-success-inner">
              <span class="email-success-icon">✓</span>
              <p class="email-success-text">送信しました！<br>詳しい結果レポートをメールでお届けします。</p>
            </div>
          </div>
          <div id="email-error" class="email-error" style="display:none">
            <p class="email-error-text">送信に失敗しました。もう一度お試しください。</p>
          </div>
        </div>

        <div class="reflection-card fade-in-up delay-5" data-track-section="reflection">
          <p class="reflection-heading">${reflection.heading}</p>
          <ul class="reflection-list">
            ${reflectionItems}
          </ul>
        </div>

        <div class="cta-section fade-in-up delay-5" data-track-section="cta">
          <p class="cta-heading">${cta.heading}</p>
          <p class="cta-text">${cta.text}</p>
          <a href="${ctaUrl}" class="btn-primary" id="btn-cta" target="_blank" rel="noopener">
            ${cta.buttonText}
          </a>
          ${cta.termsUrl ? `<p class="cta-terms"><a href="${cta.termsUrl}" target="_blank" rel="noopener">${cta.termsText || '利用規約'}</a></p>` : ''}
        </div>

        <div class="retry-section fade-in-up delay-5">
          <button class="btn-secondary" id="btn-retry">もう一度やってみる</button>
        </div>

        <!-- 壁打ちAI導線 -->
        <div class="bot-promo-section fade-in-up delay-5" data-track-section="bot_promo">
          <div class="bot-promo-card">
            <p class="bot-promo-icon">💬</p>
            <p class="bot-promo-heading">もっと深く掘り下げたい方へ</p>
            <p class="bot-promo-text">
              3分ワークで見えてきたモヤモヤを、<br>AIと対話しながら<br>じっくり整理してみませんか？
            </p>
            <p class="bot-promo-note">6,000件のキャリア支援ノウハウを搭載した<br>無料のAI壁打ちサービスです</p>
            <a href="https://bot.meetcareer.net/?utm_source=work&utm_medium=result_page&utm_campaign=bot_promo" class="btn-bot-promo" id="btn-bot-promo" target="_blank" rel="noopener">
              モヤモヤ壁打ちAIを試す
            </a>
          </div>
        </div>
      </div>
    `;

    // Track completion
    Analytics.trackComplete(this.answers);

    // Track email form view
    Analytics.trackEmailFormView();

    // Email form submission
    this.setupEmailForm(step1Tag, step2Tags, step3Tag, step4Tag, step5Tag);

    // CTA click tracking
    document.getElementById('btn-cta').addEventListener('click', () => {
      const destination = RESULT_MESSAGES.cta.trackDestination || 'counseling';
      Analytics.trackCTAClick(destination);
    });

    // Bot promo click tracking
    const btnBotPromo = document.getElementById('btn-bot-promo');
    if (btnBotPromo) {
      btnBotPromo.addEventListener('click', () => {
        if (typeof gtag === 'function') {
          gtag('event', 'work_bot_promo_click', {
            event_category: 'engagement',
            event_label: 'bot_promo_result_page'
          });
        }
      });
    }

    // Sticky email CTA (追従CTA)
    this.setupStickyEmailCTA();

    // Retry
    document.getElementById('btn-retry').addEventListener('click', () => {
      const stickyEl = document.getElementById('sticky-email-cta');
      if (stickyEl) stickyEl.remove();
      this.answers = {};
      this.currentStep = 0;
      this.renderHero();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // Result page tracking (scroll depth, section visibility, email focus)
    this.setupResultTracking();
  }
  // --- Result Page Tracking (scroll depth, section visibility, email focus) ---
  setupResultTracking() {
    const viewedSections = new Set();
    const viewedDepths = new Set();
    let emailFocusTracked = false;

    // 1. Section visibility tracking via IntersectionObserver
    const sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const section = entry.target.dataset.trackSection;
          if (section && !viewedSections.has(section)) {
            viewedSections.add(section);
            Analytics.trackResultSectionView(section);
            sectionObserver.unobserve(entry.target);
          }
        }
      });
    }, { threshold: 0.3 });

    document.querySelectorAll('[data-track-section]').forEach(el => {
      sectionObserver.observe(el);
    });

    // 2. Scroll depth tracking (25%/50%/75%/100%)
    const resultScreen = document.getElementById('screen-result');
    let scrollHandler = null;

    if (resultScreen) {
      scrollHandler = () => {
        const rect = resultScreen.getBoundingClientRect();
        const totalHeight = resultScreen.offsetHeight;
        if (totalHeight === 0) return;

        const scrolled = Math.max(0, -rect.top + window.innerHeight);
        const scrollPercent = Math.min(100, (scrolled / totalHeight) * 100);

        [25, 50, 75, 100].forEach(depth => {
          if (scrollPercent >= depth && !viewedDepths.has(depth)) {
            viewedDepths.add(depth);
            Analytics.trackResultScroll(depth);
          }
        });

        if (viewedDepths.size >= 4 && scrollHandler) {
          window.removeEventListener('scroll', scrollHandler);
        }
      };

      window.addEventListener('scroll', scrollHandler, { passive: true });
      requestAnimationFrame(() => scrollHandler());
    }

    // 3. Email input focus tracking
    const emailInput = document.getElementById('email-input');
    if (emailInput) {
      emailInput.addEventListener('focus', () => {
        if (!emailFocusTracked) {
          emailFocusTracked = true;
          Analytics.trackEmailFocus();
        }
      });
    }
  }

  // --- Sticky Email CTA (追従CTA) ---
  setupStickyEmailCTA() {
    const existing = document.getElementById('sticky-email-cta');
    if (existing) existing.remove();

    const stickyCTA = document.createElement('div');
    stickyCTA.id = 'sticky-email-cta';
    stickyCTA.className = 'sticky-email-cta';
    stickyCTA.innerHTML = '<button class="sticky-email-cta-btn">📩 無料で全文を読む</button>';
    document.body.appendChild(stickyCTA);

    let blurReached = false;
    const emailSection = document.getElementById('email-capture-section');
    const firstBlur = document.querySelector('.result-blurred-teaser');

    // Detect when first blur is reached (one-time)
    if (firstBlur) {
      const blurObserver = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && !blurReached) {
          blurReached = true;
          blurObserver.disconnect();
        }
      }, { threshold: 0.3 });
      blurObserver.observe(firstBlur);
    }

    // Scroll-based visibility: show when email is below viewport, hide otherwise
    const updateVisibility = () => {
      if (!document.getElementById('sticky-email-cta')) {
        window.removeEventListener('scroll', updateVisibility);
        return;
      }
      if (!blurReached || !emailSection) return;
      const emailRect = emailSection.getBoundingClientRect();
      if (emailRect.top > window.innerHeight) {
        stickyCTA.classList.add('sticky-email-cta-visible');
      } else {
        stickyCTA.classList.remove('sticky-email-cta-visible');
      }
    };

    window.addEventListener('scroll', updateVisibility, { passive: true });
    requestAnimationFrame(updateVisibility);

    // Click → scroll to email section + auto focus input
    stickyCTA.addEventListener('click', () => {
      Analytics.trackEmailUnlockClick('sticky');
      if (emailSection) {
        emailSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => {
          const emailInput = document.getElementById('email-input');
          if (emailInput) emailInput.focus();
        }, 600);
      }
    });
  }

  // --- Email Capture ---
  setupEmailForm(step1Tag, step2Tags, step3Tag, step4Tag, step5Tag) {
    const form = document.getElementById('email-form');
    const input = document.getElementById('email-input');
    const submitBtn = document.getElementById('btn-email-submit');
    const successEl = document.getElementById('email-success');
    const errorEl = document.getElementById('email-error');
    const captureCard = document.querySelector('.email-capture-card');

    if (!form || !submitBtn) return;

    submitBtn.addEventListener('click', async () => {
      const email = input.value.trim();

      // Validate email
      if (!email || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
        input.classList.add('input-error');
        input.focus();
        return;
      }

      input.classList.remove('input-error');
      submitBtn.disabled = true;
      submitBtn.textContent = '送信中...';
      errorEl.style.display = 'none';

      try {
        await this.submitToBrevo(email, step1Tag, step2Tags, step3Tag, step4Tag, step5Tag);

        // Success
        captureCard.style.display = 'none';
        successEl.style.display = 'block';
        // Hide sticky CTA permanently
        const stickyEl = document.getElementById('sticky-email-cta');
        if (stickyEl) stickyEl.remove();

        // Track GA4 event
        const utm = Analytics.getUTMParams();
        Analytics.trackEmailSubmit(step1Tag, utm.utm_source);

      } catch (err) {
        // Error
        submitBtn.disabled = false;
        submitBtn.textContent = '受け取る';
        errorEl.style.display = 'block';
        console.error('Email submission error:', err);
      }
    });

    // Clear error state on input
    input.addEventListener('input', () => {
      input.classList.remove('input-error');
      errorEl.style.display = 'none';
    });

    // Enter key submission
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        submitBtn.click();
      }
    });
  }

  // --- Brevo メール登録 ---
  // Primary: Subscription Form API（確実な登録を最優先）
  // Secondary: GAS → Contact API（全属性保存のため非同期で試行。GAS障害対応で一時的にセカンダリ化）
  // 変更理由: GASがBrevo APIエラーでもsuccess:trueを返し、6/10 23:35以降の登録が全件ロスト
  async submitToBrevo(email, step1Tag, step2Tags, step3Tag, step4Tag, step5Tag) {
    const GAS_SUBMIT_URL = 'https://script.google.com/macros/s/AKfycby7qMsnBrFs8pNZNqX7qb4R21ee2wfcw_V2--IA8hikrlqgcvBWOjROImcvTzY2cv6i/exec';
    const BREVO_FORM_URL = 'https://33f74781.sibforms.com/serve/MUIFAOmKNPs7lM4tRqjBWhsW13MGkZHSQtG8tgODk2JhnyDmAMcuRGTrZIhh3av1fhwYyO9o35VA0dtmM9ThdpFycs7LM3d_phuIhWV4j1JdYcpjKeHJW-081V0H7SrXl3z2RlGPnQTZ0duQ8R0X-fBU91qJ7cjmwRH4JTN57AWOvP-8fLMIRk1cYs6bYJXc3H12543HqPSsIxJMFQ==';

    const utm = Analytics.getUTMParams();
    const now = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // --- Primary: Brevo Subscription Form API（確実な登録） ---
    const formData = new FormData();
    formData.append('EMAIL', email);
    formData.append('WORK_STEP1_TAG', step1Tag);
    formData.append('WORK_STEP3_TAG', step3Tag);
    formData.append('WORK_STEP5_TAG', step5Tag);
    formData.append('WORK_STEP2_TAGS', step2Tags.join(','));
    formData.append('WORK_STEP4_TAG', step4Tag);
    formData.append('WORK_COMPLETED_AT', now);
    formData.append('WORK_UTM_SOURCE', utm.utm_source);
    formData.append('email_address_check', '');
    formData.append('locale', 'en');
    formData.append('html_type', 'simple');

    await fetch(BREVO_FORM_URL, {
      method: 'POST',
      body: formData,
      mode: 'no-cors'
    });

    // --- Secondary: GAS → Brevo Contact API（全属性保存のため非同期で試行） ---
    // GAS障害中でも上記Form APIで登録は完了済み。エラーは無視。
    try {
      fetch(GAS_SUBMIT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          email, step1: step1Tag, step2: step2Tags.join(','),
          step3: step3Tag, step4: step4Tag, step5: step5Tag,
          completedAt: now, utmSource: utm.utm_source,
        }),
      }).catch(() => {}); // Fire-and-forget
    } catch (e) { /* ignore */ }

    return true;
  }


  // --- Navigation ---
  nextStep() {
    this.currentStep++;
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (this.currentStep <= this.totalSteps) {
      this.renderStep(this.currentStep - 1);
    } else {
      this.renderResult();
    }
  }

  // --- Abandon tracking ---
  setupBeforeUnload() {
    window.addEventListener('beforeunload', () => {
      if (this.currentStep > 0 && this.currentStep <= this.totalSteps) {
        Analytics.trackAbandon(this.currentStep);
      }
    });
  }
}
