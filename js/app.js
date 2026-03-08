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

    let nextBtnHTML = '';
    if (q.type === 'multi') {
      nextBtnHTML = `
        <button class="btn-primary btn-next" id="btn-next" disabled>
          次へ
        </button>
      `;
    }

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
        ${nextBtnHTML}
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

          // Track and advance after short delay
          Analytics.trackStep(question.id, card.dataset.tag);
          setTimeout(() => this.nextStep(), 400);
        });
      });
    } else if (question.type === 'multi') {
      const nextBtn = document.getElementById('btn-next');
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
    const step3Tag = this.answers[3]?.tag || 'authenticity';
    const step5Tag = this.answers[5]?.tag || 'verbalize';

    const opening = RESULT_MESSAGES.opening[step1Tag] || RESULT_MESSAGES.opening.moyamoya;
    const middle = RESULT_MESSAGES.middle[step3Tag] || RESULT_MESSAGES.middle.authenticity;
    const closing = RESULT_MESSAGES.closing[step5Tag] || RESULT_MESSAGES.closing.verbalize;
    const reflection = RESULT_MESSAGES.reflection;
    const cta = RESULT_MESSAGES.cta;

    const reflectionItems = reflection.questions.map(q => `<li>${q}</li>`).join('');

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

        <div class="result-card fade-in-up">
          <p class="result-heading">ワークおつかれさまでした</p>
          <p class="result-text">${opening}</p>
        </div>

        <div class="result-divider fade-in-up delay-1"></div>

        <div class="result-card fade-in-up delay-1">
          <p class="result-heading">あなたが今、大切にしたいこと</p>
          <p class="result-text">${middle}</p>
        </div>

        <div class="result-divider fade-in-up delay-2"></div>

        <div class="result-card fade-in-up delay-2">
          <p class="result-heading">これからのあなたへ</p>
          <p class="result-text">${closing}</p>
        </div>

        <div class="reflection-card fade-in-up delay-3">
          <p class="reflection-heading">${reflection.heading}</p>
          <ul class="reflection-list">
            ${reflectionItems}
          </ul>
        </div>

        <div class="cta-section fade-in-up delay-4">
          <p class="cta-heading">${cta.heading}</p>
          <p class="cta-text">${cta.text}</p>
          <a href="${ctaUrl}" class="btn-primary" id="btn-cta" target="_blank" rel="noopener">
            ${cta.buttonText}
          </a>
        </div>

        <div class="retry-section fade-in-up delay-4">
          <button class="btn-secondary" id="btn-retry">もう一度やってみる</button>
        </div>
      </div>
    `;

    // Track completion
    Analytics.trackComplete(this.answers);

    // CTA click tracking
    document.getElementById('btn-cta').addEventListener('click', () => {
      Analytics.trackCTAClick();
    });

    // Retry
    document.getElementById('btn-retry').addEventListener('click', () => {
      this.answers = {};
      this.currentStep = 0;
      this.renderHero();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
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
