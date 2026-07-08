// Products - the Rally product catalog. CPQ-grade surface: catalog KPIs,
// category segmentation, and a sortable/searchable price book. Read-only on
// price (no product writer exists in the store yet).
import React, { useMemo, useState } from 'react';
import { getProducts, useExt } from '../lib/store-ext.js';
import {
  SectionHeader, StatCard, Segmented, Badge, Button, money, moneyK, useToast,
} from '../components/UI.jsx';
import DataTable from '../components/DataTable.jsx';
import { Icon } from '../components/icons.jsx';

export default function Products() {
  useExt(); // reactive to store commits
  const products = getProducts();
  const toast = useToast();
  const [cat, setCat] = useState('All');

  const categories = useMemo(
    () => Array.from(new Set(products.map(p => p.category))).sort(),
    [products],
  );

  const activeCount = products.filter(p => p.active).length;
  const avgPrice = products.length
    ? products.reduce((s, p) => s + p.price, 0) / products.length
    : 0;

  const rows = useMemo(
    () => (cat === 'All' ? products : products.filter(p => p.category === cat)),
    [products, cat],
  );

  const segOptions = ['All', ...categories];

  const columns = [
    {
      key: 'name', header: 'Name', width: '26%',
      render: (r) => <span className="fw-7">{r.name}</span>,
    },
    {
      key: 'sku', header: 'SKU',
      render: (r) => <span className="mono t-sm muted">{r.sku}</span>,
    },
    {
      key: 'category', header: 'Category',
      render: (r) => <Badge tone="info">{r.category}</Badge>,
    },
    {
      key: 'billing', header: 'Billing',
      render: (r) => <span className="t-sm muted">{r.billing}</span>,
    },
    {
      key: 'price', header: 'Price', align: 'right', sortValue: (r) => r.price,
      render: (r) => <span className="fw-7">{money(r.price)}</span>,
    },
    {
      key: 'active', header: 'Active', align: 'right', sortValue: (r) => (r.active ? 1 : 0),
      render: (r) => (
        <Badge tone={r.active ? 'ok' : 'default'}>{r.active ? 'Active' : 'Inactive'}</Badge>
      ),
    },
  ];

  return (
    <div className="col gap-3">
      <SectionHeader
        title="Products"
        sub={`${products.length} in the price book`}
        action={
          <Button
            variant="accent"
            onClick={() => toast('Product editor is coming soon.', 'warn')}
          >
            <Icon name="plus" size={16} /> New product
          </Button>
        }
      />

      <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))' }}>
        <StatCard label="Catalog size" value={products.length} icon={<Icon name="box" size={18} />} sub="products listed" />
        <StatCard label="Active products" value={activeCount} icon={<Icon name="check" size={18} />} accent="var(--ok)" sub={`${products.length - activeCount} inactive`} />
        <StatCard label="Avg list price" value={avgPrice} format={moneyK} icon={<Icon name="dollar" size={18} />} sub="across catalog" />
        <StatCard label="Categories" value={categories.length} icon={<Icon name="chart" size={18} />} sub="product lines" />
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        searchable
        searchKeys={['name', 'sku', 'category']}
        searchPlaceholder="Filter products..."
        initialSort={{ key: 'price', dir: 'desc' }}
        rightControls={<Segmented options={segOptions} value={cat} onChange={setCat} />}
      />
    </div>
  );
}
