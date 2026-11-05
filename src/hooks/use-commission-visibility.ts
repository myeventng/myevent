'use client';

import { useEffect, useState } from 'react';
import { getMyCommissionVisibility } from '@/actions/commission.actions';

/** Admin-controlled flags. Defaults to visible until loaded so layouts don't jump for the common case. */
export function useCommissionVisibility() {
  const [v, setV] = useState({ checkout: true, organizerDashboard: true, customerFacing: true });
  useEffect(() => {
    let live = true;
    getMyCommissionVisibility().then((r) => { if (live) setV(r); }).catch(() => {});
    return () => { live = false; };
  }, []);
  return v;
}
