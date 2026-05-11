/**
 * Brevo配信停止 中継API
 * 
 * GitHub Pagesの配信停止ページから呼び出され、
 * Brevo APIを使って連絡先をブラックリストに追加します。
 * 
 * 設定方法:
 * 1. Script Properties に BREVO_API_KEY を設定
 * 2. Web App として「Anyone」にデプロイ
 */

function doGet(e) {
  const email = e.parameter.email;
  
  if (!email) {
    return ContentService.createTextOutput(
      JSON.stringify({ success: false, error: 'email parameter required' })
    ).setMimeType(ContentService.MimeType.JSON);
  }
  
  try {
    const apiKey = PropertiesService.getScriptProperties().getProperty('BREVO_API_KEY');
    
    if (!apiKey) {
      throw new Error('BREVO_API_KEY not configured');
    }
    
    // Brevo API: コンタクトをブラックリストに追加
    const response = UrlFetchApp.fetch(
      'https://api.brevo.com/v3/contacts/' + encodeURIComponent(email),
      {
        method: 'put',
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        payload: JSON.stringify({
          emailBlacklisted: true
        }),
        muteHttpExceptions: true
      }
    );
    
    const statusCode = response.getResponseCode();
    
    if (statusCode === 204 || statusCode === 200) {
      Logger.log('Successfully blacklisted: ' + email);
      return ContentService.createTextOutput(
        JSON.stringify({ success: true })
      ).setMimeType(ContentService.MimeType.JSON);
    } else {
      Logger.log('Brevo API error: ' + statusCode + ' - ' + response.getContentText());
      return ContentService.createTextOutput(
        JSON.stringify({ success: false, error: 'API error: ' + statusCode })
      ).setMimeType(ContentService.MimeType.JSON);
    }
    
  } catch (error) {
    Logger.log('Error: ' + error.message);
    return ContentService.createTextOutput(
      JSON.stringify({ success: false, error: error.message })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}
