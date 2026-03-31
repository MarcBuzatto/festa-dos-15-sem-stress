require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { MercadoPagoConfig, Payment } = require('mercadopago');

const app = express();
app.use(express.json());
const CORS_ORIGIN = (process.env.FRONTEND_URL || '*').trim();
app.use(cors({ origin: CORS_ORIGIN, methods: ['GET', 'POST'] }));

/* ==========================================
   MERCADO PAGO
   ========================================== */
let mpClient, paymentAPI;
try {
  if (process.env.MP_ACCESS_TOKEN) {
    mpClient = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
    paymentAPI = new Payment(mpClient);
    console.log('✅ Mercado Pago configurado');
  } else {
    console.warn('⚠️ MP_ACCESS_TOKEN não definido');
  }
} catch (err) {
  console.error('❌ Erro ao inicializar Mercado Pago:', err.message);
}

/* ==========================================
   NODEMAILER
   ========================================== */
let transporter;
try {
  if (process.env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '465'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    console.log('✅ Nodemailer configurado');
  } else {
    console.warn('⚠️ SMTP não configurado — e-mails desativados');
  }
} catch (err) {
  console.error('❌ Erro ao inicializar Nodemailer:', err.message);
}

/* ==========================================
   PRODUTOS — coloque os arquivos em /produtos
   ========================================== */
const PRODUTOS = [
  { id: 'guia',       file: 'guia_festa_debutante.pdf',            nome: 'Guia Completo — 12 Capítulos' },
  { id: 'checklist',  file: 'checklist_debutante.pdf',             nome: 'Checklist por Fases — 12 Meses' },
  { id: 'planilha',   file: 'planilha_orcamento_debutante.xlsx',   nome: 'Planilha de Orçamento' },
  { id: 'cronograma', file: 'bonus1_cronograma_dia.pdf',           nome: 'Bônus: Cronograma do Dia da Festa' },
  { id: 'perguntas',  file: 'bonus2_perguntas_fornecedores.pdf',   nome: 'Bônus: Perguntas para Fornecedores' },
];
const PRODUTOS_DIR = path.join(__dirname, 'produtos');

/* ==========================================
   HELPER — gerar download token (JWT 7 dias)
   ========================================== */
function gerarDownloadToken({ paymentId, email, name }) {
  return jwt.sign(
    { paymentId, email, name },
    process.env.JWT_SECRET || 'dev-secret-troque-em-producao',
    { expiresIn: '7d' }
  );
}

function verificarToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET || 'dev-secret-troque-em-producao');
}

/* ==========================================
   HELPER — enviar kit por e-mail
   ========================================== */
async function enviarKit({ email, name, paymentId, downloadToken }) {
  if (!transporter) { console.warn('⚠️ E-mail não enviado: SMTP não configurado'); return; }
  const downloadUrl = `${process.env.FRONTEND_URL || 'https://festa-dos-15-sem-stress.vercel.app'}/downloads.html?token=${encodeURIComponent(downloadToken)}`;

  const html = `
    <!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"></head>
    <body style="margin:0;padding:0;background:#f9f9f9;font-family:'Segoe UI',Arial,sans-serif;">
      <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.08);">
        <div style="background:linear-gradient(135deg,#E91E8C,#C4177A);padding:28px;text-align:center;">
          <h1 style="color:#fff;margin:0;font-size:20px;font-weight:800;">Festa dos 15 Sem Stress</h1>
          <p style="color:rgba(255,255,255,.85);margin:6px 0 0;font-size:13px;">Seu kit chegou! 🎉</p>
        </div>
        <div style="padding:28px;">
          <p style="color:#1F2937;font-size:15px;margin:0 0 14px;">Olá, <strong>${name}</strong>!</p>
          <p style="color:#6B7280;font-size:14px;line-height:1.6;margin:0 0 22px;">
            Seu pagamento foi confirmado. Clique no botão abaixo para acessar seus downloads:
          </p>
          <div style="text-align:center;margin:24px 0;">
            <a href="${downloadUrl}" style="display:inline-block;background:#E91E8C;color:#fff;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:700;text-decoration:none;">
              📦 Acessar meus downloads
            </a>
          </div>
          <p style="font-size:12px;color:#9CA3AF;margin:0 0 6px;">O link é válido por 7 dias. Faça o download e guarde os arquivos no seu dispositivo.</p>
          <div style="background:#F0FFF4;border-left:4px solid #16A34A;border-radius:0 8px 8px 0;padding:12px 14px;margin-top:18px;">
            <p style="color:#15803D;font-weight:700;font-size:12px;margin:0 0 3px;">🛡️ Garantia de 7 dias</p>
            <p style="color:#6B7280;font-size:12px;margin:0;">Dúvidas? Responda este e-mail: <a href="mailto:${process.env.ADMIN_EMAIL}" style="color:#E91E8C;">${process.env.ADMIN_EMAIL}</a></p>
          </div>
        </div>
        <div style="background:#F9FAFB;padding:14px 28px;text-align:center;border-top:1px solid #eee;">
          <p style="color:#9CA3AF;font-size:11px;margin:0;">Festa dos 15 Sem Stress • Pedido #${paymentId}</p>
        </div>
      </div>
    </body></html>
  `;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: '🎉 Seu Kit Festa dos 15 chegou! Acesse seus downloads',
    html,
  });

  if (process.env.ADMIN_EMAIL) {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: process.env.ADMIN_EMAIL,
      subject: `💰 Nova venda! ${name} (${email}) — Pedido #${paymentId}`,
      html: `<p><strong>Nova venda confirmada!</strong><br>Nome: ${name}<br>E-mail: ${email}<br>Pedido: ${paymentId}<br>Valor: R$ 9,90</p>`,
    });
  }
}

