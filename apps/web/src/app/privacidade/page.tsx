import Link from "next/link";

export default function PrivacidadePage() {
  return (
    <div className="mx-auto max-w-3xl p-6 prose prose-invert">
      <h1>Política de Privacidade — BarberSaaS</h1>
      <p>Última atualização: {new Date().toLocaleDateString("pt-BR")}</p>
      <p>
        Esta política descreve como tratamos dados pessoais em conformidade com a LGPD (Lei 13.709/2018).
      </p>
      <h2>Dados coletados</h2>
      <ul>
        <li>Dados de cadastro: nome, e-mail, telefone, CNPJ (opcional)</li>
        <li>Dados de clientes das barbearias: nome, telefone, histórico de agendamentos</li>
        <li>Dados de uso: logs de acesso e auditoria</li>
      </ul>
      <h2>Finalidade</h2>
      <p>Prestação do serviço, agendamentos, comunicações (WhatsApp/e-mail) e cobrança.</p>
      <h2>Compartilhamento</h2>
      <p>Dados podem ser processados por provedores de pagamento (Asaas) e mensageria (Evolution API).</p>
      <h2>Seus direitos</h2>
      <p>Você pode solicitar acesso, correção ou exclusão dos seus dados pelo e-mail de suporte.</p>
      <h2>Retenção</h2>
      <p>Mantemos os dados enquanto a conta estiver ativa e pelo prazo legal aplicável.</p>
      <Link href="/" className="text-accent">← Voltar</Link>
    </div>
  );
}
