/**
 * §Phase 5 — Design System Showcase.
 *
 * Canonical visual reference for all later redesign phases. It renders ONLY
 * the canonical kit (`@/components/ui` + design tokens) — it does not touch
 * any real application screen. This is the foundation reference surface, not
 * a production feature.
 */

import { useState } from 'react';
import {
  Alert, Breadcrumb, Button, Card, Checkbox, DataTable, EmptyState,
  EntityHeader, Input, Modal, PageHeader, Pagination, Select, Skeleton,
  StatusBadge, Tabs, Textarea, type StatusTone,
} from '@/components/ui';
import {
  MercentaDoughnut,
  MercentaLineChart,
} from '@/components/shared/charts/MercentaCharts';
import { Avatar } from '@/components/shared/Avatar';
import { resolveBrandLogo } from '@/lib/brandIdentity/logoResolver';

const STATUS_TONES: { tone: StatusTone; label: string }[] = [
  { tone: 'success', label: 'On track' },
  { tone: 'warning', label: 'Attention' },
  { tone: 'danger', label: 'Blocked' },
  { tone: 'info', label: 'Pending' },
  { tone: 'neutral', label: 'Inactive' },
  { tone: 'brass', label: 'Accent' },
];

const TABLE_ROWS = [
  { id: 'PO-1001', brand: 'Astonish', value: '£12,480', status: 'Delivered' },
  { id: 'PO-1002', brand: 'Tapatío', value: '£8,315', status: 'Shipped' },
  { id: 'PO-1003', brand: 'Sennheiser', value: '£21,940', status: 'Received' },
];

