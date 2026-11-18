// Lógica do checkout: formulário → fluxo "Marksuite · Checkout" (Autmak) → Multicaixa Express → estado do pagamento.
// O preço mostrado aqui é só visual: o servidor recalcula-o a partir do pacote escolhido.
(() => {
  const C = window.MARKSUITE || {};
  const P = window.PLANOS;
  const $ = s => document.querySelector(s);
  const qs = new URLSearchParams(location.search);
  const DEMO = qs.get('demo') === '1';
  const BASE = String(C.AUTMAK_URL || '').replace(/\/$/, '');
  const ESPERA_MAX_S = 90;       // tempo que o cliente tem para aprovar
  const POLL_MS = 3000;
  let plano = P[qs.get('plano')] ? qs.get('plano') : 'ano';
  let timers = [];
  let enviando = false;

  if (DEMO) $('#demo').hidden = false;

  /* ---------- Pacotes e resumo ---------- */
  const optsEl = $('#planos');
  optsEl.innerHTML = Object.entries(P).map(([k, p]) => `
    <label class="opt"><input type="radio" name="plano" value="${k}" ${k === plano ? 'checked' : ''}>
      <span><b>${p.nome}</b><small>${p.tipo}</small></span><span class="v">${kz(p.valor)}</span></label>`).join('');
  optsEl.addEventListener('change', e => { if (e.target.name === 'plano') { plano = e.target.value; resumo(); } });

  function resumo() {
    const p = P[plano];
    $('#s-nome').textContent = p.nome; $('#s-tipo').textContent = p.tipo;
    $('#s-valor').textContent = kz(p.valor); $('#s-total').textContent = kz(p.valor);
    $('#s-inclui').innerHTML = p.inclui.map(t => `<li><svg class="ic"><use href="#i-check"/></svg><span>${t}</span></li>`).join('');
    $('#pagar').textContent = 'Pagar ' + kz(p.valor) + ' com Multicaixa Express';
  }
  resumo();

  /* ---------- Campos de telefone ---------- */
  const digits = s => String(s || '').replace(/\D/g, '');
  const maskPhone = el => el.addEventListener('input', () => {
    const d = digits(el.value).replace(/^244(?=9\d{8}$)/, '').slice(0, 9);
    el.value = [d.slice(0, 3), d.slice(3, 6), d.slice(6, 9)].filter(Boolean).join(' ');
  });
  maskPhone($('#whatsapp')); maskPhone($('#expressPhone'));
  const mesmo = $('#mesmo');
  const syncMesmo = () => { if (mesmo.checked) { $('#expressPhone').value = $('#whatsapp').value; $('#expressPhone').dispatchEvent(new Event('input')); } };
  mesmo.addEventListener('change', syncMesmo);
  $('#whatsapp').addEventListener('input', syncMesmo);

  /* ---------- Validação ---------- */
  const val = () => ({
    plano,
    nome: $('#nome').value.trim(), empresa: $('#empresa').value.trim(), nif: $('#nif').value.trim(),
    email: $('#email').value.trim(), whatsapp: digits($('#whatsapp').value), expressPhone: digits($('#expressPhone').value),
    aceito: $('#aceito').checked,
  });
  function validar(d) {
    const e = {};
    if (d.nome.length < 3) e.nome = 1;
    if (d.empresa.length < 2) e.empresa = 1;
    if (!/^\S+@\S+\.\S+$/.test(d.email)) e.email = 1;
    if (!/^9\d{8}$/.test(d.whatsapp)) e.whatsapp = 1;
    if (!/^9\d{8}$/.test(d.expressPhone)) e.expressPhone = 1;
    if (!d.aceito) e.termos = 1;
    return e;
  }
  function marcar(erros) {
    document.querySelectorAll('[data-f]').forEach(el => el.classList.toggle('err', !!erros[el.dataset.f]));
    const first = Object.keys(erros)[0];
    const alvo = first === 'termos' ? $('#aceito') : $('#' + first);
    if (alvo) alvo.focus();
  }
  document.querySelectorAll('.f input').forEach(i => i.addEventListener('input', () => i.closest('.f').classList.remove('err')));
  $('#aceito').addEventListener('change', () => $('[data-f=termos]').classList.remove('err'));

  /* ---------- Vistas ---------- */
  const VISTAS = ['form', 'enviando', 'aguardar', 'pago', 'manual', 'falhou'];
  function vista(n) { VISTAS.forEach(v => { $('#v-' + v).hidden = v !== n; }); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  const alerta = t => { const a = $('#alerta'); a.textContent = t || ''; a.classList.toggle('on', !!t); };
  const limpar = () => { timers.forEach(clearTimeout); timers.forEach(clearInterval); timers = []; };
  const falhou = (tit, msg) => { limpar(); enviando = false; $('#x-tit').textContent = tit; $('#x-msg').textContent = msg; vista('falhou'); };

  /* ---------- Chamadas ao servidor ---------- */
  async function chamar(path, opt) {
    let res;
    try { res = await fetch(BASE + path, { ...opt, signal: AbortSignal.timeout(45000) }); }
    catch { throw new Error('Não foi possível contactar o servidor. Verifique a sua ligação e tente de novo.'); }
    const j = await res.json().catch(() => ({}));
    if (res.status === 429) throw new Error(j.error || 'Demasiadas tentativas. Aguarde alguns minutos e tente de novo.');
    if (!res.ok) throw new Error(j.error || j.mensagem || 'Ocorreu um erro. Tente de novo dentro de instantes.');
    return j;
  }
  const enviarPedido = d => DEMO ? demo.enviar(d)
    : chamar('/webhook/marksuite-checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) });
  const estadoPagamento = id => DEMO ? demo.estado(id) : chamar('/webhook/marksuite-checkout-estado?id=' + encodeURIComponent(id));

  /* ---------- Submissão ---------- */
  $('#f').addEventListener('submit', async ev => {
    ev.preventDefault();
    if (enviando) return;
    alerta('');
    const d = val(), erros = validar(d);
    marcar(erros);
    if (Object.keys(erros).length) return;
    enviando = true; vista('enviando');
    try {
      const r = await enviarPedido(d);
      if (!r.ok) {
        enviando = false; vista('form');
        if (r.erros && r.erros.length) { const m = {}; r.erros.forEach(k => { m[k] = 1; }); marcar(m); }
        alerta(r.mensagem || 'Não foi possível concluir o pedido.');
        return;
      }
      if (r.modo === 'manual') { enviando = false; $('#m-msg').textContent = r.mensagem; $('#m-ped').textContent = r.pedidoId; $('#m-valor').textContent = kz(r.valor); return vista('manual'); }
      aguardar(r, d);
    } catch (e) { falhou('Não foi possível enviar o pedido', e.message); }
  });

  /* ---------- Espera pela aprovação no telemóvel ---------- */
  function aguardar(r, d) {
    $('#a-valor').textContent = kz(r.valor); $('#a-ped').textContent = r.pedidoId;
    $('#a-tel').textContent = '+244 ' + d.expressPhone.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3');
    vista('aguardar');
    const t0 = Date.now(), anel = $('#anel'), CIRC = 326.7;
    const tick = setInterval(() => {
      const s = Math.max(0, ESPERA_MAX_S - Math.floor((Date.now() - t0) / 1000));
      $('#seg').textContent = s; anel.style.strokeDashoffset = String(CIRC * (1 - s / ESPERA_MAX_S));
    }, 1000);
    timers.push(tick);
    let ocupado = false;
    const poll = setInterval(async () => {
      if (ocupado) return;
      ocupado = true;
      try {
        const e = await estadoPagamento(r.chargeId);
        if (e.estado === 'paid') {
          limpar(); enviando = false;
          $('#p-nome').textContent = d.nome.split(' ')[0]; $('#p-ped').textContent = r.pedidoId; $('#p-valor').textContent = kz(r.valor);
          vista('pago');
        } else if (['failed', 'cancelled', 'expired'].includes(e.estado)) {
          falhou('O pagamento não foi concluído', e.estado === 'expired' ? 'O tempo para aprovar terminou. Pode tentar de novo.' : (e.mensagem || 'O pagamento foi recusado ou cancelado. Verifique o número e tente de novo.'));
        } else if (Date.now() - t0 > (ESPERA_MAX_S + 30) * 1000) {
          falhou('Ainda sem confirmação', 'Não recebemos a aprovação a tempo. Se já aprovou na app, a nossa equipa vai confirmar o pagamento e contactá-lo por WhatsApp. Caso contrário, tente de novo.');
        }
      } catch { /* falha de rede momentânea: tenta no próximo ciclo */ }
      ocupado = false;
    }, POLL_MS);
    timers.push(poll);
  }
  $('#x-retry').addEventListener('click', () => { limpar(); enviando = false; alerta(''); vista('form'); });

  /* ---------- Modo demonstração (?demo=1): simula o servidor, sem rede ---------- */
  const demo = {
    t0: 0, falha: false,
    async enviar(d) {
      await new Promise(r => setTimeout(r, 1000));
      const erros = Object.keys(validar(d));
      if (erros.length) return { ok: false, erros };
      this.t0 = Date.now(); this.falha = /000$/.test(d.expressPhone);
      return { ok: true, modo: 'multicaixa', pedidoId: 'MS-DEMO01', chargeId: 'DEMO0001', valor: P[d.plano].valor };
    },
    async estado() {
      if (Date.now() - this.t0 < 7000) return { ok: true, estado: 'pending' };
      return { ok: true, estado: this.falha ? 'failed' : 'paid', mensagem: 'Pagamento recusado pelo cliente (simulação).' };
    },
  };
})();
