-- Banco das inscrições do curso. Mora no projeto Supabase "espaco-crescer" (São Paulo), numa pasta só
-- da Neuromov: schema "neuromov" e bucket "neuromov-comprovantes".
-- Só a função da Vercel lê e grava, com a chave secreta: anon e authenticated não enxergam o schema
-- nem o bucket. O schema precisa estar na lista "Exposed schemas" da API para a função alcançar.

create schema if not exists neuromov;
revoke all on schema neuromov from public, anon, authenticated;
grant usage on schema neuromov to service_role;

create table if not exists neuromov.inscricoes (
  id uuid primary key default gen_random_uuid(),
  criado_em timestamptz not null default now(),
  nome text not null,
  email text not null,
  telefone text not null,
  escolaridade text not null,
  pagamento text not null,
  comprovante text,          -- caminho no bucket "neuromov-comprovantes"
  comprovante_nome text,
  comprovante_tipo text,
  email_enviado boolean not null default false,
  tentativas int not null default 0,
  ultima_tentativa timestamptz,
  erro text,
  ip_hash text               -- impressão do IP do dia, só para frear disparo em massa
);

alter table neuromov.inscricoes enable row level security;
revoke all on neuromov.inscricoes from public, anon, authenticated;
grant select, insert, update on neuromov.inscricoes to service_role;

create index if not exists inscricoes_pendentes on neuromov.inscricoes (criado_em) where not email_enviado;
create index if not exists inscricoes_ip on neuromov.inscricoes (ip_hash, criado_em);

-- comprovantes: privado, até 5 MB, só imagem e PDF (sem política: só a chave secreta acessa)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('neuromov-comprovantes', 'neuromov-comprovantes', false, 5242880,
        array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'application/pdf'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
