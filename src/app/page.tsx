'use client';

import { ErpShell } from '@/components/erp/erp-shell';

export default function Home() {
  // Mount the ERP shell — it self-initializes via API routes.
  // ErpShell is a client component that loads everything via fetch.
  return <ErpShell />;
}
