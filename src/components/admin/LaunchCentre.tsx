/**
 * §31 — MERCENTA LAUNCH CENTRE (Super Admin only).
 *
 * Prepares MERCENTA'S OWN profiles on the 14 startup/MVP discovery platforms. This
 * is NOT brand-partner discovery.
 *
 * Everything here is honest about what it is: no automated submission, no claimed
 * integration, and the current per-platform requirements are marked as NOT YET
 * VERIFIED with a link to the page the founder must read. Each platform offers
 * [Prepare Profile] [Modify] [Copy] [Open] [Mark Submitted]; submissions are
 * recorded in the canonical audit trail with the founder as the actor.
 */
import { useEffect, useMemo, useState } from 'react';
import { Card, Button, Input } from '@/components/ui';
import {
  DEFAULT_LAUNCH_PROFILE,
  LAUNCH_CENTRE_DISCLAIMER,
  LAUNCH_PLATFORMS,
  type LaunchPlatform,
  type LaunchProfile,
} from '@/config/launchPlatforms';
import {
  ensureLaunchStore,
  getLaunchRecord,
  getLaunchRecords,
  markLaunchSubmitted,
  updateLaunchRecord,
  type LaunchRecord,
} from '@/data/launchStore';
import {
  buildSubmissionChecklist,
  buildSubmissionPackage,
  launchPlatformIsComplete,
} from '@/lib/founder/launchPackage';
import { ExternalLink, Copy, Check, Megaphone } from 'lucide-react';

const CHANNEL_LABEL: Record<LaunchPlatform['submissionChannel'], string> = {
  form: 'Platform form',
  email: 'Email / newsletter form',
  account: 'In-platform submission',
  manual_review: 'Manual review',
};

