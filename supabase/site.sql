-- =====================================================================
-- CEOLocalBiblico.ai (site do mapa) — acesso com a MESMA chave do app CEOBiblico.ai
-- Cole tudo no Supabase → SQL Editor → Run. Pode rodar de novo sem problema.
--
-- Usa a tabela public.licencas que já existe (criada pelo licencas.sql do app).
-- Diferença para o app: aqui a chave NÃO fica presa a um computador. O cliente abre o
-- site no celular e no PC. A coluna "dispositivo" (a trava do app) não é lida nem alterada,
-- então usar o site nunca atrapalha a ativação do programa.
-- =====================================================================

-- Guarda quando o cliente usou o site pela última vez (só para você acompanhar)
alter table public.licencas add column if not exists ultimo_acesso_site timestamptz;

-- ---------------------------------------------------------------------
-- A ÚNICA coisa que o site pode chamar.
-- Respostas: 'ok' | 'invalida' | 'bloqueada'
-- ---------------------------------------------------------------------
create or replace function public.acesso_site(p_chave text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  l public.licencas%rowtype;
  k text := upper(trim(p_chave));
begin
  if k is null or length(k) < 10 then
    return 'invalida';
  end if;

  select * into l from public.licencas where chave = k;
  if not found then
    return 'invalida';
  end if;

  if not l.liberado then
    return 'bloqueada';
  end if;

  update public.licencas set ultimo_acesso_site = now() where id = l.id;
  return 'ok';
end;
$$;

revoke all on function public.acesso_site(text) from public;
grant execute on function public.acesso_site(text) to anon, authenticated;

-- =====================================================================
-- Bloquear uma chave (reembolso, chave vazada...) bloqueia o app E o site:
--   update public.licencas set liberado = false where chave = 'CEOB-XXXX-XXXX-XXXX-XXXX';
--
-- Ver quem está usando o site:
--   select cliente, email, ultimo_acesso_site from public.licencas order by ultimo_acesso_site desc nulls last;
-- =====================================================================
