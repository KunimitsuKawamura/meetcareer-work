/**
 * ミートキャリア 価値観ワーク 計測モジュール
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
        const utm = getUTMParams();
        const enrichedParams = {
            ...params,
            utm_source: utm.utm_source,
            utm_medium: utm.utm_medium,
            utm_campaign: utm.utm_campaign,
            referrer: getReferrer()
        };

        if (typeof gtag === 'function') {
            gtag('event', eventName, enrichedParams);
        }

        // デバッグ用
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            console.log(`📊 [Analytics] ${eventName}`, enrichedParams);
        }
    }

    return {
        trackStart: () => sendEvent('kachikan_start'),
        trackValueSelect: (values) => sendEvent('kachikan_values_selected', {
            value_1: values[0] || '',
            value_2: values[1] || '',
            value_3: values[2] || ''
        }),
        trackReasonComplete: () => sendEvent('kachikan_reasons_complete'),
        trackComplete: (data) => sendEvent('kachikan_complete', {
            values: data.values.join(','),
        }),
        trackEmailSubmit: (utmSource) => sendEvent('kachikan_email_submit', {
            utm_source_value: utmSource
        }),
        trackEmailFormView: () => sendEvent('kachikan_email_form_view'),
        trackCTAClick: () => sendEvent('kachikan_cta_click', {
            destination: 'counseling'
        }),
        trackAbandon: (lastStep) => sendEvent('kachikan_abandon', {
            last_step: lastStep
        }),
        getUTMParams
    };
})();
