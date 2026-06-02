/**
 * ミートキャリア 計測モジュール
 * UTMパラメータ取得 + GA4イベント送信 + Meta Pixel連携
 */

const Analytics = (() => {
    // UTMパラメータを取得
    function getUTMParams() {
        const params = new URLSearchParams(window.location.search);
        return {
            utm_source: params.get('utm_source') || '(direct)',
            utm_medium: params.get('utm_medium') || '(none)',
            utm_campaign: params.get('utm_campaign') || '(none)',
            utm_content: params.get('utm_content') || '',
            utm_term: params.get('utm_term') || ''
        };
    }

    // リファラー取得
    function getReferrer() {
        return document.referrer || '(direct)';
    }

    // GA4イベント送信
    function sendEvent(eventName, params = {}) {
        // UTMを自動付与
        const utm = getUTMParams();
        const enrichedParams = {
            ...params,
            utm_source: utm.utm_source,
            utm_medium: utm.utm_medium,
            utm_campaign: utm.utm_campaign,
            referrer: getReferrer()
        };

        // GA4が読み込まれている場合
        if (typeof gtag === 'function') {
            gtag('event', eventName, enrichedParams);
        }

        // Meta Pixel連携
        sendMetaPixelEvent(eventName, params);

        // デバッグ用コンソールログ
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            console.log(`📊 [Analytics] ${eventName}`, enrichedParams);
        }
    }

    // Meta Pixel イベントマッピング
    function sendMetaPixelEvent(eventName, params) {
        if (typeof fbq !== 'function') return;

        switch (eventName) {
            case 'work_start':
                fbq('track', 'ViewContent', { content_name: '3min_work_start' });
                break;
            case 'work_complete':
                fbq('track', 'CompleteRegistration', { content_name: '3min_work_complete' });
                break;
            case 'work_email_submit':
                fbq('track', 'Lead', { content_name: '3min_work_email' });
                break;
        }
    }

    // 公開API
    return {
        trackStart: () => sendEvent('work_start'),
        trackStep: (stepNumber, selectedOption) => sendEvent('work_step_complete', {
            step_number: stepNumber,
            selected_option: selectedOption
        }),
        trackStepMulti: (stepNumber, selectedOptions) => sendEvent('work_step_complete', {
            step_number: stepNumber,
            selected_options: selectedOptions.join(',')
        }),
        trackComplete: (answers) => sendEvent('work_complete', {
            answers: JSON.stringify(answers)
        }),
        trackCTAClick: (destination = 'counseling') => sendEvent('work_cta_click', {
            destination: destination
        }),
        trackAbandon: (lastStep) => sendEvent('work_abandon', {
            last_step: lastStep
        }),
        trackEmailSubmit: (step1Tag, utmSource) => sendEvent('work_email_submit', {
            step1_tag: step1Tag,
            utm_source_value: utmSource
        }),
        trackEmailFormView: () => sendEvent('work_email_form_view'),
        trackResultScroll: (depth) => sendEvent('work_result_scroll', {
            depth: String(depth)
        }),
        trackResultSectionView: (section) => sendEvent('work_result_section_view', {
            section: section
        }),
        trackEmailFocus: () => sendEvent('work_email_focus'),
        getUTMParams
    };
})();
