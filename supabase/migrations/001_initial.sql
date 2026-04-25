-- profiles
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  store_name text not null,
  email text not null,
  monthly_goal numeric default 0,
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;
create policy "owner" on public.profiles using (auth.uid() = id);

-- customers
create table public.customers (
  id text primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  email text,
  phone text,
  birthday date,
  vip boolean default false,
  notes text,
  created_at timestamptz default now()
);
alter table public.customers enable row level security;
create policy "owner" on public.customers using (auth.uid() = user_id);

-- products
create table public.products (
  id text primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  description text,
  price numeric not null default 0,
  cost numeric default 0,
  qty integer default 0,
  category text,
  image_url text,
  created_at timestamptz default now()
);
alter table public.products enable row level security;
create policy "owner" on public.products using (auth.uid() = user_id);

-- sales
create table public.sales (
  id text primary key,
  user_id uuid references auth.users on delete cascade not null,
  customer_id text references public.customers(id) on delete set null,
  payment_method text not null,
  date date not null,
  subtotal numeric not null default 0,
  discount_type text default 'R$',
  discount_value numeric default 0,
  total numeric not null default 0,
  profit numeric default 0,
  refunded boolean default false,
  created_at timestamptz default now()
);
alter table public.sales enable row level security;
create policy "owner" on public.sales using (auth.uid() = user_id);

-- sale_items
create table public.sale_items (
  id uuid default gen_random_uuid() primary key,
  sale_id text references public.sales(id) on delete cascade not null,
  product_id text references public.products(id) on delete set null,
  name text not null,
  price numeric not null,
  quantity integer not null default 1
);
alter table public.sale_items enable row level security;
create policy "owner" on public.sale_items
  using (exists (select 1 from public.sales s where s.id = sale_id and s.user_id = auth.uid()));

-- expenses
create table public.expenses (
  id text primary key,
  user_id uuid references auth.users on delete cascade not null,
  description text not null,
  amount numeric not null,
  category text,
  date date not null,
  notes text,
  created_at timestamptz default now()
);
alter table public.expenses enable row level security;
create policy "owner" on public.expenses using (auth.uid() = user_id);

-- bills
create table public.bills (
  id text primary key,
  user_id uuid references auth.users on delete cascade not null,
  description text not null,
  supplier text,
  category text,
  amount numeric not null,
  due_date date not null,
  recurrence text default 'Nenhuma',
  notes text,
  paid boolean default false,
  created_at timestamptz default now()
);
alter table public.bills enable row level security;
create policy "owner" on public.bills using (auth.uid() = user_id);

-- Storage bucket for product images
insert into storage.buckets (id, name, public) values ('products', 'products', true);
create policy "owner upload" on storage.objects for insert
  with check (bucket_id = 'products' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "public read" on storage.objects for select
  using (bucket_id = 'products');
create policy "owner delete" on storage.objects for delete
  using (bucket_id = 'products' and auth.uid()::text = (storage.foldername(name))[1]);
