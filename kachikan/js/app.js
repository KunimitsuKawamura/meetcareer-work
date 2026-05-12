/**
 * ミートキャリア「わたしの価値観ワーク」
 * メインアプリケーションロジック
 * 
 * 3ステップ構成:
 * Step 1: 36個の価値観ワードから3つ選択
 * Step 2: 選んだ理由を入力
 * Step 3: 結果確認 + メール送信 + 無料相談会CTA
 */

document.addEventListener('DOMContentLoaded', () => {
  const app = new KachikanApp();
  app.init();
});

class KachikanApp {
  constructor() {
    this.currentStep = 0; // 0=hero, 1=select, 2=reason, 3=result
    this.selectedValues = []; // 選択した価値観ワード（最大3つ）
    this.reasons = {}; // 各価値観の理由
  }

  init() {
    this.renderHero();
    this.setupBeforeUnload();
  }

  // ===========================
  // Hero Screen
  // ===========================
  renderHero() {
    const container = document.getElementById('app-content');
    container.innerHTML = `
      <div class="screen active" id="screen-hero">
        <h1 class="hero-title fade-in-up">
          わたしの<span class="accent">価値観</span>ワーク
        </h1>
        <p class="hero-subtitle fade-in-up delay-1">
          あなたが「今」大事にしたい価値観を<br>見つけてみませんか
        </p>
        <div class="hero-principles fade-in-up delay-2">
          <ul>
            <li>直感で選んで大丈夫。正解はありません</li>
            <li>選んだ理由を書くことで気づきが生まれます</li>
            <li>深掘りしたくなったら、相談会で続きをやりましょう</li>
          </ul>
        </div>
        <button class="btn-primary fade-in-up delay-3" id="btn-start">
          はじめる
        </button>
      </div>
    `;

    document.getElementById('btn-start').addEventListener('click', () => {
      Analytics.trackStart();
      this.goToStep(1);
    });
  }

  // ===========================
  // Step 1: 価値観ワード選択
  // ===========================
  renderValueSelection() {
    const container = document.getElementById('app-content');

    const valueCards = VALUES.map(value => {
      const isSelected = this.selectedValues.includes(value);
      return `
        <div class="value-card ${isSelected ? 'selected' : ''}" data-value="${value}">
          ${value}
        </div>
      `;
    }).join('');

    const remaining = MAX_SELECTIONS - this.selectedValues.length;

    container.innerHTML = `
      <div class="screen active" id="screen-step-1">
        <div class="progress-bar">
          <div class="progress-fill" style="width: 0%"></div>
        </div>
        <div class="step-header fade-in-up">
          <span class="step-label">Step 1</span>
          <h2 class="step-question">あなたが「今」大事にしたい<br>価値観を<span class="accent">3つ</span>選んでください</h2>
          <p class="step-note">直感で選んでみてください。正解はありません。</p>
        </div>
        <div class="selection-counter fade-in-up delay-1" id="selection-counter">
          <span class="counter-text">あと<span class="counter-num" id="counter-num">${remaining}</span>つ選べます</span>
        </div>
        <div class="value-grid fade-in-up delay-1">
          ${valueCards}
        </div>
        <button class="btn-primary btn-next fade-in-up delay-2" id="btn-next" disabled>
          次へ
        </button>
      </div>
    `;

    // Animate progress bar
    requestAnimationFrame(() => {
      const fill = container.querySelector('.progress-fill');
      if (fill) fill.style.width = '33%';
    });

    this.setupValueCardListeners();
  }

  setupValueCardListeners() {
    const cards = document.querySelectorAll('.value-card');
    const nextBtn = document.getElementById('btn-next');
    const counterNum = document.getElementById('counter-num');
    const counter = document.getElementById('selection-counter');

    cards.forEach(card => {
      card.addEventListener('click', () => {
        const value = card.dataset.value;
        const idx = this.selectedValues.indexOf(value);

        if (idx > -1) {
          // Deselect
          this.selectedValues.splice(idx, 1);
          card.classList.remove('selected');
        } else if (this.selectedValues.length < MAX_SELECTIONS) {
          // Select
          this.selectedValues.push(value);
          card.classList.add('selected');
        }

        // Update counter
        const remaining = MAX_SELECTIONS - this.selectedValues.length;
        counterNum.textContent = remaining;

        if (remaining === 0) {
          counter.querySelector('.counter-text').innerHTML = '<span class="counter-complete">3つ選びました ✓</span>';
        } else {
          counter.querySelector('.counter-text').innerHTML = `あと<span class="counter-num" id="counter-num">${remaining}</span>つ選べます`;
        }

        // Lock/unlock cards
        cards.forEach(c => {
          if (this.selectedValues.length >= MAX_SELECTIONS && !c.classList.contains('selected')) {
            c.classList.add('locked');
          } else {
            c.classList.remove('locked');
          }
        });

        // Enable/disable next button
        nextBtn.disabled = this.selectedValues.length !== MAX_SELECTIONS;
      });
    });

    nextBtn.addEventListener('click', () => {
      if (this.selectedValues.length === MAX_SELECTIONS) {
        Analytics.trackValueSelect(this.selectedValues);
        this.goToStep(2);
      }
    });
  }

