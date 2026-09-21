import { useState } from 'react';
import {
  CRM_LIFECYCLE_LABELS,
  CRM_LIFECYCLE_STAGES,
  type CrmLifecycleStage,
} from '@/types';
import {
  buildBrandTimeline,
  crmNotes,
  crmTasks,
  addCrmNote,
  addCrmTask,
  setCrmTaskStatus,
  getCrmMeta,
  setBrandTags,
  setBrandLifecycle,
  setBrandAccountOwner,
  type TimelineEntry,
} from '@/lib/crm/crmStore';
import { useApp } from '@/context/GlobalStateContext';
import { Badge, Button, Card, Input } from '@/components/ui';
import { cn } from '@/utils/cn';

const KIND_STYLES: Record<TimelineEntry['kind'], string> = {
  message: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
  call: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20',
  note: 'bg-white/[0.05] text-zinc-300 border-white/[0.08]',
  task: 'bg-brass-500/10 text-brass-300 border-brass-500/20',
  system_po: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
  system_contract: 'bg-violet-500/10 text-violet-300 border-violet-500/20',
  system_compliance: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
  system_deduction: 'bg-red-500/10 text-red-300 border-red-500/20',
};

/**
 * §Stage-25 — CRM industry-bar depth for ONE brand, embedded inline in the
 * Brand CRM record: unified chronological timeline (messages, calls, notes,
 * tasks AND derived system events), assignable follow-up tasks with due
 * dates, attributed internal notes, admin-definable tags, relationship
 * lifecycle stage and assigned account owner. Every mutation is gated on the
 * acting staff member's permission tier and writes to the platform audit log.
 */
