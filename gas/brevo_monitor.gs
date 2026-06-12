/**
 * Brevo登録モニタリング（6時間ごと自動実行）
 * 
 * リスト#12の最終登録日を確認し、24時間以上途絶していたらSlack通知。
 * 
 * 設定方法:
 * 1. このコードを既存GASプロジェクトに追加
 * 2. Script Properties に以下を設定:
 *    - BREVO_API_KEY: （既存のまま）
 *    - SLACK_WEBHOOK_URL: Slack Incoming Webhook URL
 * 3. setupBrevoMonitorTrigger() を1回だけ手動実行（トリガー登録）
 */

/**
 * メイン: Brevo登録の健全性チェック
 */
function checkBrevoRegistration() {
  var apiKey = PropertiesService.getScriptProperties().getProperty('BREVO_API_KEY');
  if (!apiKey) {
    sendSlackAlert('⚠️ BREVO_API_KEY が未設定です');
    return;
  }

  // リスト#12の最新コンタクト5件を取得
  var response = UrlFetchApp.fetch(
    'https://api.brevo.com/v3/contacts/lists/12/contacts?limit=5&offset=0&sort=desc',
    {
      method: 'get',
      headers: {
        'api-key': apiKey,
        'Accept': 'application/json',
      },
      muteHttpExceptions: true,
    }
  );

  if (response.getResponseCode() !== 200) {
    sendSlackAlert('⚠️ Brevo API接続エラー (HTTP ' + response.getResponseCode() + ')');
    return;
  }

  var data = JSON.parse(response.getContentText());
  var contacts = data.contacts || [];
  var total = data.count || 0;

  // 社内テストメールを除外して最新の登録日を特定
  var testDomains = ['f-ruor.jp', 'fruor.jp'];
  var latestCreated = null;

  for (var i = 0; i < contacts.length; i++) {
    var email = contacts[i].email || '';
    var isTest = testDomains.some(function(d) { return email.endsWith('@' + d); });
    if (isTest) continue;

    var createdAt = contacts[i].createdAt;
    if (createdAt) {
      var created = new Date(createdAt);
      if (!latestCreated || created > latestCreated) {
        latestCreated = created;
      }
    }
  }

  if (!latestCreated) {
    sendSlackAlert('⚠️ リスト#12に実ユーザーのコンタクトが見つかりません');
    return;
  }

  // 経過時間を計算
  var now = new Date();
  var hoursSinceLast = (now - latestCreated) / (1000 * 60 * 60);
  var lastDateStr = Utilities.formatDate(latestCreated, 'Asia/Tokyo', 'MM/dd HH:mm');

  if (hoursSinceLast >= 24) {
    sendSlackAlert(
      '🚨 *Brevo登録が' + Math.floor(hoursSinceLast) + '時間途絶しています*\n\n' +
      '• 最終登録: ' + lastDateStr + '（' + Math.floor(hoursSinceLast) + '時間前）\n' +
      '• リスト#12 総数: ' + total + '名\n' +
      '• GA4の `work_email_submit` と乖離がないか確認してください\n' +
      '• 前回の障害（6/10-12）: GAS中継が失敗し8件のリードをロスト'
    );
  } else {
    Logger.log('Brevo登録正常 | 最終: ' + lastDateStr + ' | 経過: ' + hoursSinceLast.toFixed(1) + 'h');
  }
}

/**
 * Slack Incoming Webhook で通知
 */
function sendSlackAlert(message) {
  var webhookUrl = PropertiesService.getScriptProperties().getProperty('SLACK_WEBHOOK_URL');
  if (!webhookUrl) {
    Logger.log('SLACK_WEBHOOK_URL が未設定。メッセージ: ' + message);
    // フォールバック: メール通知
    MailApp.sendEmail(
      Session.getActiveUser().getEmail(),
      '🚨 Brevo登録異常検知',
      message.replace(/\*/g, '').replace(/\n/g, '\r\n')
    );
    return;
  }

  var payload = {
    text: message,
    unfurl_links: false,
  };

  UrlFetchApp.fetch(webhookUrl, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });
}

/**
 * 6時間ごとのトリガーを設定（1回だけ実行）
 */
function setupBrevoMonitorTrigger() {
  // 既存のcheckBrevoRegistrationトリガーを削除
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'checkBrevoRegistration') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  // 6時間ごとのトリガーを作成
  ScriptApp.newTrigger('checkBrevoRegistration')
    .timeBased()
    .everyHours(6)
    .create();

  Logger.log('✅ 6時間ごとのBrevoモニタリングトリガーを設定しました');
}
