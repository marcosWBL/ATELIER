-- condicionais
create table public.condicionais (
  id text primary key,
  user_id uuid references auth.users on delete cascade not null,
  customer_id text references public.customers(id) on delete set null,
  status text not null default 'ativo',
  data_saida date not null,
  data_devolucao date not null,
  notes text,
  created_at timestamptz default now()
);
alter table public.condicionais enable row level security;
create policy "owner" on public.condicionais using (auth.uid() = user_id);

-- condicional_items
create table public.condicional_items (
  id text primary key,
  condicional_id text references public.condicionais(id) on delete cascade not null,
  product_id text references public.products(id) on delete set null,
  product_name text not null,
  product_price numeric not null default 0,
  product_cost numeric not null default 0,
  quantity integer not null default 1
);
alter table public.condicional_items enable row level security;
create policy "owner" on public.condicional_items
  using (exists (
    select 1 from public.condicionais c
    where c.id = condicional_id and c.user_id = auth.uid()
  ));
