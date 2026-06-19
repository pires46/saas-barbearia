"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatCurrency, PRODUCT_CATEGORIES } from "@saas-barbearia/shared";
import { Plus, AlertTriangle, ArrowDown, ArrowUp } from "lucide-react";

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  cost: number;
  stock: number;
  minStock: number;
}

export default function EstoquePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [lowStock, setLowStock] = useState<Product[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showMovement, setShowMovement] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", category: "POMADE", price: "", cost: "", stock: "0", minStock: "5" });
  const [movement, setMovement] = useState({ quantity: "1", movementType: "IN", reason: "" });

  const load = () => fetch("/api/products").then((r) => r.json()).then((d) => {
    setProducts(d.products);
    setLowStock(d.lowStock);
  });
  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        price: parseFloat(form.price),
        cost: parseFloat(form.cost),
        stock: parseInt(form.stock),
        minStock: parseInt(form.minStock),
      }),
    });
    setShowForm(false);
    load();
  };

  const handleMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "movement",
        productId: showMovement,
        quantity: parseInt(movement.quantity),
        movementType: movement.movementType,
        reason: movement.reason,
      }),
    });
    setShowMovement(null);
    load();
  };

  return (
    <div>
      <PageHeader
        title="Estoque"
        description="Controle de produtos e movimentações"
        actions={
          <Button variant="accent" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" /> Novo Produto
          </Button>
        }
      />

      {lowStock.length > 0 && (
        <Card className="mb-6 border-yellow-500/50 bg-yellow-500/5">
          <div className="flex items-center gap-2 text-yellow-500">
            <AlertTriangle className="h-5 w-5" />
            <span className="font-medium">{lowStock.length} produto(s) abaixo do estoque mínimo</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {lowStock.map((p) => (
              <Badge key={p.id} variant="warning">{p.name}: {p.stock} un.</Badge>
            ))}
          </div>
        </Card>
      )}

      {showForm && (
        <Card className="mb-6">
          <form onSubmit={handleCreate} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Input placeholder="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {Object.entries(PRODUCT_CATEGORIES).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </Select>
            <Input placeholder="Preço venda" type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
            <Input placeholder="Custo" type="number" step="0.01" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
            <Input placeholder="Estoque inicial" type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
            <Input placeholder="Estoque mínimo" type="number" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: e.target.value })} />
            <div className="flex gap-2">
              <Button type="submit" variant="accent">Salvar</Button>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            </div>
          </form>
        </Card>
      )}

      {showMovement && (
        <Card className="mb-6">
          <form onSubmit={handleMovement} className="flex flex-wrap gap-3">
            <Select value={movement.movementType} onChange={(e) => setMovement({ ...movement, movementType: e.target.value })}>
              <option value="IN">Entrada</option>
              <option value="OUT">Saída</option>
            </Select>
            <Input type="number" placeholder="Quantidade" value={movement.quantity} onChange={(e) => setMovement({ ...movement, quantity: e.target.value })} required />
            <Input placeholder="Motivo" value={movement.reason} onChange={(e) => setMovement({ ...movement, reason: e.target.value })} />
            <Button type="submit" variant="accent">Confirmar</Button>
            <Button type="button" variant="outline" onClick={() => setShowMovement(null)}>Cancelar</Button>
          </form>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((p) => (
          <Card key={p.id}>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold">{p.name}</h3>
                <Badge className="mt-1">{PRODUCT_CATEGORIES[p.category as keyof typeof PRODUCT_CATEGORIES]}</Badge>
              </div>
              <span className="font-bold text-accent">{formatCurrency(p.price)}</span>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className={`text-lg font-bold ${p.stock <= p.minStock ? "text-yellow-500" : ""}`}>
                {p.stock} un.
              </span>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => { setShowMovement(p.id); setMovement({ ...movement, movementType: "IN" }); }}>
                  <ArrowUp className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setShowMovement(p.id); setMovement({ ...movement, movementType: "OUT" }); }}>
                  <ArrowDown className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