/* ==========================================
   POST /api/pagamento
   ========================================== */
app.post('/api/pagamento', async (req, res) => {
  const { token, email, name, cpf, amount, description, installments, payment_type } = req.body;

  if (!email || !name || !cpf) {
    return res.status(400).json({ status: 'error', message: 'Dados incompletos.' });
  }

  if (!paymentAPI) {
    return res.status(503).json({ status: 'error', message: 'Serviço de pagamento não configurado.' });
  }

  try {
    const paymentBody = {
      transaction_amount: parseFloat(amount || 9.9),
      description: description || 'Kit Festa dos 15 Sem Stress',
      payer: {
        email,
        identification: { type: 'CPF', number: cpf.replace(/\D/g, '') },
        first_name: name.split(' ')[0],
        last_name: name.split(' ').slice(1).join(' ') || name.split(' ')[0],
      },
    };

    if (payment_type === 'pix') {
      paymentBody.payment_method_id = 'pix';
    } else if (payment_type === 'boleto') {
      paymentBody.payment_method_id = 'bolbradesco';
    } else {
      // Cartão de crédito
      paymentBody.token = token;
      paymentBody.installments = parseInt(installments || 1);
    }

    const payment = await paymentAPI.create({ body: paymentBody });

    if (payment.status === 'approved' || payment.status === 'in_process' || payment.status === 'pending') {
      const downloadToken = gerarDownloadToken({ paymentId: payment.id, email, name });

      // Envia e-mail em background (não bloqueia resposta)
      enviarKit({ email, name, paymentId: payment.id, downloadToken }).catch(err =>
        console.error('Erro ao enviar e-mail:', err.message)
      );

      return res.json({
        status: payment.status === 'approved' ? 'approved' : 'pending',
        paymentId: payment.id,
        downloadToken,
        message: payment.status === 'approved'
          ? 'Pagamento aprovado!'
          : 'Pagamento em análise. Você receberá um e-mail em breve.',
      });
    }

    // Rejeitado
    const rejectReasons = {
      cc_rejected_insufficient_amount: 'Saldo insuficiente.',
      cc_rejected_bad_filled_card_number: 'Número do cartão inválido.',
      cc_rejected_bad_filled_date: 'Data de validade inválida.',
      cc_rejected_bad_filled_security_code: 'CVV inválido.',
      cc_rejected_call_for_authorize: 'Cartão requer autorização do banco.',
      cc_rejected_high_risk: 'Pagamento recusado por segurança. Tente outro cartão.',
      cc_rejected_blacklist: 'Cartão recusado. Tente outro cartão.',
    };

    return res.status(402).json({
      status: 'rejected',
      message: rejectReasons[payment.status_detail] || 'Pagamento não aprovado. Tente outro cartão.',
    });

  } catch (err) {
    console.error('Erro MP:', err);
    return res.status(500).json({ status: 'error', message: 'Erro ao processar pagamento. Tente novamente.' });
  }
});

/* ==========================================
   GET /api/downloads?token=XXX
   Valida o token e retorna a lista de arquivos
   ========================================== */
app.get('/api/downloads', (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: 'Token não informado.' });

  try {
    const payload = verificarToken(token);
    return res.json({
      valid: true,
      name: payload.name,
      email: payload.email,
      produtos: PRODUTOS.map(p => ({ id: p.id, nome: p.nome, file: p.file })),
    });
  } catch (err) {
    return res.status(401).json({ valid: false, error: 'Token inválido ou expirado.' });
  }
});

/* ==========================================
   GET /api/download?token=XXX&file=NOME.pdf
   Valida token e serve o arquivo para download
   ========================================== */
app.get('/api/download', (req, res) => {
  const { token, file } = req.query;
  if (!token || !file) return res.status(400).json({ error: 'Parâmetros inválidos.' });

  try {
    verificarToken(token); // lança erro se inválido
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido ou expirado.' });
  }

  // Valida que o arquivo requisitado está na lista (evita path traversal)
  const produto = PRODUTOS.find(p => p.file === file);
  if (!produto) return res.status(404).json({ error: 'Arquivo não encontrado.' });

  const filePath = path.join(PRODUTOS_DIR, file);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Arquivo ainda não disponível. Entre em contato com o suporte.' });
  }

  res.setHeader('Content-Disposition', `attachment; filename="${file}"`);
  res.setHeader('Content-Type', file.endsWith('.xlsx')
    ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    : 'application/pdf'
  );
  res.sendFile(filePath);
});

/* ==========================================
   POST /api/webhook — notificações do MP
   ========================================== */
app.post('/api/webhook', async (req, res) => {
  try {
    const notification = req.body;
    if (notification.type === 'payment' && notification.data?.id) {
      const payment = await paymentAPI.get({ id: notification.data.id });
      if (payment.status === 'approved') {
        const email = payment.payer?.email;
        const name = [payment.payer?.first_name, payment.payer?.last_name].filter(Boolean).join(' ') || 'Cliente';
        if (email) {
          const downloadToken = gerarDownloadToken({ paymentId: payment.id, email, name });
          await enviarKit({ email, name, paymentId: payment.id, downloadToken });
        }
      }
    }
    res.sendStatus(200);
  } catch (err) {
    console.error('Webhook error:', err.message);
    res.sendStatus(200);
  }
});

/* ==========================================
   GET /health
   ========================================== */
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/* ==========================================
   START
   ========================================== */
/* ==========================================
   START (só em dev local, não no Vercel)
   ========================================== */
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`\n🚀 Servidor rodando na porta ${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/health`);
    console.log(`   Produtos em: ${PRODUTOS_DIR}\n`);
  });
}

module.exports = app;