export function LaunchCentre() {
  const [records, setRecords] = useState<LaunchRecord[]>([]);
  const [profile, setProfile] = useState<LaunchProfile>(DEFAULT_LAUNCH_PROFILE);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    ensureLaunchStore();
    setRecords(getLaunchRecords());
  }, []);

  // Derived from the records already in state, so the summary cannot disagree with
  // the table rendered beneath it.
  const summary = useMemo(
    () => ({
      total: records.length,
      accountsCreated: records.filter((r) => r.accountStatus !== 'not_started').length,
      prepared: records.filter((r) => r.profileStatus !== 'not_prepared').length,
      submitted: records.filter((r) => r.profileStatus === 'submitted').length,
    }),
    [records]
  );
  const selected = selectedId ? LAUNCH_PLATFORMS.find((p) => p.id === selectedId) ?? null : null;
  const selectedRecord = selected ? getLaunchRecord(selected.id) ?? null : null;

  const refresh = () => setRecords([...getLaunchRecords()]);

  const copy = async (label: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setMessage(`Copied ${label} to the clipboard.`);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setMessage('The browser refused clipboard access — select the text and copy it manually.');
    }
  };

  const prepareProfile = (platform: LaunchPlatform) => {
    const res = updateLaunchRecord({
      platformId: platform.id,
      actorId: 'super-admin:founder',
      patch: { profileStatus: 'prepared' },
      reason: 'Profile package prepared in the Launch Centre',
    });
    if (res.ok) {
      refresh();
      setMessage(
        `${platform.name}: profile package prepared. Verify the requirements page before submitting.`
      );
    } else setMessage(res.error);
  };

  const submit = (platform: LaunchPlatform) => {
    const res = markLaunchSubmitted({ platformId: platform.id, actorId: 'super-admin:founder' });
    if (res.ok) {
      refresh();
      setMessage(`${platform.name}: marked submitted (recorded in the audit trail).`);
    } else setMessage(res.error);
  };

  return (
    <div className="space-y-4" data-testid="launch-centre">
      <Card>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Megaphone className="w-4 h-4" /> Mercenta Launch Centre
            </h2>
            <p className="text-ds-label text-zinc-500 mt-1">{LAUNCH_CENTRE_DISCLAIMER}</p>
          </div>
          <Button variant="tertiary" className="text-xs" onClick={() => setEditingProfile((v) => !v)}>
            {editingProfile ? 'Close profile editor' : 'Modify launch copy'}
          </Button>
        </div>
        <div className="grid gap-2 sm:grid-cols-4 mt-4 text-ds-label">
          <div className="rounded-lg border border-white/[0.06] bg-ink-850 px-2.5 py-2">
            <p className="text-ds-micro text-zinc-500">Platforms</p>
            <p className="text-sm font-bold text-white">{summary.total}</p>
          </div>
          <div className="rounded-lg border border-white/[0.06] bg-ink-850 px-2.5 py-2">
            <p className="text-ds-micro text-zinc-500">Accounts created</p>
            <p className="text-sm font-bold text-white">{summary.accountsCreated}</p>
          </div>
          <div className="rounded-lg border border-white/[0.06] bg-ink-850 px-2.5 py-2">
            <p className="text-ds-micro text-zinc-500">Profiles prepared</p>
            <p className="text-sm font-bold text-white">{summary.prepared}</p>
          </div>
          <div className="rounded-lg border border-white/[0.06] bg-ink-850 px-2.5 py-2">
            <p className="text-ds-micro text-zinc-500">Submitted</p>
            <p className="text-sm font-bold text-white">{summary.submitted}</p>
          </div>
        </div>
        {message && <p className="text-ds-micro text-emerald-300/90 mt-2">{message}</p>}
      </Card>

      {editingProfile && (
        <Card>
          <h3 className="text-xs font-semibold text-white">Launch copy</h3>
          <div className="grid gap-2 mt-2">
            <Input
              label="Tagline"
              value={profile.tagline}
              onChange={(e) => setProfile({ ...profile, tagline: e.target.value })}
            />
            <label className="text-ds-micro text-zinc-500">Short description</label>
            <textarea
              className="w-full bg-ink-850 border border-white/[0.08] rounded-lg px-2 py-1.5 text-ds-label text-zinc-200"
              rows={2}
              value={profile.shortDescription}
              onChange={(e) => setProfile({ ...profile, shortDescription: e.target.value })}
            />
            <label className="text-ds-micro text-zinc-500">Long description</label>
            <textarea
              className="w-full bg-ink-850 border border-white/[0.08] rounded-lg px-2 py-1.5 text-ds-label text-zinc-200"
              rows={5}
              value={profile.longDescription}
              onChange={(e) => setProfile({ ...profile, longDescription: e.target.value })}
            />
            <Input
              label="Categories (comma separated)"
              value={profile.categories.join(', ')}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  categories: e.target.value.split(',').map((c) => c.trim()),
                })
              }
            />
            <Input
              label="Website"
              value={profile.website}
              onChange={(e) => setProfile({ ...profile, website: e.target.value })}
            />
            <Button
              variant="tertiary"
              className="text-xs w-fit"
              onClick={() => copy('launch copy', buildSubmissionPackage(LAUNCH_PLATFORMS[0], profile))}
            >
              <Copy className="w-3 h-3" /> Copy the package copy
            </Button>
          </div>
        </Card>
      )}
