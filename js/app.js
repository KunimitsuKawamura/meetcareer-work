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
          忙しい毎日の中で、<br>ほんの少しだけ立ち止まってみませんか
        </p>
        <div class="hero-principles fade-in-up delay-2">
          <ul>
            <li>答えを出さなくて大丈夫</li>
            <li>考え込まなくて大丈夫。直感で選ぶだけ</li>
            <li>自分をジャッジしなくて大丈夫</li>
            <li>今の自分を、ただ見つめるだけのワーク</li>
          </ul>
        </div>
        <button class="btn-primary fade-in-up delay-3" id="btn-start">
          3分でやってみる（無料）
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

    // Build background insights (blurred)
    const backgroundInsightsHTML = step2Tags.map(tag => {
      const bg = RESULT_MESSAGES.background[tag];
      return bg ? `<li>${bg.insight}</li>` : '';
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
        <div class="result-card fade-in-up">
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
        <div class="result-card fade-in-up delay-1">
          <p class="result-heading">あなたのモヤモヤの背景</p>
          <div class="result-factor-tags">
            ${backgroundTagsHTML}
          </div>
          <p class="result-factor-summary">${step2Tags.length}つの要素が、今のあなたの気持ちに影響しているようです。</p>
          <div class="result-blurred-teaser result-blurred-teaser-tall">
            <ul class="result-text-blurred result-insight-list">${backgroundInsightsHTML}</ul>
            <div class="result-blur-overlay"></div>
          </div>
        </div>

        <div class="result-divider fade-in-up delay-2"></div>

        <!-- Section 3: Values (Step3) -->
        <div class="result-card fade-in-up delay-2">
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
        <div class="result-card fade-in-up delay-3">
          <p class="result-heading">今のあなたの状態</p>
          <p class="result-self-state-label">${selfStateData.label}</p>
          <p class="result-text">${selfStateData.insight}</p>
          <div class="result-blurred-teaser">
            <p class="result-text-blurred">${selfStateData.detail}</p>
            <div class="result-blur-overlay"></div>
          </div>
        </div>

        <div class="result-divider fade-in-up delay-4"></div>

        <!-- Section 5: Future (Step5) -->
        <div class="result-card fade-in-up delay-4">
          <p class="result-heading">これからのあなたへ</p>
          <p class="result-text">${closingData.outline}</p>
          <p class="result-teaser-text">${closingData.teaser}</p>
          <div class="result-blurred-teaser result-blurred-teaser-tall">
            <p class="result-text-blurred">${closingData.full}</p>
            <div class="result-blur-overlay"></div>
          </div>
        </div>

        <!-- Email Capture -->
        <div class="email-capture-section fade-in-up delay-5" id="email-capture-section">
          <div class="email-capture-card">
            <p class="email-capture-icon">📩</p>
            <p class="email-capture-heading">詳しい結果レポートをメールでお届けします</p>
            <p class="email-capture-text">
              あなたの回答に合わせた<strong>5つの分析結果</strong>と、<br>これからのキャリアを考えるヒントをお届けします。
            </p>
            <div class="email-form" id="email-form">
              <input type="email" class="email-input" id="email-input"
                placeholder="メールアドレスを入力" required
                autocomplete="email" inputmode="email">
              <button class="btn-primary btn-email-submit" id="btn-email-submit">
                詳しい結果を受け取る
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

        <div class="reflection-card fade-in-up delay-5">
          <p class="reflection-heading">${reflection.heading}</p>
          <ul class="reflection-list">
            ${reflectionItems}
          </ul>
        </div>

        <div class="cta-section fade-in-up delay-5">
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
      </div>
    `;

    // Track completion
    Analytics.trackComplete(this.answers);

    // Track email form view
    Analytics.trackEmailFormView();

    // Email form submission
    this.setupEmailForm(step1Tag, step3Tag, step5Tag);

    // CTA click tracking
    document.getElementById('btn-cta').addEventListener('click', () => {
      const destination = RESULT_MESSAGES.cta.trackDestination || 'counseling';
      Analytics.trackCTAClick(destination);
    });

    // Retry
    document.getElementById('btn-retry').addEventListener('click', () => {
      this.answers = {};
      this.currentStep = 0;
      this.renderHero();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // --- Email Capture ---
  setupEmailForm(step1Tag, step3Tag, step5Tag) {
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
        await this.submitToBrevo(email, step1Tag, step3Tag, step5Tag);

        // Success
        captureCard.style.display = 'none';
        successEl.style.display = 'block';

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

  // --- Brevo Subscription Form API ---
  async submitToBrevo(email, step1Tag, step3Tag, step5Tag) {
    const BREVO_FORM_URL = 'https://33f74781.sibforms.com/serve/MUIFAOmKNPs7lM4tRqjBWhsW13MGkZHSQtG8tgODk2JhnyDmAMcuRGTrZIhh3av1fhwYyO9o35VA0dtmM9ThdpFycs7LM3d_phuIhWV4j1JdYcpjKeHJW-081V0H7SrXl3z2RlGPnQTZ0duQ8R0X-fBU91qJ7cjmwRH4JTN57AWOvP-8fLMIRk1cYs6bYJXc3H12543HqPSsIxJMFQ==';

    const utm = Analytics.getUTMParams();
    const now = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    const formData = new FormData();
    formData.append('EMAIL', email);
    formData.append('WORK_STEP1_TAG', step1Tag);
    formData.append('WORK_STEP3_TAG', step3Tag);
    formData.append('WORK_STEP5_TAG', step5Tag);
    formData.append('WORK_COMPLETED_AT', now);
    formData.append('WORK_UTM_SOURCE', utm.utm_source);
    // Brevo hidden fields (honeypot & metadata)
    formData.append('email_address_check', '');
    formData.append('locale', 'en');
    formData.append('html_type', 'simple');

    const response = await fetch(BREVO_FORM_URL, {
      method: 'POST',
      body: formData,
      mode: 'no-cors' // Brevo form endpoints don't support CORS
    });

    // no-cors mode always returns opaque response, so we assume success
    // if no network error is thrown
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
