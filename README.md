# atelier. v2.0

Sistema de gestão para ateliês — vendas, produtos, clientes, despesas e contas a pagar.

---

## 1. Configurar o Supabase

1. Acesse [supabase.com](https://supabase.com) e crie um novo projeto.
2. Vá em **SQL Editor** e execute o conteúdo de `supabase/migrations/001_initial.sql`.
3. O script cria todas as tabelas, políticas RLS e o Storage bucket `products`.
4. Em **Project Settings → API**, copie a **Project URL** e a **anon public key**.

---

## 2. Variáveis de ambiente

Edite o arquivo `.env.local` na raiz do projeto:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```

---

## 3. Rodar localmente

```bash
npm install
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).  
Crie uma conta em `/signup` — o perfil é inserido automaticamente em `profiles`.

---

## 4. Deploy na Vercel

1. Suba o projeto para um repositório GitHub.
2. Acesse [vercel.com](https://vercel.com) → **Add New Project** → importe o repositório.
3. Em **Environment Variables**, adicione:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Clique em **Deploy**.
5. No Supabase, vá em **Authentication → URL Configuration** e adicione a URL da Vercel em **Site URL** e **Redirect URLs** (`https://seu-app.vercel.app/auth/callback`).

---

## 5. Atualizar após deploy

```bash
git add .
git commit -m "descrição da mudança"
git push
```

A Vercel detecta o push e faz o redeploy automaticamente.  
Para migrations novas, execute o SQL manualmente no **SQL Editor** do Supabase.

---

## Revisão final

| Item | Status |
|------|--------|
| Rotas protegidas pelo middleware | `middleware.ts` redireciona para `/login` se não autenticado |
| Queries filtradas por `user_id` | Todas as queries usam `.eq("user_id", user.id)` |
| Tema dark | `<html className="dark">` em `app/layout.tsx` + Tailwind `darkMode: "class"` |
| Responsivo mobile 375px | Sidebar oculta, top bar + bottom nav visíveis |
| Responsivo desktop 1440px | Sidebar fixa, conteúdo em grid responsivo |
| Atalhos de teclado | `N`, `D`, `/` registrados em `app/(dashboard)/layout.tsx` |
| Botão Sair | `supabase.auth.signOut()` + `router.push("/login")` |