<Card className="p-0 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b bg-ink-850/50">
              {['Platform', 'Channel', 'Account', 'Profile', 'Requirements', 'Actions'].map((h) => (
                <th key={h} className="px-2 py-1.5 text-left text-zinc-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {LAUNCH_PLATFORMS.map((p) => {
              const r = records.find((x) => x.platformId === p.id);
              const done = r ? launchPlatformIsComplete(r) : false;
              return (
                <tr
                  key={p.id}
                  data-testid="launch-platform-row"
                  onClick={() => setSelectedId(p.id)}
                  className="border-b cursor-pointer hover:bg-white/[0.03]"
                >
                  <td className="px-2 py-1.5 font-medium text-white">{p.name}</td>
                  <td className="px-2 py-1.5 text-zinc-400 text-ds-micro">
                    {CHANNEL_LABEL[p.submissionChannel]}
                  </td>
                  <td className="px-2 py-1.5 text-zinc-300 text-ds-micro">
                    {r?.accountStatus ?? 'not_started'}
                  </td>
                  <td className="px-2 py-1.5 text-ds-micro">
                    <span className={done ? 'text-emerald-300' : 'text-zinc-400'}>
                      {r?.profileStatus ?? 'not_prepared'}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-ds-micro text-amber-300/80">verify on platform</td>
                  <td className="px-2 py-1.5">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="tertiary"
                        className="text-ds-micro px-2 py-1"
                        onClick={() => {
                          prepareProfile(p);
                        }}
                      >
                        Prepare Profile
                      </Button>
                      <Button
                        variant="tertiary"
                        className="text-ds-micro px-2 py-1"
                        onClick={() => {
                          setSelectedId(p.id);
                          setEditingProfile(true);
                        }}
                      >
                        Modify
                      </Button>
                      <Button
                        variant="tertiary"
                        className="text-ds-micro px-2 py-1"
                        onClick={() => {
                          void copy(`${p.name} package`, buildSubmissionPackage(p, profile));
                        }}
                      >
                        {copied === `${p.name} package` ? (
                          <Check className="w-3 h-3" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}{' '}
                        Copy
                      </Button>
                      <a
                        href={p.requirementsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-ds-micro text-zinc-400 hover:text-zinc-200 px-1 inline-flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="w-3 h-3" /> Open
                      </a>
                      <Button
                        variant="tertiary"
                        className="text-ds-micro px-2 py-1"
                        onClick={() => {
                          submit(p);
                        }}
                      >
                        Mark Submitted
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {selected && selectedRecord && (
        <Card>
          <h3 className="text-xs font-semibold text-white">
            {selected.name}
            <span className="ml-2 text-ds-micro font-normal text-zinc-500">
              {CHANNEL_LABEL[selected.submissionChannel]} · requirements{' '}
              {selected.requirementsVerified ? 'verified' : 'NOT yet verified'}
            </span>
          </h3>
          <p className="text-ds-micro text-zinc-500 mt-1">{selected.audience}</p>

          <div className="mt-2 space-y-1">
            {buildSubmissionChecklist(selected, selectedRecord).map((item) => (
              <p key={item.label} className="text-ds-micro text-zinc-400">
                <span className={item.done ? 'text-emerald-300' : 'text-amber-300'}>
                  {item.done ? '✓' : '○'}
                </span>{' '}
                {item.label}
                {item.verifyOnPlatform && (
                  <span className="text-zinc-600"> — must be read on the platform itself</span>
                )}
              </p>
            ))}
          </div>

          <div className="mt-2 flex items-center gap-2">
            <a
              href={selected.siteUrl}
              target="_blank"
              rel="noreferrer"
              className="text-ds-micro text-zinc-400 hover:text-zinc-200 inline-flex items-center gap-1"
            >
              <ExternalLink className="w-3 h-3" /> Open {selected.name}
            </a>
            <a
              href={selected.signupUrl}
              target="_blank"
              rel="noreferrer"
              className="text-ds-micro text-zinc-400 hover:text-zinc-200 inline-flex items-center gap-1"
            >
              <ExternalLink className="w-3 h-3" /> Sign up / submit
            </a>
          </div>

          <p className="text-ds-micro text-zinc-500 mt-2">Submission package (copyable)</p>
          <pre className="mt-1 whitespace-pre-wrap bg-ink-900 border border-white/[0.06] rounded-lg p-2 text-ds-micro text-zinc-300 max-h-64 overflow-y-auto">
            {buildSubmissionPackage(selected, profile)}
          </pre>
        </Card>
      )}
    </div>
  );
}

export default LaunchCentre;