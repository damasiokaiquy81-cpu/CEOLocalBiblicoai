// Configuração do acesso — mesmo projeto Supabase do app CEOBiblico.ai (ceobiblico-app/license-config.js).
// SUPABASE_KEY é a chave "publishable" (pública de propósito): com ela só dá para chamar a função acesso_site.
// NUNCA coloque aqui a "service_role"/"secret".
const CONFIG = {
  SUPABASE_URL: "https://yqfopqwuboqrmoljhknp.supabase.co",
  SUPABASE_KEY: "sb_publishable_RuQWzz1j2I8sqzXCd73k3g_wtNKJo1L",

  // Aparecem na tela de acesso (deixe "" para esconder)
  BUY_URL: "", // link onde a pessoa compra o acesso
  SUPPORT: "", // ex.: "WhatsApp (11) 99999-9999" ou um e-mail

  // Sem internet, o acesso já liberado continua valendo por estes dias desde a última verificação
  OFFLINE_DAYS: 30,
};
