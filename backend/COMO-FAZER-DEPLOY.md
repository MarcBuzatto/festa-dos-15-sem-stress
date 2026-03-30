# Como fazer o Deploy do Backend

## Opção recomendada: Vercel (grátis, 5 minutos)

### 1. Preparar os arquivos do kit para download

Antes de tudo, você precisa colocar seus arquivos em algum lugar na nuvem:

1. Acesse o Google Drive (drive.google.com)
2. Faça upload de cada arquivo (Guia PDF, Checklist PDF, Planilha Excel, Bônus 1, Bônus 2)
3. Para cada arquivo:
   - Clique com o botão direito > **Compartilhar**
   - Mude para **"Qualquer pessoa com o link"**
   - Clique em **Copiar link**
   - O link terá esse formato: `https://drive.google.com/file/d/ID_DO_ARQUIVO/view`
   - Transforme para link de download direto: `https://drive.google.com/uc?export=download&id=ID_DO_ARQUIVO`

---

### 2. Instalar o Node.js (se não tiver)

Baixe em: https://nodejs.org/pt-br (versão LTS)

---

### 3. Instalar o Vercel CLI

Abra o terminal (CMD ou PowerShell) e rode:

```bash
npm install -g vercel
```

---

### 4. Configurar o arquivo .env

Na pasta `backend/`, copie o arquivo `.env.example` para `.env`:

```bash
cp .env.example .env
```

Preencha todas as variáveis no `.env`:
- `MP_ACCESS_TOKEN` → Suas credenciais em mercadopago.com.br/settings/account/credentials
- `MP_PUBLIC_KEY` → Mesma página
- `SMTP_USER` / `SMTP_PASS` → Sua conta Gmail com "Senha de app" ativada
- `LINK_GUIA`, `LINK_CHECKLIST`, etc → Links do Google Drive (passo 1)
- `ADMIN_EMAIL` → Seu e-mail para receber notificação de cada venda

---

### 5. Fazer o deploy na Vercel

Na pasta `backend/`, rode:

```bash
cd backend
npm install
vercel
```

Siga as perguntas:
- Set up and deploy? **Y**
- Which scope? Escolha sua conta
- Link to existing project? **N**
- Project name? **festa-15-backend** (ou qualquer nome)
- In which directory? **.** (ponto = pasta atual)

Após o deploy, a Vercel vai te dar uma URL assim:
`https://festa-15-backend.vercel.app`

---

### 6. Adicionar as variáveis de ambiente na Vercel

Na Vercel, as variáveis do `.env` precisam ser adicionadas pelo painel:

1. Acesse vercel.com > seu projeto
2. **Settings** > **Environment Variables**
3. Adicione cada variável do seu `.env` uma por uma

Ou use o comando:
```bash
vercel env add MP_ACCESS_TOKEN
vercel env add SMTP_USER
# ... (repita para cada variável)
```

Depois rode `vercel --prod` para republicar com as variáveis.

---

### 7. Atualizar o index.html com a URL do backend

Abra o `index.html` e troque em `CONFIG`:

```js
BACKEND_URL: 'https://festa-15-backend.vercel.app',
```

---

### 8. Configurar o Webhook do Mercado Pago (para Pix/Boleto)

No painel do Mercado Pago:
1. Acesse **Seu negócio > Configurações > Notificações**
2. URL de notificação: `https://festa-15-backend.vercel.app/api/webhook`
3. Eventos: marque **Pagamentos**

Isso garante que clientes que pagam via Pix também recebem o kit automaticamente.

---

### 9. Configurar o Pixel do Facebook no index.html

Troque no `CONFIG` do `index.html`:

```js
PIXEL_ID: 'SEU_PIXEL_ID_AQUI',      // número do seu pixel
MP_PUBLIC_KEY: 'APP_USR-...',        // sua Public Key do MP
```

---

## Estrutura final de arquivos

```
privado/
├── index.html          ← Landing page (frontend)
├── backend/
│   ├── server.js       ← Servidor Node.js/Express
│   ├── package.json    ← Dependências
│   ├── vercel.json     ← Config do deploy
│   ├── .env            ← Suas credenciais (NÃO subir pro GitHub!)
│   └── .env.example    ← Modelo das variáveis
```

---

## Fluxo completo após o deploy

```
1. Cliente clica "Comprar" na landing page
2. SDK do Mercado Pago tokeniza o cartão (seguro, PCI compliant)
3. Token é enviado ao backend (HTTPS)
4. Backend cobra R$ 9,90 via API do MP
5. MP aprova o pagamento
6. Backend envia e-mail com links de download para o cliente
7. Backend envia notificação de venda para você
8. Pixel registra evento "Purchase" para o Facebook Ads otimizar
```

---

## Suporte

Dúvidas sobre a API do Mercado Pago:
https://www.mercadopago.com.br/developers/pt/docs