export function BrandCrmDepth({ brandId }: { brandId: string }) {
  const { staff, actingStaffId, canCurrentUserMutate } = useApp();
  const [tab, setTab] = useState<'timeline' | 'tasks' | 'notes' | 'relationship'>('timeline');
  const [version, setVersion] = useState(0);
  const bump = () => setVersion((v) => v + 1);

  const [taskTitle, setTaskTitle] = useState('');
  const [taskDue, setTaskDue] = useState('');
  const [taskAssignee, setTaskAssignee] = useState(actingStaffId);
  const [noteBody, setNoteBody] = useState('');
  const [tagDraft, setTagDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  const timeline = buildBrandTimeline(brandId);
  const meta = getCrmMeta(brandId);
  const brandTasks = crmTasks.filter((t) => t.brandId === brandId);
  const brandNotes = crmNotes.filter((n) => n.brandId === brandId);
  void version; // recompute on mutation

  function guard(): boolean {
    if (!canCurrentUserMutate) {
      setError('View-only ops staff cannot modify CRM records.');
      return false;
    }
    setError(null);
    return true;
  }

  return (
    <Card title="Relationship Depth">
      <div className="px-1 pb-1">
        <div className="flex items-center gap-1 flex-wrap pb-2">
          {(['timeline', 'tasks', 'notes', 'relationship'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'px-2 py-1 rounded-md text-ds-label capitalize',
                tab === t ? 'bg-brass-500/15 text-brass-300' : 'text-zinc-500 hover:text-white'
              )}
            >
              {t}
              {t === 'tasks' && brandTasks.some((x) => x.status === 'open') && (
                <span className="ml-1 text-ds-micro">
                  {brandTasks.filter((x) => x.status === 'open').length}
                </span>
              )}
            </button>
          ))}
        </div>

        {error && (
          <p className="text-ds-label text-red-300 bg-red-500/10 border border-red-500/20 rounded-md px-2 py-1 mb-2">
            {error}
          </p>
        )}

        {tab === 'timeline' && (
          <div className="space-y-1.5 max-h-[320px] overflow-y-auto pr-1">
            <p className="text-ds-micro text-zinc-600">
              {timeline.length} events — messages, calls, notes, tasks and system events in one feed.
            </p>
            {timeline.map((e) => (
              <div key={e.id} className="border-b border-white/[0.04] pb-1.5">
                <div className="flex items-center gap-2">
                  <Badge className={cn('text-ds-micro', KIND_STYLES[e.kind])}>{e.label}</Badge>
                  <span className="text-ds-micro font-mono text-zinc-600">
                    {new Date(e.at).toLocaleString()}
                  </span>
                </div>
                <p className="text-ds-label text-zinc-400 mt-0.5">{e.detail}</p>
              </div>
            ))}
            {timeline.length === 0 && (
              <p className="text-ds-label text-zinc-600">No activity yet.</p>
            )}
          </div>
        )}

        {tab === 'tasks' && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Input label="Follow-up task" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="Chase signed rate card…" />
              <Input label="Due date" type="date" value={taskDue} onChange={(e) => setTaskDue(e.target.value)} />
            </div>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="block text-ds-micro text-zinc-500 mb-1">Assign to</label>
                <select
                  value={taskAssignee}
                  onChange={(e) => setTaskAssignee(e.target.value)}
                  className="w-full bg-ink-900 border border-white/[0.08] rounded-md px-2 py-1.5 text-xs text-zinc-300"
                >
                  {staff.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <Button
                className="text-xs"
                disabled={!taskTitle.trim() || !taskDue}
                onClick={() => {
                  if (!guard()) return;
                  try {
                    addCrmTask(
                      {
                        brandId,
                        title: taskTitle,
                        dueDate: taskDue,
                        assignedToStaffId: taskAssignee,
                        createdByStaffId: actingStaffId,
                      },
                      actingStaffId
                    );
                    setTaskTitle('');
                    setTaskDue('');
                    bump();
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Failed');
                  }
                }}
              >
                Add Task
              </Button>
            </div>
            {brandTasks.length === 0 && (
              <p className="text-ds-label text-zinc-600">No tasks for this brand yet.</p>
            )}
            {brandTasks.map((t) => {
              const assignee = staff.find((s) => s.id === t.assignedToStaffId);
              const overdue = t.status === 'open' && t.dueDate < new Date().toISOString().slice(0, 10);
              return (
                <div key={t.id} className="flex items-center justify-between gap-2 border-b border-white/[0.04] py-1">
                  <div>
                    <span className={cn('text-ds-label', t.status === 'done' ? 'text-zinc-600 line-through' : 'text-zinc-200')}>
                      {t.title}
                    </span>
                    <span className="text-ds-micro text-zinc-600 ml-2">
                      due {t.dueDate} · {assignee?.name ?? 'unassigned'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {overdue && (
                      <Badge className="text-ds-micro bg-red-500/15 text-red-300 border-red-500/20">overdue</Badge>
                    )}
                    <button
                      onClick={() => {
                        if (!guard()) return;
                        setCrmTaskStatus(t.id, t.status === 'open' ? 'done' : 'open', actingStaffId);
                        bump();
                      }}
                      disabled={!canCurrentUserMutate}
                      className={cn(
                        'text-ds-micro px-2 py-0.5 rounded-md border',
                        canCurrentUserMutate
                          ? 'border-white/[0.1] text-zinc-400 hover:text-white hover:border-brass-500/40'
                          : 'border-white/[0.05] text-zinc-700 cursor-not-allowed'
                      )}
                    >
                      {t.status === 'open' ? 'Mark done' : 'Reopen'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === 'notes' && (
          <div className="space-y-2">
            <textarea
              value={noteBody}
              onChange={(e) => setNoteBody(e.target.value)}
              rows={2}
              placeholder="Internal note (timestamped, attributed — never shown to the brand)…"
              className="w-full bg-ink-900 border border-white/[0.08] rounded-md px-3 py-2 text-xs text-white focus:outline-none focus:border-brass-500/40"
            />
            <Button
              className="text-xs"
              disabled={!noteBody.trim()}
              onClick={() => {
                if (!guard()) return;
                addCrmNote(brandId, noteBody, actingStaffId);
                setNoteBody('');
                bump();
              }}
            >
              Add Note
            </Button>
            {brandNotes.length === 0 && (
              <p className="text-ds-label text-zinc-600">No internal notes yet.</p>
            )}
            {brandNotes.map((n) => (
              <div key={n.id} className="border-b border-white/[0.04] pb-1.5">
                <span className="text-ds-micro font-mono text-zinc-600">
                  {new Date(n.createdAt).toLocaleString()} ·{' '}
                  {staff.find((s) => s.id === n.authorStaffId)?.name ?? n.authorStaffId}
                </span>
                <p className="text-ds-label text-zinc-300 mt-0.5">{n.body}</p>
              </div>
            ))}
          </div>
        )}


        {tab === 'relationship' && (
          <div className="space-y-3">
            <div>
              <label className="block text-ds-micro text-zinc-500 mb-1">Lifecycle stage</label>
              <div className="grid grid-cols-5 gap-1">
                {CRM_LIFECYCLE_STAGES.map((stage: CrmLifecycleStage) => (
                  <button
                    key={stage}
                    disabled={!canCurrentUserMutate}
                    onClick={() => {
                      if (!guard()) return;
                      setBrandLifecycle(brandId, stage, actingStaffId);
                      bump();
                    }}
                    className={cn(
                      'text-ds-micro px-1 py-1.5 rounded-lg border capitalize transition-colors',
                      meta.lifecycleStage === stage
                        ? 'border-brass-500/50 bg-brass-500/10 text-white'
                        : 'border-white/[0.08] text-zinc-400',
                      !canCurrentUserMutate && 'cursor-not-allowed opacity-50'
                    )}
                  >
                    {CRM_LIFECYCLE_LABELS[stage]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-ds-micro text-zinc-500 mb-1">Segmentation tags</label>
              <div className="flex items-center gap-1 flex-wrap mb-1">
                {meta.tags.length === 0 && <span className="text-ds-micro text-zinc-600">none</span>}
                {meta.tags.map((t) => (
                  <Badge key={t} className="text-ds-micro bg-violet-500/15 text-violet-300 border-violet-500/20">
                    {t}
                  </Badge>
                ))}
              </div>
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Input label="" value={tagDraft} onChange={(e) => setTagDraft(e.target.value)} placeholder="VIP, at-risk, new…" />
                </div>
                <Button
                  className="text-xs"
                  disabled={!tagDraft.trim()}
                  onClick={() => {
                    if (!guard()) return;
                    setBrandTags(brandId, [...meta.tags, tagDraft], actingStaffId);
                    setTagDraft('');
                    bump();
                  }}
                >
                  Add Tag
                </Button>
              </div>
            </div>

            <div>
              <label className="block text-ds-micro text-zinc-500 mb-1">Account owner</label>
              <select
                value={meta.accountOwnerStaffId ?? ''}
                disabled={!canCurrentUserMutate}
                onChange={(e) => {
                  if (!guard()) return;
                  setBrandAccountOwner(brandId, e.target.value || null, actingStaffId);
                  bump();
                }}
                className="w-full bg-ink-900 border border-white/[0.08] rounded-md px-2 py-1.5 text-xs text-zinc-300 disabled:opacity-50"
              >
                <option value="">(unassigned)</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}

      </div>
    </Card>
  );
}