export function DesignSystemShowcase() {
  const [tab, setTab] = useState('overview');
  const [checked, setChecked] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [inputVal, setInputVal] = useState('');
  const [selectVal, setSelectVal] = useState('gbp');

  return (
    <div className="space-y-8 max-w-4xl">
      <PageHeader
        title="MERCENTA Design System"
        description="Canonical tokens and UI primitives. This is the visual reference the application redesign will follow — it is not a production screen."
        actions={<Button variant="secondary" onClick={() => setLoading((l) => !l)}>{loading ? 'Skeleton on' : 'Skeleton off'}</Button>}
      />
      <Breadcrumb items={[{ label: 'Super Admin' }, { label: 'Design System' }]} />
{/* Typography */}
      <section className="space-y-2" aria-labelledby="ds-typography">
        <h2 id="ds-typography" className="text-xs uppercase tracking-wider text-muted">Typography</h2>
        <p className="font-display text-3xl font-semibold text-strong">Display — Fraunces</p>
        <p className="text-2xl font-semibold text-strong">Page title</p>
        <p className="text-lg font-semibold text-strong">Section title</p>
        <p className="text-sm text-strong">Body — Plus Jakarta Sans. Regular reading copy.</p>
        <p className="text-xs text-muted">Label / caption — secondary info and meta.</p>
        <p className="font-mono text-sm text-accent-300">Numeric / KPI — 12,480.50</p>
      </section>

      {/* Buttons */}
      <section className="space-y-3" aria-labelledby="ds-buttons">
        <h2 id="ds-buttons" className="text-xs uppercase tracking-wider text-muted">Buttons</h2>
        <div className="flex flex-wrap gap-3">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="tertiary">Tertiary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="link">Link</Button>
          <Button loading>Loading</Button>
          <Button disabled>Disabled</Button>
        </div>
      </section>

      {/* Statuses */}
      <section className="space-y-3" aria-labelledby="ds-status">
        <h2 id="ds-status" className="text-xs uppercase tracking-wider text-muted">Semantic status</h2>
        <div className="flex flex-wrap gap-3">
          {STATUS_TONES.map((s) => (
            <StatusBadge key={s.tone} tone={s.tone} dataStatus={s.tone}>{s.label}</StatusBadge>
          ))}
        </div>
      </section>

      {/* Alerts */}
      <section className="space-y-3" aria-labelledby="ds-alerts">
        <h2 id="ds-alerts" className="text-xs uppercase tracking-wider text-muted">Alerts</h2>
        <Alert tone="success" title="Shipment delivered">Receipt matched confirmed quantities.</Alert>
        <Alert tone="warning" title="Acknowledgment due">PO must be acknowledged within 24h.</Alert>
        <Alert tone="error" title="Compliance gate blocked">Missing insurance certificate.</Alert>
        <Alert tone="info" title="Syncing">Synchronising with the retail channel…</Alert>
      </section>

      {/* Forms */}
      <section className="space-y-4" aria-labelledby="ds-forms">
        <h2 id="ds-forms" className="text-xs uppercase tracking-wider text-muted">Form foundation</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Business name"
            required
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            helper="The registered trading name."
          />
          <Input label="Tax ID" value="" onChange={() => {}} error="Provide a valid UK VAT number." />
          <Select
            label="Payout currency"
            value={selectVal}
            onChange={(e) => setSelectVal(e.target.value)}
            options={[
              { value: 'gbp', label: 'GBP — Pound sterling' },
              { value: 'usd', label: 'USD — US dollar' },
              { value: 'eur', label: 'EUR — Euro' },
            ]}
          />
          <Checkbox label="Agree to the distribution terms" checked={checked} onChange={setChecked} required />
        </div>
        <Textarea label="Notes" rows={2} value="" onChange={() => {}} placeholder="Optional operational notes…" />
      </section>

      {/* Tabs */}
      <section className="space-y-3" aria-labelledby="ds-tabs">
        <h2 id="ds-tabs" className="text-xs uppercase tracking-wider text-muted">Tabs</h2>
        <Tabs
          ariaLabel="Showcase tabs"
          items={[
            { id: 'overview', label: 'Overview', testId: 'tab-overview' },
            { id: 'activity', label: 'Activity', testId: 'tab-activity' },
            { id: 'history', label: 'History', testId: 'tab-history' },
          ]}
          active={tab}
          onSelect={setTab}
        />
        <p className="text-xs text-muted">Active tab: {tab}</p>
      </section>

      {/* §UI/UX Wave 1 — Charts (delicate signature) */}
      <section className="space-y-3" aria-labelledby="ds-charts">
        <h2 id="ds-charts" className="text-xs uppercase tracking-wider text-muted">Charts</h2>
        <Card>
          <div className="space-y-4">
            <MercentaLineChart
              ariaLabel="Example line chart: estimated monthly channel revenue across the last six months, rising from £4,250 to £18,700."
              series={[
                {
                  name: 'Estimated revenue',
                  points: [
                    { label: 'Mar', value: 4250 },
                    { label: 'Apr', value: 6100 },
                    { label: 'May', value: 7800 },
                    { label: 'Jun', value: 9400 },
                    { label: 'Jul', value: 13100 },
                    { label: 'Aug', value: 18700 },
                  ],
                },
                {
                  name: 'Units',
                  points: [
                    { label: 'Mar', value: 820 },
                    { label: 'Apr', value: 1210 },
                    { label: 'May', value: 1460 },
                    { label: 'Jun', value: 1900 },
                    { label: 'Jul', value: 2440 },
                    { label: 'Aug', value: 3120 },
                  ],
                },
              ]}
              yFormat={(v) => (v >= 1000 ? `£${Math.round(v / 1000)}k` : `£${v}`)}
            />
            <MercentaDoughnut
              ariaLabel="Example doughnut: fulfilment split — delivered 68, awaiting invoice 22, exception 10."
              segments={[
                { label: 'Delivered', value: 68 },
                { label: 'Awaiting invoice', value: 22 },
                { label: 'Exception', value: 10 },
              ]}
              centerValue="68%"
              centerLabel="delivered"
            />
          </div>
        </Card>
      </section>

      {/* §UI/UX Wave 1 — Identity (avatar + brand logo seam) */}
      <section className="space-y-3" aria-labelledby="ds-identity">
        <h2 id="ds-identity" className="text-xs uppercase tracking-wider text-muted">Identity seams</h2>
        <Card>
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <Avatar name="Tadii Mercenta" email="tadii@mercenta.example" size="lg" />
              <Avatar name="Brand Partner" size="md" />
              <Avatar name="Tapatío" size="sm" />
              <p className="text-xs text-muted">Avatar — image seam, initials fallback, responsive sizes.</p>
            </div>
            <div className="flex items-center gap-4">
              <img
                src={resolveBrandLogo({
                  tenantId: null,
                  brandId: 'showcase-manchester-united',
                  brandName: 'Manchester United',
                  dark: false,
                }).url ?? undefined}
                alt="Demo identity — Manchester United"
                className="h-10 w-10 rounded-ds-md border border-hairline-strong"
              />
              <p className="text-xs text-muted">
                Brand logo identity seam — deterministic demo resolution (Manchester United → monogram), tenant-scoped override ahead.
              </p>
            </div>
          </div>
        </Card>
      </section>

      {/* Table */}
      <section className="space-y-3" aria-labelledby="ds-table">
        <h2 id="ds-table" className="text-xs uppercase tracking-wider text-muted">DataTable foundation</h2>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        ) : (
          <DataTable
            columns={[
              { key: 'id', label: 'PO' },
              { key: 'brand', label: 'Brand' },
              { key: 'value', label: 'Value' },
              { key: 'status', label: 'Status' },
            ]}
            rows={TABLE_ROWS}
            rowKey={(r) => r.id as string}
          />
        )}
        <Pagination page={page} pageCount={4} onPage={setPage} />
      </section>

      {/* Empty + Modal */}
      <section className="space-y-3" aria-labelledby="ds-feedback">
        <h2 id="ds-feedback" className="text-xs uppercase tracking-wider text-muted">Empty & overlays</h2>
        <Card className="p-0">
          <EmptyState title="No returns in this period" description="Returns will appear here once a return is authorised." />
        </Card>
        <div className="flex gap-3">
          <Button onClick={() => setModalOpen(true)}>Open modal</Button>
          <Button variant="secondary" onClick={() => setChecked(!checked)}>Toggle checkbox</Button>
        </div>
      </section>

      {/* Entity header */}
      <EntityHeader
        eyebrow="Brand account"
        title="Astonish"
        status={<StatusBadge tone="success" dataStatus="active">Active</StatusBadge>}
        description="Home · UK distribution · Brand-direct supply"
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Example dialog"
        footer={<Button onClick={() => setModalOpen(false)}>Close</Button>}
      >
        <p className="text-sm text-strong">
          This is the canonical Modal primitive — ESC and backdrop click close it; it is labelled and keyboard-accessible.
        </p>
      </Modal>
    </div>
  );
}