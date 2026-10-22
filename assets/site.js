/* 공통 스크립트: WhatsApp 라우팅 · 분석 · 상담폼 · (콘텐츠 초안) 표시.
   설정값은 모두 assets/config.js 에서 읽습니다. */
(function () {
  const CFG = window.IRO_CONFIG || {};
  const body = document.body;
  const store = (() => { try { return window.sessionStorage; } catch (e) { return null; } })();

  /* ---------- analytics ---------- */
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  if (CFG.GA4_ID) {
    const s = document.createElement('script');
    s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(CFG.GA4_ID);
    document.head.appendChild(s);
    gtag('js', new Date()); gtag('config', CFG.GA4_ID);
  }
  if (CFG.CLARITY_ID) {
    (function (c, l, a, r, i) {
      c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
      const t = l.createElement(r); t.async = 1; t.src = 'https://www.clarity.ms/tag/' + i;
      l.head.appendChild(t);
    })(window, document, 'clarity', 'script', CFG.CLARITY_ID);
  }
  function track(name, params) {
    if (CFG.GA4_ID) gtag('event', name, params || {});
    if (CFG.CLARITY_ID && window.clarity) window.clarity('event', name);
  }

  /* ---------- campaign source (utm_*) kept for the session ---------- */
  const qs = new URLSearchParams(location.search);
  ['utm_source', 'utm_medium', 'utm_campaign'].forEach(k => {
    if (qs.get(k) && store) try { store.setItem(k, qs.get(k)); } catch (e) {}
  });
  const utm = k => { try { return (store && store.getItem(k)) || ''; } catch (e) { return ''; } };

  /* ---------- WhatsApp routing ---------- */
  const PROCS = CFG.PROCEDURES || {};
  const clinicFor = proc => {
    const id = (CFG.ROUTES || {})[proc] || body.dataset.clinic || CFG.DEFAULT_CLINIC;
    return Object.assign({ id }, (CFG.CLINICS || {})[id] || {});
  };
  const refCode = (clinic, proc) => [clinic.code || 'WEB', (PROCS[proc] || PROCS.general || {}).code || 'GEN', 'AR'].join('-');
  const legacyNumber = () => (CFG.WA_LINK || '').replace(/^https:\/\/wa\.me\//, '').replace(/\D/g, '');

  function waUrl(proc, text) {
    const clinic = clinicFor(proc);
    const num = (clinic.wa || legacyNumber() || '').replace(/\D/g, '');
    if (!num) return null;
    const p = PROCS[proc] || PROCS.general || { ar: '' };
    const msg = text || `مرحبًا، أودّ الاستفسار عن: ${p.ar}\nرمز الطلب: ${refCode(clinic, proc)}`;
    return 'https://wa.me/' + num + '?text=' + encodeURIComponent(msg);
  }
  const consultHref = body.dataset.consult || '#consult';

  document.querySelectorAll('[data-wa]').forEach(a => {
    const proc = a.dataset.wa || body.dataset.procedure || 'general';
    const url = waUrl(proc);
    a.href = url || consultHref;
    if (url) { a.target = '_blank'; a.rel = 'noopener'; } else { a.removeAttribute('target'); }
    a.addEventListener('click', () => track('whatsapp_click', {
      procedure: proc, clinic: clinicFor(proc).id, placement: a.dataset.place || 'inline', configured: !!url
    }));
  });

  /* ---------- consultation form ---------- */
  const T = {
    needName: 'يرجى كتابة الاسم.',
    needPhone: 'يرجى كتابة رقم واتساب مع رمز الدولة.',
    needConsent: 'يرجى الموافقة على جمع البيانات واستخدامها للرد على استفساركم.',
    sentWa: 'تم استلام طلبكم. لإكمال المحادثة مع فريق العيادة الآن، اضغطوا الزر أدناه.',
    sentOnly: 'تم استلام طلبكم. سيتواصل معكم فريق العيادة عبر واتساب على الرقم الذي أدخلتموه.',
    waOnly: 'اضغطوا الزر أدناه لإرسال طلبكم إلى فريق العيادة عبر واتساب.',
    demo: 'هذه نسخة تجريبية: لم يُضبط رقم واتساب العيادة ولا حفظ النموذج بعد.'
  };

  function bindForm(form) {
    const out = form.querySelector('[data-form-msg]');
    const done = form.parentElement.querySelector('[data-consult-done]');
    const say = (m, bad) => { if (out) { out.textContent = m; out.classList.toggle('bad', !!bad); } };
    let started = false;
    form.addEventListener('focusin', () => { if (!started) { started = true; track('form_start', { form: form.id || 'consult' }); } });

    const country = form.elements.country, phone = form.elements.phone;
    if (country && phone) country.addEventListener('change', () => {
      const dial = country.selectedOptions[0] && country.selectedOptions[0].dataset.dial;
      if (dial && (!phone.value || /^\+\d{0,4}$/.test(phone.value))) phone.value = dial;
    });

    form.addEventListener('submit', e => {
      e.preventDefault();
      const f = form.elements;
      if (f.website && f.website.value) return; // honeypot
      const name = (f.name && f.name.value.trim()) || '';
      const tel = (f.phone && f.phone.value.trim()) || '';
      if (!name) { say(T.needName, true); f.name.focus(); return; }
      if (f.phone && tel.replace(/\D/g, '').length < 8) { say(T.needPhone, true); f.phone.focus(); return; }
      if (f.consent && !f.consent.checked) { say(T.needConsent, true); f.consent.focus(); return; }

      const procKeys = [...form.querySelectorAll('input[name=proc]:checked')].map(i => i.value);
      const primary = procKeys[0] || body.dataset.procedure || 'general';
      const clinic = clinicFor(primary);
      const label = k => (PROCS[k] || {}).ar || k;
      const val = n => (f[n] && f[n].value ? f[n].value.trim() : '');
      const data = {
        submitted_at: new Date().toISOString(),
        clinic: clinic.id, ref: refCode(clinic, primary),
        name, phone: tel, country: val('country'),
        procedures: procKeys.map(label).join(' / ') || label('general'),
        month: val('month'), stay: val('stay'), language: val('language'), message: val('msg'),
        page: location.pathname, utm_source: utm('utm_source'), utm_medium: utm('utm_medium'), utm_campaign: utm('utm_campaign')
      };

      if (CFG.FORM_ENDPOINT) {
        // Apps Script는 CORS 응답을 주지 않으므로 no-cors + text/plain 으로 보냅니다(저장은 정상 처리됨).
        fetch(CFG.FORM_ENDPOINT, { method: 'POST', mode: 'no-cors', keepalive: true, headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(data) }).catch(() => {});
      }
      track('generate_lead', { procedure: primary, clinic: clinic.id, country: data.country, stored: !!CFG.FORM_ENDPOINT });

      const text = `مرحبًا، أرسلت طلب استشارة من الموقع.\nالاسم: ${name}\nالبلد: ${data.country}\nالإجراء: ${data.procedures}` +
        (data.month ? `\nموعد الزيارة المتوقع: ${data.month}` : '') + (data.stay ? `\nمدة الإقامة: ${data.stay}` : '') +
        (data.message ? `\n${data.message}` : '') + `\nرمز الطلب: ${data.ref}`;
      const url = waUrl(primary, text);
      const msg = CFG.FORM_ENDPOINT ? (url ? T.sentWa : T.sentOnly) : (url ? T.waOnly : T.demo);

      if (done) {
        done.hidden = false;
        done.querySelector('[data-done-text]').textContent = msg;
        const btn = done.querySelector('[data-done-wa]');
        if (btn) { btn.hidden = !url; if (url) btn.href = url; btn.onclick = () => track('whatsapp_click', { procedure: primary, clinic: clinic.id, placement: 'form_done', configured: true }); }
        form.hidden = true;
        done.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        say(msg, !url && !CFG.FORM_ENDPOINT);
        if (url) window.open(url, '_blank', 'noopener');
      }
    });
  }
  document.querySelectorAll('form[data-consult]').forEach(bindForm);

  /* ---------- (콘텐츠 초안) badge ---------- */
  if (CFG.DRAFT) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'draft-flag';
    b.innerHTML = '<span lang="ko">(콘텐츠 초안)</span><span>مسودة محتوى</span>';
    b.title = '원장 확인이 필요한 수치·문장을 표시합니다 (다시 누르면 숨김)';
    b.addEventListener('click', () => document.documentElement.classList.toggle('show-verify'));
    const css = document.createElement('style');
    css.textContent = '.draft-flag{position:fixed;z-index:9999;top:calc(140px + env(safe-area-inset-top,0px));left:10px;display:grid;gap:0;padding:6px 12px;border:1px dashed #B3261E;border-radius:10px;background:rgba(255,248,240,.94);color:#B3261E;font:600 11px/1.5 system-ui,sans-serif;text-align:center;cursor:pointer;box-shadow:0 6px 16px -8px rgba(0,0,0,.35)}' +
      '.show-verify [data-verify]{outline:2px dashed #B3261E;outline-offset:3px;background:rgba(179,38,30,.06)}';
    document.head.appendChild(css);
    body.appendChild(b);
  }

  window.IRO = { waUrl, track, clinicFor };
})();
