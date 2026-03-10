/**
 * ミートキャリア 計測モジュール
 * UTMパラメータ取得 + GA4イベント送信
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

        // デバッグ用コンソールログ
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            console.log(`📊 [Analytics] ${eventName}`, enrichedParams);
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
        getUTMParams
    };
})();
