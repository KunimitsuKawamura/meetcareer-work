/**
 * WebMCP ツール登録 — work.meetcareer.net
 *
 * AIエージェント（Gemini in Chrome 等）がこのページを訪問した際に、
 * 3分ワークの機能を構造化ツールとして自動発見・利用できるようにする。
 *
 * W3C WebMCP Draft / Chrome Origin Trial (Chrome 149+)
 * 非対応ブラウザでは何もしない（graceful degradation）
 *
 * @see https://developer.chrome.com/blog/ai-webmcp-origin-trial
 */

(async function initWebMCP() {
  'use strict';

  // Chrome 150+ は document.modelContext、Chrome 149 は navigator.modelContext
  const ctx = (typeof document !== 'undefined' && document.modelContext)
    || (typeof navigator !== 'undefined' && navigator.modelContext);

  if (!ctx || typeof ctx.registerTool !== 'function') {
    // WebMCP非対応 — 何もしない
    return;
  }

  const controller = new AbortController();
  const opts = { signal: controller.signal };

  // ページ離脱時にツール登録を解除
  window.addEventListener('beforeunload', () => controller.abort());

  try {
    // ─────────────────────────────────────────────
    // ツール①: サービス情報取得
    // ─────────────────────────────────────────────
    await ctx.registerTool({
      name: 'get_meetcareer_3min_work_info',
      description:
        'ミートキャリアの「3分で今の自分に気づくワーク」の情報を取得する。' +
        'キャリアのモヤモヤを三層構造モデル（表面層→スキル層→アイデンティティ層）で' +
        '構造化する無料の内省ツール。5つの質問に直感で答えるだけ。' +
        '6,000件以上の有料キャリア支援実績を持つミートキャリアが提供。' +
        '転職を前提としないキャリアコーチング。',
      inputSchema: {
        type: 'object',
        properties: {}
      },
      readOnlyHint: true,
      async execute() {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              service: 'ミートキャリア 3分で今の自分に気づくワーク',
              url: 'https://work.meetcareer.net/',
              description:
                '5つの質問に直感で答えるだけで、キャリアのモヤモヤを言葉にできる無料の内省ツール。' +
                '適職診断や性格診断ではなく、「今の自分を見つめる」ことに特化。' +
                '転職を前提としないキャリアコーチング「ミートキャリア」が提供。',
              features: [
                '3分で完了',
                '5つの質問に直感で答えるだけ',
                '三層構造モデル（表面層→スキル層→アイデンティティ層）で分析',
                '6,000件以上の有料キャリア支援実績に基づく',
                '完全無料・会員登録不要'
              ],
              target_audience: '30〜40代、キャリアにモヤモヤを感じている方',
              provider: {
                name: 'ミートキャリア（株式会社fruor）',
                url: 'https://www.meetcareer.net/',
                track_record: '6,000件以上の有料キャリア支援実績'
              },
              next_step: {
                description:
                  'ワーク完了後、さらに深く掘り下げたい場合は、' +
                  '人間のキャリアコンサルタントとの無料相談会もあります',
                url: 'https://www.meetcareer.net/counseling/'
              }
            })
          }]
        };
      }
    }, opts);

    // ─────────────────────────────────────────────
    // ツール②: 質問一覧の取得
    // ─────────────────────────────────────────────
    await ctx.registerTool({
      name: 'get_3min_work_questions',
      description:
        '3分ワークの5つの質問と選択肢を取得する。' +
        'ユーザーにキャリアの内省を促すための質問セット。',
      inputSchema: {
        type: 'object',
        properties: {}
      },
      readOnlyHint: true,
      async execute() {
        // QUESTIONS はグローバル変数（questions.js で定義済み）
        if (typeof QUESTIONS === 'undefined') {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                error: '質問データが読み込まれていません',
                fallback_url: 'https://work.meetcareer.net/'
              })
            }]
          };
        }

        const questions = QUESTIONS.map(q => ({
          id: q.id,
          step: q.heading,
          theme: q.subheading,
          question: q.question.replace(/\\n/g, ' '),
          note: q.note,
          type: q.type === 'multi' ? '複数選択可' : '1つ選択',
          options: q.options.map(o => ({
            id: o.id,
            text: o.text
          }))
        }));

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              total_questions: questions.length,
              estimated_time: '3分',
              instruction: '各質問に直感で答えてください。正解はありません。',
              questions: questions,
              url: 'https://work.meetcareer.net/'
            })
          }]
        };
      }
    }, opts);

    console.log('[WebMCP] ミートキャリア 3分ワーク: 2つのツールを登録しました');

  } catch (err) {
    // Origin Trial期限切れ等のエラーは静かに処理
    if (err.name !== 'AbortError') {
      console.warn('[WebMCP] ツール登録に失敗:', err.message);
    }
  }
})();