  // ===========================
  // Step 2: 理由入力
  // ===========================
  renderReasonInput() {
    const container = document.getElementById('app-content');

    const reasonCards = this.selectedValues.map((value, index) => `
      <div class="reason-card fade-in-up ${index > 0 ? 'delay-' + index : ''}">
        <div class="reason-card-header">
          <span class="reason-number">${index + 1}</span>
          <span class="reason-value">${value}</span>
        </div>
        <textarea
          class="reason-textarea"
          id="reason-${index}"
          data-value="${value}"
          placeholder="この価値観を選んだ理由や、思い浮かんだことを自由に書いてみてください"
          rows="4"
        >${this.reasons[value] || ''}</textarea>
      </div>
    `).join('');

    container.innerHTML = `
      <div class="screen active" id="screen-step-2">
        <div class="progress-bar">
          <div class="progress-fill" style="width: 33%"></div>
        </div>
        <div class="step-header fade-in-up">
          <span class="step-label">Step 2</span>
          <h2 class="step-question">選んだ価値観について<br>理由を書いてみましょう</h2>
          <p class="step-note">書くことで、より深い気づきが生まれます。<br>上手に書こうとしなくて大丈夫です。</p>
        </div>
        <div class="reason-cards">
          ${reasonCards}
        </div>
        <div class="step-nav fade-in-up delay-3">
          <button class="btn-secondary" id="btn-back">戻る</button>
          <button class="btn-primary" id="btn-next-reason">次へ</button>
        </div>
      </div>
    `;

    // Animate progress bar
    requestAnimationFrame(() => {
      const fill = container.querySelector('.progress-fill');
      if (fill) fill.style.width = '66%';
    });

    // Save reasons on input
    document.querySelectorAll('.reason-textarea').forEach(textarea => {
      textarea.addEventListener('input', () => {
        this.reasons[textarea.dataset.value] = textarea.value;
      });
    });

    // Back button
    document.getElementById('btn-back').addEventListener('click', () => {
      this.goToStep(1);
    });

    // Next button (理由は必須にしない)
    document.getElementById('btn-next-reason').addEventListener('click', () => {
      // 理由をすべて保存
      document.querySelectorAll('.reason-textarea').forEach(textarea => {
        this.reasons[textarea.dataset.value] = textarea.value;
      });
      Analytics.trackReasonComplete();
      this.goToStep(3);
    });
  }

