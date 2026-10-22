// 사이트 전체 설정. 모든 시안(A·B·C)과 /ar/ 페이지가 이 파일 하나를 공유합니다.
// 번호·ID가 정해지면 여기만 바꾸면 되고, HTML은 건드리지 않아도 됩니다.
window.IRO_CONFIG = {
  // true인 동안 모든 페이지에 "(콘텐츠 초안)" 표시가 붙습니다. 원어민 검수·의료광고 심의가 끝나면 false.
  DRAFT: true,

  // 분석 도구. 비워두면 불러오지 않습니다.
  GA4_ID: '',        // 예) 'G-XXXXXXXXXX'  (Google Analytics 4)
  CLARITY_ID: '',    // 예) 'abcd1234ef'    (Microsoft Clarity: 히트맵·세션 녹화, 무료)

  // 상담폼 저장 주소 (Google Apps Script 웹앱 URL). 설정 방법: docs/상담폼-연동-가이드.md
  // 비워두면 폼 내용은 저장되지 않고 WhatsApp 메시지로만 전달됩니다.
  FORM_ENDPOINT: '',

  // ---- WhatsApp 라우팅 ----
  // 병원이 늘어나면 CLINICS에 한 줄씩 추가하고, 페이지의 data-clinic 값 또는 ROUTES로 연결합니다.
  // wa: 국가번호 포함 숫자만 (예: '821012345678'). 비워두면 버튼은 상담 페이지로 이동합니다.
  DEFAULT_CLINIC: 'iro',
  CLINICS: {
    iro: {
      code: 'IRO',
      name: 'عيادة إيرو للجراحة التجميلية',
      wa: '',
      hours: 'KST 10:00–19:00'
    }
    // 예) 다음 병원:
    // abc: { code: 'ABC', name: 'عيادة ...', wa: '8210........', hours: '...' }
  },

  // 시술 → 병원 연결. 특정 시술 문의를 다른 병원(또는 담당자 번호)으로 보내고 싶을 때만 지정.
  // 예) ROUTES: { breast: 'abc' }
  ROUTES: {},

  // 시술 코드표. WhatsApp 첫 메시지와 분석 이벤트에 같은 코드가 들어가 어느 페이지에서 온 문의인지 구분됩니다.
  PROCEDURES: {
    lifting:  { code: 'LIFT', ar: 'شدّ الوجه' },
    fat:      { code: 'FAT',  ar: 'إعادة توزيع الدهون وحقن الدهون' },
    face:     { code: 'FACE', ar: 'تجديد ملامح العين والجبهة' },
    body:     { code: 'BODY', ar: 'شفط الدهون ونحت الجسم' },
    breast:   { code: 'BRST', ar: 'تجميل الثدي' },
    skin:     { code: 'SKIN', ar: 'العلاجات غير الجراحية' },
    general:  { code: 'GEN',  ar: 'استفسار عام' }
  },

  // 이전 버전 호환 (A·B 초기 시안이 쓰던 값). 새 코드는 CLINICS를 사용합니다.
  WA_LINK: ''
};
