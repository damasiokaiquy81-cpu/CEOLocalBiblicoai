// Acesso ao site: a chave do app CEOBiblico.ai, conferida no Supabase (função acesso_site).
// Carregado no <head> das páginas, antes de tudo, depois de config.js.

const Acesso = (() => {
  const LS = "ceolocal.acesso";
  const DIA = 24 * 60 * 60 * 1000;

  function ler() {
    try { return JSON.parse(localStorage.getItem(LS)); } catch { return null; }
  }
  function gravar(d) {
    try { localStorage.setItem(LS, JSON.stringify(d)); } catch {}
  }
  function limpar() {
    try { localStorage.removeItem(LS); } catch {}
  }

  function normalizar(k) {
    const raw = String(k || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20);
    return (raw.match(/.{1,4}/g) || []).join("-");
  }

  // Devolve 'ok' | 'invalida' | 'bloqueada' | 'nao_configurado'. Erro de rede = exceção.
  async function perguntar(chave) {
    const headers = { "Content-Type": "application/json", apikey: CONFIG.SUPABASE_KEY };
    if (CONFIG.SUPABASE_KEY.startsWith("eyJ")) headers.Authorization = `Bearer ${CONFIG.SUPABASE_KEY}`; // chave anon antiga (JWT)
    const res = await fetch(`${CONFIG.SUPABASE_URL.replace(/\/+$/, "")}/rest/v1/rpc/acesso_site`, {
      method: "POST",
      headers,
      body: JSON.stringify({ p_chave: chave }),
      signal: AbortSignal.timeout(12000),
    });
    if (res.status === 404) return "nao_configurado"; // função ainda não criada (rode supabase/site.sql)
    if (!res.ok) throw new Error(`servidor respondeu ${res.status}`);
    const r = await res.json();
    if (!["ok", "invalida", "bloqueada"].includes(r)) throw new Error("resposta inesperada");
    return r;
  }

  // Tela de acesso: confere e, se ok, guarda neste navegador
  async function entrar(chaveDigitada) {
    const chave = normalizar(chaveDigitada);
    let r;
    try { r = await perguntar(chave); } catch { return "sem_conexao"; }
    if (r === "ok") gravar({ chave, verificadoEm: Date.now() });
    return r;
  }

  // Abertura do mapa, sem esperar a internet: tem chave guardada e dentro do prazo?
  function valido() {
    const a = ler();
    return !!(a && a.chave && Date.now() - (a.verificadoEm || 0) < (CONFIG.OFFLINE_DAYS || 30) * DIA);
  }

  // Confere de novo no servidor em segundo plano (chave bloqueada depois da compra, reembolso...)
  async function reconferir() {
    const a = ler();
    if (!a || !a.chave) return "sem_acesso";
    let r;
    try { r = await perguntar(a.chave); } catch { return "offline"; }
    if (r === "ok") gravar({ ...a, verificadoEm: Date.now() });
    else if (r !== "nao_configurado") limpar();
    return r;
  }

  function sair() {
    limpar();
    location.replace("entrar.html");
  }

  // Protege a página: sem acesso, vai para a tela de entrada antes de mostrar qualquer coisa
  function proteger() {
    if (!valido()) {
      const motivo = ler() ? "?motivo=offline" : "";
      document.documentElement.style.visibility = "hidden";
      location.replace("entrar.html" + motivo);
      return false;
    }
    reconferir().then((r) => {
      if (r === "invalida" || r === "bloqueada") location.replace("entrar.html?motivo=" + r);
    });
    return true;
  }

  return { entrar, valido, sair, proteger, normalizar };
})();