  // ===========================
  // Step 3: 結果確認 + メール送信 + CTA
  // ===========================
  renderResult() {
    const container = document.getElementById('app-content');

    const summaryCards = this.selectedValues.map((value, index) => {
      const reason = this.reasons[value] || '';
      return `
        <div class="summary-card fade-in-up ${index > 0 ? 'delay-' + index : ''}">
          <div class="summary-header">
            <span class="summary-number">${index + 1}</span>
            <span class="summary-value">${value}</span>
          </div>
          ${reason ? `<p class="summary-reason">${this.escapeHtml(reason)}</p>` : '<p class="summary-reason no-reason">（理由は未入力です）</p>'}
        </div>
      `;
    }).join('');

    // Build UTM-aware CTA URL
    const utm = Analytics.getUTMParams();
    let ctaUrl = 'https://www.meetcareer.net/counseling/';
    const queryParams = [];
    if (utm.utm_source !== '(direct)') queryParams.push(`utm_source=${encodeURIComponent(utm.utm_source)}`);
    if (utm.utm_medium !== '(none)') queryParams.push(`utm_medium=${encodeURIComponent(utm.utm_medium)}`);
    queryParams.push('utm_campaign=kachikan_work');
    queryParams.push('utm_content=result_cta');
    if (queryParams.length > 0) ctaUrl += '?' + queryParams.join('&');

    container.innerHTML = `
      <div class="screen active" id="screen-result">
        <div class="progress-bar">
          <div class="progress-fill" style="width: 66%"></div>
        </div>

        <div class="result-intro fade-in-up">
          <p class="result-heading">おつかれさまでした</p>
          <p class="result-text">あなたが「今」大事にしたい価値観です。</p>
        </div>

        <div class="summary-cards">
          ${summaryCards}
        </div>

        <div class="result-divider fade-in-up delay-2"></div>

        <div class="reflection-card fade-in-up delay-3">
          <p class="reflection-heading">あなたへの問いかけ</p>
          <p class="reflection-question">
            今日選んだ3つの価値観——<br>
            半年前だったら、同じものを選んでいましたか？
          </p>
        </div>

        <div class="email-capture-section fade-in-up delay-3" id="email-capture-section">
          <div class="email-capture-card">
            <p class="email-capture-icon">📩</p>
            <p class="email-capture-heading">この結果をメールで受け取りませんか？</p>
            <p class="email-capture-text">
              選んだ価値観と理由をメールでお届けします。<br>振り返りにご活用ください。
            </p>
            <div class="email-form" id="email-form">
              <input type="email" class="email-input" id="email-input"
                placeholder="メールアドレスを入力" required
                autocomplete="email" inputmode="email">
              <button class="btn-primary btn-email-submit" id="btn-email-submit">
                受け取る
              </button>
            </div>
            <p class="email-note">※ 配信停止はいつでも可能です</p>
          </div>
          <div id="email-success" class="email-success" style="display:none">
            <div class="email-success-inner">
              <span class="email-success-icon">✓</span>
              <p class="email-success-text">送信しました！<br>結果メールをお届けします。</p>
            </div>
          </div>
          <div id="email-error" class="email-error" style="display:none">
            <p class="email-error-text">送信に失敗しました。もう一度お試しください。</p>
          </div>
        </div>

        <div class="cta-section fade-in-up delay-4">
          <p class="cta-heading">価値観をもっと深掘りしませんか？</p>
          <p class="cta-text">選んだ価値観の背景にある、あなたの本当の想いを<br>もう一度一緒に言語化してみませんか。</p>
          <a href="${ctaUrl}" class="btn-primary" id="btn-cta" target="_blank" rel="noopener">
            無料で相談してみる
          </a>
        </div>

        <div class="retry-section fade-in-up delay-4">
          <button class="btn-secondary" id="btn-retry">もう一度やってみる</button>
        </div>
      </div>
    `;

    // Animate progress bar to 100%
    requestAnimationFrame(() => {
      const fill = container.querySelector('.progress-fill');
      if (fill) fill.style.width = '100%';
    });

    // Track completion
    Analytics.trackComplete({ values: this.selectedValues });
    Analytics.trackEmailFormView();

    // Email form
    this.setupEmailForm();

    // CTA click
    document.getElementById('btn-cta').addEventListener('click', () => {
      Analytics.trackCTAClick();
    });

    // Retry
    document.getElementById('btn-retry').addEventListener('click', () => {
      this.selectedValues = [];
      this.reasons = {};
      this.currentStep = 0;
      this.renderHero();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // ===========================
  // Email Capture
  // ===========================
  setupEmailForm() {
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
        await this.submitToBrevo(email);

        // Success
        captureCard.style.display = 'none';
        successEl.style.display = 'block';

        // Track GA4 event
        const utm = Analytics.getUTMParams();
        Analytics.trackEmailSubmit(utm.utm_source);

      } catch (err) {
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

  // ===========================
  // Brevo Subscription Form API
  // ===========================
  async submitToBrevo(email) {
    // TODO: Brevoフォーム作成後、URLを設定
    const BREVO_FORM_URL = 'https://33f74781.sibforms.com/serve/MUIFAHg2nXrux71zxm9Or4nURyhdbTVyXE4RV8Zu7nEEQZ4IvWkzc4TS8lF75_KBOV08CYOXjbDvtRPJU92MOeeZfKHPcYEzYONVnP4v9Az67nM4PTuGR3WkQoCtuYenDx7yLd1B2G0Vrax5pnZ887dG3nSWPGdr_-CmnF14DFJ5mXrcnN06v-bW6F8Ew6fpTtATAmv3cZQ9-6SWRA==';

    const utm = Analytics.getUTMParams();
    const now = new Date().toISOString().split('T')[0];

    const formData = new FormData();
    formData.append('EMAIL', email);
    formData.append('KACHIKAN_VALUE_1', this.selectedValues[0] || '');
    formData.append('KACHIKAN_VALUE_2', this.selectedValues[1] || '');
    formData.append('KACHIKAN_VALUE_3', this.selectedValues[2] || '');
    formData.append('KACHIKAN_REASON_1', this.reasons[this.selectedValues[0]] || '');
    formData.append('KACHIKAN_REASON_2', this.reasons[this.selectedValues[1]] || '');
    formData.append('KACHIKAN_REASON_3', this.reasons[this.selectedValues[2]] || '');
    formData.append('KACHIKAN_COMPLETED_AT', now);
    formData.append('KACHIKAN_UTM_SOURCE', utm.utm_source);
    // Brevo hidden fields
    formData.append('email_address_check', '');
    formData.append('locale', 'en');
    formData.append('html_type', 'simple');

    const response = await fetch(BREVO_FORM_URL, {
      method: 'POST',
      body: formData,
      mode: 'no-cors'
    });

    return true;
  }

  // ===========================
  // Navigation
  // ===========================
  goToStep(step) {
    this.currentStep = step;
    window.scrollTo({ top: 0, behavior: 'smooth' });

    switch (step) {
      case 1:
        this.renderValueSelection();
        break;
      case 2:
        this.renderReasonInput();
        break;
      case 3:
        this.renderResult();
        break;
    }
  }

  // ===========================
  // Utilities
  // ===========================
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML.replace(/\n/g, '<br>');
  }

  setupBeforeUnload() {
    window.addEventListener('beforeunload', () => {
      if (this.currentStep > 0 && this.currentStep < 3) {
        Analytics.trackAbandon(this.currentStep);
      }
    });
  }
}
