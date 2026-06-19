import Link from "next/link";

export default function TermosPage() {
  return (
    <div className="mx-auto max-w-3xl p-6 prose prose-invert">
      <h1>Termos de Uso — BarberSaaS</h1>
      <p>Última atualização: {new Date().toLocaleDateString("pt-BR")}</p>
      <p>
        Ao utilizar o BarberSaaS, você concorda com estes termos. O serviço é oferecido como software
        de gestão para barbearias em modelo de assinatura mensal.
      </p>
      <h2>1. Conta e responsabilidade</h2>
      <p>O titular da conta é responsável pelos dados cadastrados, funcionários e clientes.</p>
      <h2>2. Pagamento</h2>
      <p>A falta de pagamento pode resultar em bloqueio temporário do acesso.</p>
      <h2>3. Uso aceitável</h2>
      <p>É proibido usar a plataforma para spam, conteúdo ilegal ou violação de direitos de terceiros.</p>
      <h2>4. Cancelamento</h2>
      <p>Você pode cancelar a qualquer momento. Dados podem ser exportados mediante solicitação.</p>
      <Link href="/" className="text-accent">← Voltar</Link>
    </div>
  );
}
