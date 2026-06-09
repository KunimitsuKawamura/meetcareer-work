/**
 * Brevo 3分ワーク メール登録 中継API
 * 
 * GitHub Pagesの3分ワークから呼び出され、
 * Brevo Contact APIを使ってコンタクトを作成/更新し、
 * リスト#12に追加します。
 * 
 * 設定方法:
 * 1. Script Properties に BREVO_API_KEY を設定
 * 2. Web App として「Anyone」にデプロイ
 * 3. デプロイURL を app.js の GAS_SUBMIT_URL に設定
 * 
 * 受信パラメータ (POST body JSON):
 *   email, step1, step2, step3, step4, step5, completedAt, utmSource
 */

function doPost(e) {
  // CORS preflight は GAS Web App では自動処理されるため不要
  
  let payload;
  try {
    payload = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonResponse({ success: false, error: 'Invalid JSON payload' }, 400);
  }
  
  const email = payload.email;
  if (!email) {
    return jsonResponse({ success: false, error: 'email is required' }, 400);
  }
  
  // ハニーポットチェック
  if (payload.hp) {
    // ボット送信の可能性 → 静かに成功レスポンスを返す
    return jsonResponse({ success: true });
  }
  
  try {
    const apiKey = PropertiesService.getScriptProperties().getProperty('BREVO_API_KEY');
    if (!apiKey) {
      throw new Error('BREVO_API_KEY not configured');
    }
    
    // Brevo Contact API: コンタクトを作成（既存なら更新）してリスト#12に追加
    const brevoPayload = {
      email: email,
      attributes: {
        WORK_STEP1_TAG: payload.step1 || '',
        WORK_STEP2_TAGS: payload.step2 || '',
        WORK_STEP3_TAG: payload.step3 || '',
        WORK_STEP4_TAG: payload.step4 || '',
        WORK_STEP5_TAG: payload.step5 || '',
        WORK_COMPLETED_AT: payload.completedAt || '',
        WORK_UTM_SOURCE: payload.utmSource || '(direct)',
      },
      listIds: [12],       // 3分ワーク完了者リスト
      updateEnabled: true, // 既存コンタクトの場合は属性を上書き
    };
    
    const response = UrlFetchApp.fetch(
      'https://api.brevo.com/v3/contacts',
      {
        method: 'post',
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        payload: JSON.stringify(brevoPayload),
        muteHttpExceptions: true,
      }
    );
    
    const statusCode = response.getResponseCode();
    
    if (statusCode === 201 || statusCode === 204 || statusCode === 200) {
      Logger.log('Successfully created/updated contact: ' + email);
      return jsonResponse({ success: true });
    } else {
      const errorBody = response.getContentText();
      Logger.log('Brevo API error: ' + statusCode + ' - ' + errorBody);
      
      // duplicate_parameter エラー（既存コンタクト）でも updateEnabled:true なら通常成功する
      // それ以外のエラーはログに記録して成功扱いにする（ユーザー体験を損なわないため）
      return jsonResponse({ success: true, warning: 'API returned ' + statusCode });
    }
    
  } catch (error) {
    Logger.log('Error: ' + error.message);
    return jsonResponse({ success: false, error: error.message }, 500);
  }
}

/**
 * GETリクエスト: ヘルスチェック用
 */
function doGet(e) {
  return jsonResponse({ status: 'ok', service: 'brevo-work-submit' });
}

/**
 * JSONレスポンスを生成
 */
function jsonResponse(data, statusCode) {
  return ContentService.createTextOutput(
    JSON.stringify(data)
  ).setMimeType(ContentService.MimeType.JSON);
}
