import { useMemo, useState } from 'react';
import { ALL_TOUR_DEFINITIONS } from '@/config/tours/tourDefinitions';
import { AdminUsertourView, type TourStatusFilter } from './AdminUsertourView';

export function AdminUsertourScreen() {
  const [tourQuery, setTourQuery] = useState('');
  const [tourStatus, setTourStatus] = useState<TourStatusFilter>('all');

  const totalTours = ALL_TOUR_DEFINITIONS.length;
  const publishedCount = ALL_TOUR_DEFINITIONS.filter((t) => t.autoStart).length;
  const requiredCount = ALL_TOUR_DEFINITIONS.filter((t) => t.forceFirst).length;
  const draftCount = totalTours - publishedCount;

  const visibleTours = useMemo(() => {
    const q = tourQuery.trim().toLowerCase();
    return ALL_TOUR_DEFINITIONS.filter((t) => {
      if (tourStatus === 'published' && !t.autoStart) return false;
      if (tourStatus === 'draft' && t.autoStart) return false;
      if (tourStatus === 'required' && !t.forceFirst) return false;
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q) ||
        (t.description ?? '').toLowerCase().includes(q)
      );
    });
  }, [tourQuery, tourStatus]);

  return (
    <AdminUsertourView
      totalTours={totalTours}
      publishedCount={publishedCount}
      requiredCount={requiredCount}
      draftCount={draftCount}
      tours={visibleTours}
      tourQuery={tourQuery}
      onTourQueryChange={setTourQuery}
      tourStatus={tourStatus}
      onTourStatusChange={setTourStatus}
      onResetFilters={() => {
        setTourQuery('');
        setTourStatus('all');
      }}
    />
  );
}
