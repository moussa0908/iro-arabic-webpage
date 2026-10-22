/**
 * 상담폼 수신용 Google Apps Script
 *
 * 하는 일: 웹사이트 상담폼 → (1) 구글 시트에 한 줄 저장 → (2) 담당자 이메일 알림
 *          → (3) 선택: 텔레그램 또는 슬랙으로 즉시 알림
 *
 * 설치: docs/상담폼-연동-가이드.md 참고
 */

// ===== 설정 =====
const SHEET_NAME = '상담요청';
const NOTIFY_EMAILS = ['담당자@example.com'];   // 알림 받을 주소로 바꾸세요 (여러 개 가능)
const TELEGRAM_BOT_TOKEN = '';                   // 선택: 텔레그램 봇 토큰
const TELEGRAM_CHAT_ID = '';                     // 선택: 알림 받을 채팅 ID
const SLACK_WEBHOOK_URL = '';                    // 선택: 슬랙 Incoming Webhook

const COLUMNS = [
  ['submitted_at', '접수시각'], ['clinic', '병원'], ['ref', '요청코드'], ['name', '이름'],
  ['phone', 'WhatsApp'], ['country', '국가'], ['procedures', '관심 시술'], ['month', '방문 예정월'],
  ['stay', '체류 가능 기간'], ['language', '선호 언어'], ['message', '메시지'], ['page', '접수 페이지'],
  ['utm_source', 'utm_source'], ['utm_medium', 'utm_medium'], ['utm_campaign', 'utm_campaign']
];

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const data = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (!data.name || !data.phone) return out_('ignored');

    const sheet = sheet_();
    sheet.appendRow(COLUMNS.map(([k]) => clean_(data[k])).concat(['신규']));

    const waNumber = String(data.phone).replace(/\D/g, '');
    const summary =
      `[새 상담요청] ${data.ref || ''}\n` +
      `이름: ${data.name}\n국가: ${data.country}\nWhatsApp: ${data.phone}\n` +
      `관심 시술: ${data.procedures}\n방문 예정: ${data.month || '-'} / 체류: ${data.stay || '-'}\n` +
      `메시지: ${data.message || '-'}\n\n바로 답장: https://wa.me/${waNumber}`;

    NOTIFY_EMAILS.forEach(to => MailApp.sendEmail(to, `[상담요청] ${data.country} · ${data.name} · ${data.ref || ''}`, summary));
    if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
      UrlFetchApp.fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'post', contentType: 'application/json', muteHttpExceptions: true,
        payload: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: summary })
      });
    }
    if (SLACK_WEBHOOK_URL) {
      UrlFetchApp.fetch(SLACK_WEBHOOK_URL, { method: 'post', contentType: 'application/json', muteHttpExceptions: true, payload: JSON.stringify({ text: summary }) });
    }
    return out_('ok');
  } finally {
    lock.releaseLock();
  }
}

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(COLUMNS.map(([, label]) => label).concat(['처리상태']));
    sh.setFrozenRows(1);
  }
  return sh;
}

// 시트 수식 주입 방지: = + - @ 로 시작하는 값 앞에 ' 를 붙임
function clean_(v) {
  const s = v == null ? '' : String(v).slice(0, 2000);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function out_(msg) {
  return ContentService.createTextOutput(msg).setMimeType(ContentService.MimeType.TEXT);
}
