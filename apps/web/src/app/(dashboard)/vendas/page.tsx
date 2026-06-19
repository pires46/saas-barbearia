"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatCurrency, formatDateTime, PAYMENT_METHODS } from "@saas-barbearia/shared";
import { Plus, ShoppingCart, Printer, MessageCircle } from "lucide-react";

interface SaleItem {
  name: string;
  serviceId?: string;
  productId?: string;
  employeeId?: string;
  quantity: number;
  unitPrice: number;
}

export default function VendasPage() {
  const [sales, setSales] = useState<{ id: string; total: number; paymentMethod: string; createdAt: string; client: { name: string } | null; items: { name: string; quantity: number; total: number }[] }[]>([]);
  const [showPOS, setShowPOS] = useState(false);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [services, setServices] = useState<{ id: string; name: string; price: number }[]>([]);
  const [products, setProducts] = useState<{ id: string; name: string; price: number; stock: number }[]>([]);
  const [employees, setEmployees] = useState<{ id: string; name: string }[]>([]);
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [clientId, setClientId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("PIX");
  const [discount, setDiscount] = useState("0");

  const load = () => fetch("/api/sales").then((r) => r.json()).then(setSales);

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (showPOS) {
      Promise.all([
        fetch("/api/clients").then((r) => r.json()),
        fetch("/api/services").then((r) => r.json()),
        fetch("/api/products").then((r) => r.json()),
        fetch("/api/employees").then((r) => r.json()),
      ]).then(([c, s, p, e]) => {
        setClients(c);
        setServices(s);
        setProducts(p.products || p);
        setEmployees(e);
      });
    }
  }, [showPOS]);

  const addToCart = (item: SaleItem) => setCart([...cart, item]);
  const subtotal = cart.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const total = subtotal - parseFloat(discount || "0");

  const handleSale = async () => {
    if (cart.length === 0) return;
    await fetch("/api/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: clientId || undefined,
        items: cart,
        paymentMethod,
        discount: parseFloat(discount || "0"),
      }),
    });
    setCart([]);
    setShowPOS(false);
    load();
  };

  const printReceipt = (sale: typeof sales[0]) => {
    const text = `COMPROVANTE\n${formatDateTime(sale.createdAt)}\n${sale.client?.name || "Cliente avulso"}\n${sale.items.map((i) => `${i.name} x${i.quantity} ${formatCurrency(i.total)}`).join("\n")}\nTotal: ${formatCurrency(sale.total)}\nPagamento: ${PAYMENT_METHODS[sale.paymentMethod as keyof typeof PAYMENT_METHODS]}`;
    const w = window.open("", "_blank");
    if (w) { w.document.write(`<pre>${text}</pre>`); w.print(); }
  };

  return (
    <div>
      <PageHeader
        title="Vendas"
        description="Frente de caixa e histórico de vendas"
        actions={
          <Button variant="accent" onClick={() => setShowPOS(true)}>
            <ShoppingCart className="h-4 w-4" /> Nova Venda
          </Button>
        }
      />

      {showPOS && (
        <Card className="mb-6">
          <CardTitle className="mb-4">Frente de Caixa</CardTitle>
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <p className="mb-2 text-sm font-medium">Adicionar itens</p>
              <div className="mb-3 flex flex-wrap gap-2">
                {services.map((s) => (
                  <Button key={s.id} size="sm" variant="outline" onClick={() => addToCart({ name: s.name, serviceId: s.id, quantity: 1, unitPrice: s.price })}>
                    {s.name} {formatCurrency(s.price)}
                  </Button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {products.map((p) => (
                  <Button key={p.id} size="sm" variant="outline" disabled={p.stock <= 0} onClick={() => addToCart({ name: p.name, productId: p.id, quantity: 1, unitPrice: p.price })}>
                    {p.name} {formatCurrency(p.price)}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <Select value={clientId} onChange={(e) => setClientId(e.target.value)} className="mb-3">
                <option value="">Cliente avulso</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
              <div className="mb-3 space-y-1">
                {cart.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span>{item.name} x{item.quantity}</span>
                    <span>{formatCurrency(item.unitPrice * item.quantity)}</span>
                  </div>
                ))}
              </div>
              <div className="mb-3 flex gap-2">
                <Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                  {Object.entries(PAYMENT_METHODS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </Select>
                <Input placeholder="Desconto" type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} />
              </div>
              <div className="mb-3 text-xl font-bold">Total: {formatCurrency(total)}</div>
              <div className="flex gap-2">
                <Button variant="accent" onClick={handleSale} disabled={cart.length === 0}>Finalizar</Button>
                <Button variant="outline" onClick={() => setShowPOS(false)}>Cancelar</Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      <div className="space-y-3">
        {sales.map((sale) => (
          <Card key={sale.id} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">{sale.client?.name || "Cliente avulso"}</p>
              <p className="text-sm text-muted-foreground">
                {formatDateTime(sale.createdAt)} · {PAYMENT_METHODS[sale.paymentMethod as keyof typeof PAYMENT_METHODS]}
              </p>
              <p className="text-xs text-muted-foreground">
                {sale.items.map((i) => `${i.name} x${i.quantity}`).join(", ")}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold">{formatCurrency(sale.total)}</span>
              <Button size="sm" variant="outline" onClick={() => printReceipt(sale)}>
                <Printer className="h-3 w-3" />
              </Button>
              <Button size="sm" variant="outline">
                <MessageCircle className="h-3 w-3" />
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
