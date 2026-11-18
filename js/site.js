// Dados dos pacotes e utilitários partilhados pela landing e pelo checkout.
// ATENÇÃO: estes valores são só para mostrar. O preço cobrado é sempre calculado no servidor (fluxo "Marksuite · Checkout").
window.PLANOS = {
  implementacao: {
    nome: 'Implementação', valor: 1500000, tipo: 'Pagamento único',
    inclui: [
      'Configuração dos módulos contratados',
      'Criação de utilizadores e permissões',
      'Importação inicial dos dados acordados',
      'Formação da equipa',
      'Acompanhamento no arranque',
    ],
  },
  mensalidade: {
    nome: 'Mensalidade', valor: 150000, tipo: 'Por mês',
    inclui: [
      'Acesso à plataforma',
      'Alojamento',
      'Actualizações',
      'Suporte técnico corrente',
    ],
  },
  ano: {
    nome: 'Pacote do 1.º ano', valor: 3300000, tipo: 'Implementação + 12 mensalidades',
    inclui: [
      'Implementação completa (1.500.000 Kz)',
      '12 mensalidades (12 × 150.000 Kz)',
      'Módulos, utilizadores, permissões e importação inicial',
      'Formação e acompanhamento no arranque',
      'Alojamento, actualizações e suporte técnico durante 12 meses',
    ],
  },
};

window.kz = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' Kz';

// Botões de WhatsApp: só aparecem se o número estiver configurado
document.addEventListener('DOMContentLoaded', () => {
  const w = String((window.MARKSUITE || {}).WHATSAPP || '').replace(/\D/g, '');
  if (!w) document.querySelectorAll('[data-sem-whatsapp]').forEach(el => { el.hidden = false; });
  document.querySelectorAll('[data-whatsapp]').forEach(a => {
    if (!w) { a.hidden = true; return; }
    const msg = a.getAttribute('data-whatsapp') || 'Olá! Quero saber mais sobre o Marksuite.';
    a.href = 'https://wa.me/' + w + '?text=' + encodeURIComponent(msg);
    a.target = '_blank'; a.rel = 'noopener';
  });
});
