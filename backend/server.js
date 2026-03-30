require('dotenv').config();
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const { MercadoPagoConfig, Payment } = require('mercadopago');

const app = express();
app.use(express.json());
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST'],
}));

/* ==========================================
   MERCADO PAGO - CLIENT
   ========================================== */
const mpClient = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN,
});
const paymentAPI = new Payment(mpClient);

/* ==========================================
   NODEMAILER - TRANSPORTER
   ========================================== */
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/* ==========================================
   HELPER: ENVIAR KIT POR E-MAIL
   ========================================== */
async function enviarKit({ email, name, paymentId }) {
  const links = {
    guia: process.env.LINK_GUIA,
    checklist: process.env.LINK_CHECKLIST,
    planilha: process.env.LINK_PLANILHA,
    cronograma: process.env.LINK_BONUS_CRONOGRAMA,
    perguntas: process.env.LINK_BONUS_PERGUNTAS,
  };

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
    <body style="margin:0;padding:0;background:#f9f9f9;font-family:'Segoe UI',Arial,sans-serif;">
      <div style="max-width:580px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.08);">

        <!-- Header -->
        <div style="background:linear-gradient(135deg,#E91E8C,#C4177A);padding:32px 28px;text-align:center;">
          <h1 style="color:#fff;margin:0;font-size:22px;font-weight:800;">Festa dos 15 Sem Stress</h1>
          <p style="color:rgba(255,255,255,.85);margin:8px 0 0;font-size:14px;">Seu kit chegou! 🎉</p>
        </div>

        <!-- Body -->
        <div style="padding:32px 28px;">
          <p style="color:#1F2937;font-size:15px;margin:0 0 16px;">Olá, <strong>${name}</strong>!</p>
          <p style="color:#4B5563;font-size:14px;line-height:1.6;margin:0 0 24px;">
            Seu pagamento foi confirmado e seu kit está pronto para download. Clique em cada botão abaixo para baixar seus arquivos:
          </p>

          <!-- Links de download -->
          <div style="background:#FFF0F7;border-radius:8px;padding:20px;margin-bottom:24px;">
            <p style="color:#E91E8C;font-weight:700;font-size:13px;text-transform:uppercase;letter-spacing:1px;margin:0 0 16px;">📦 Seus arquivos:</p>
            ${links.guia ? `<a href="${links.guia}" style="display:block;background:#E91E8C;color:#fff;text-align:center;padding:11px;border-radius:8px;font-size:13px;font-weight:700;text-decoration:none;margin-bottom:10px;">📖 Guia Completo — 12 Capítulos (PDF)</a>` : ''}
            ${links.checklist ? `<a href="${links.checklist}" style="display:block;background:#E91E8C;color:#fff;text-align:center;padding:11px;border-radius:8px;font-size:13px;font-weight:700;text-decoration:none;margin-bottom:10px;">✅ Checklist por Fases — 12 Meses (PDF)</a>` : ''}
            ${links.planilha ? `<a href="${links.planilha}" style="display:block;background:#E91E8C;color:#fff;text-align:center;padding:11px;border-radius:8px;font-size:13px;font-weight:700;text-decoration:none;margin-bottom:10px;">📊 Planilha de Orçamento — 3 Abas (Excel)</a>` : ''}
          </div>

          <div style="background:#FFFFF0;border:2px dashed #C9A94E;border-radius:8px;padding:20px;margin-bottom:24px;">
            <p style="color:#C9A94E;font-weight:700;font-size:13px;text-transform:uppercase;letter-spacing:1px;margin:0 0 16px;">🎁 Seus bônus exclusivos:</p>
            ${links.cronograma ? `<a href="${links.cronograma}" style="display:block;background:#C9A94E;color:#fff;text-align:center;padding:11px;border-radius:8px;font-size:13px;font-weight:700;text-decoration:none;margin-bottom:10px;">📅 Bônus: Cronograma do Dia da Festa (PDF)</a>` : ''}
            ${links.perguntas ? `<a href="${links.perguntas}" style="display:block;background:#C9A94E;color:#fff;text-align:center;padding:11px;border-radius:8px;font-size:13px;font-weight:700;text-decoration:none;">💬 Bônus: Perguntas para Fornecedores (PDF)</a>` : ''}
          </div>

          <!-- Garantia -->
          <div style="background:#F0FFF4;border-left:4px solid #16A34A;border-radius:0 8px 8px 0;padding:14px 16px;margin-bottom:24px;">
            <p style="color:#15803D;font-weight:700;font-size:13px;margin:0 0 4px;">🛡️ Garantia de 7 dias</p>
            <p style="color:#4B5563;font-size:13px;margin:0;line-height:1.5;">Se não gostar, basta entrar em contato em até 7 dias para reembolso total, sem perguntas.</p>
          </div>

          <!-- Dica -->
          <p style="color:#6B7280;font-size:13px;line-height:1.6;margin:0 0 8px;">
            💡 <strong>Dica:</strong> Comece pelo Guia para ter uma visão geral, depois use o Checklist para organizar as tarefas mês a mês, e a Planilha para controlar o orçamento.
          </p>
          <p style="color:#6B7280;font-size:13px;margin:0;">
            Dúvidas? Responda este e-mail ou entre em contato: <a href="mailto:${process.env.ADMIN_EMAIL}" style="color:#E91E8C;">${process.env.ADMIN_EMAIL}</a>
          </p>
        </div>

        <!-- Footer -->
        <div style="background:#F9FAFB;padding:16px 28px;text-align:center;border-top:1px solid #eee;">
          <p style="color:#9CA3AF;font-size:11px;margin:0;">Festa dos 15 Sem Stress • Pedido #${paymentId}</p>
        </div>
      </div>
    </body>
    </html>
  `;

  // E-mail para a compradora
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: '🎉 Seu Kit Festa dos 15 chegou! Acesse seus arquivos aqui',
    html,
  });

  // Notificação de venda para o admin
  if (process.env.ADMIN_EMAIL) {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: process.env.ADMIN_EMAIL,
      subject: `💰 Nova venda! ${name} (${email}) — Pedido #${paymentId}`,
      html: `<p><strong>Nova venda confirmada!</strong></p>
             <ul>
               <li>Nome: ${name}</li>
               <li>E-mail: ${email}</li>
               <li>Pedido: ${paymentId}</li>
               <li>Valor: R$ 9,90</li>
             </ul>`,
    });
  }
}

/* ==========================================
   ROTA: POST /api/pagamento
   Recebe token do cartão gerado pelo SDK do MP
   no frontend e processa o pagamento
   ========================================== */
app.post('/api/pagamento', async (req, res) => {
  const { token, email, name, cpf, amount, description, installments } = req.body;

  // Validação básica
  if (!token || !email || !name || !cpf) {
    return res.status(400).json({ status: 'error', message: 'Dados incompletos.' });
  }

  try {
    const paymentData = {
      transaction_amount: parseFloat(amount || 9.9),
      token: token,
      description: description || 'Kit Festa dos 15 Sem Stress',
      installments: parseInt(installments || 1),
      payment_method_id: 'visa', // será sobrescrito pelo token
      payer: {
        email: email,
        identification: {
          type: 'CPF',
          number: cpf.replace(/\D/g, ''),
        },
        first_name: name.split(' ')[0],
        last_name: name.split(' ').slice(1).join(' ') || name.split(' ')[0],
      },
    };

    const payment = await paymentAPI.create({ body: paymentData });

    if (payment.status === 'approved') {
      // Tentar enviar o kit por e-mail (não bloquear a resposta se falhar)
      enviarKit({ email, name, paymentId: payment.id }).catch(err => {
        console.error('Erro ao enviar e-mail:', err.message);
      });

      return res.json({
        status: 'approved',
        paymentId: payment.id,
        message: 'Pagamento aprovado! Verifique seu e-mail.',
      });
    }

    if (payment.status === 'in_process' || payment.status === 'pending') {
      return res.json({
        status: 'pending',
        paymentId: payment.id,
        message: 'Pagamento em análise. Você receberá um e-mail com a confirmação.',
      });
    }

    // Pagamento rejeitado
    const rejectReasons = {
      cc_rejected_bad_filled_card_number: 'Número do cartão inválido.',
      cc_rejected_bad_filled_date: 'Data de validade inválida.',
      cc_rejected_bad_filled_other: 'Dado do cartão inválido.',
      cc_rejected_bad_filled_security_code: 'CVV inválido.',
      cc_rejected_blacklist: 'Cartão recusado. Tente outro cartão.',
      cc_rejected_call_for_authorize: 'Cartão requer autorização do banco.',
      cc_rejected_card_disabled: 'Cartão desativado. Contate seu banco.',
      cc_rejected_duplicated_payment: 'Pagamento duplicado.',
      cc_rejected_high_risk: 'Pagamento recusado por segurança. Tente outro cartão.',
      cc_rejected_insufficient_amount: 'Saldo insuficiente.',
      cc_rejected_invalid_installments: 'Parcelamento inválido.',
      cc_rejected_max_attempts: 'Muitas tentativas. Tente mais tarde.',
    };
    const reason = rejectReasons[payment.status_detail] || 'Pagamento não aprovado. Tente outro cartão.';

    return res.status(402).json({ status: 'rejected', message: reason });

  } catch (err) {
    console.error('Erro MP:', err);
    return res.status(500).json({
      status: 'error',
      message: 'Erro interno ao processar o pagamento. Tente novamente.',
    });
  }
});

/* ==========================================
   ROTA: POST /api/webhook
   Recebe notificações de pagamento do MP
   (para aprovações assíncronas como PIX/boleto)
   ========================================== */
app.post('/api/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const body = req.body;

  try {
    const notification = typeof body === 'string' ? JSON.parse(body) : body;

    if (notification.type === 'payment' && notification.data?.id) {
      const payment = await paymentAPI.get({ id: notification.data.id });

      if (payment.status === 'approved') {
        const email = payment.payer?.email;
        const name = [payment.payer?.first_name, payment.payer?.last_name].filter(Boolean).join(' ') || 'Cliente';

        if (email) {
          await enviarKit({ email, name, paymentId: payment.id });
        }
      }
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('Webhook error:', err.message);
    res.sendStatus(200); // sempre 200 para o MP não retentar
  }
});

/* ==========================================
   ROTA: GET /health
   Verificar se o servidor está rodando
   ========================================== */
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/* ==========================================
   START SERVER
   ========================================== */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 Servidor rodando na porta ${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/health`);
  console.log(`   Pagamento:    POST http://localhost:${PORT}/api/pagamento`);
  console.log(`   Webhook MP:   POST http://localhost:${PORT}/api/webhook\n`);
});
