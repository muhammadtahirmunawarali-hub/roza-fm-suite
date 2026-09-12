'use client';

// FMCore ERP — Flow Guidance (A>B>C>D for each page)
// Shows step-by-step workflow for each major section of the ERP.
import { useState } from 'react';
import { ChevronDown, ChevronRight, Workflow, ClipboardList, Wrench, Shield, Package, Users, BarChart3 } from 'lucide-react';

const FLOWS = [
  {
    id: 'workorders',
    title: 'Maintenance Work Orders',
    icon: <Wrench className="w-4 h-4" />,
    color: '#F59E0B',
    steps: [
      { step: 'A', action: 'Create Work Order', detail: 'Click "Add Record" → fill Date, Building, Asset, Fault Description, Priority' },
      { step: 'B', action: 'Assign Technician', detail: 'Set "Assigned To" field → record auto-stamps "Assigned At"' },
      { step: 'C', action: 'Start Work', detail: 'Change WO Stage to "In Progress" → auto-stamps "Started At"' },
      { step: 'D', action: 'Upload Before/After Photos', detail: 'Use "Before Image" + "After Image" fields to upload photos' },
      { step: 'E', action: 'Complete', detail: 'Change WO Stage to "Completion" → fill "Completion Notes" → auto-stamps "Completed At"' },
      { step: 'F', action: 'Close', detail: 'Change WO Stage to "Closed" → auto-stamps "Closed At"' },
    ],
  },
  {
    id: 'pm',
    title: 'Preventive Maintenance',
    icon: <ClipboardList className="w-4 h-4" />,
    color: '#10B981',
    steps: [
      { step: 'A', action: 'Create PM Schedule', detail: 'Add Equipment, Frequency (Daily/Weekly/Monthly), Next Due date' },
      { step: 'B', action: 'Assign Technician', detail: 'Set "Technician" + "Assigned To" fields' },
      { step: 'C', action: 'Execute PM', detail: 'Open the PM record → change WO Stage to "In Progress"' },
      { step: 'D', action: 'Use Checklist', detail: 'Link a checklist → fill pass criteria → upload completion photos' },
      { step: 'E', action: 'Complete + Close', detail: 'Change to "Completion" → add notes → close' },
    ],
  },
  {
    id: 'ptw',
    title: 'Permit To Work (PTW)',
    icon: <Shield className="w-4 h-4" />,
    color: '#EF4444',
    steps: [
      { step: 'A', action: 'Create PTW', detail: 'Fill Contractor, Work Type, Location, Start/End Date' },
      { step: 'B', action: 'Submit for Approval', detail: 'Change Status to "Submitted" → Manager gets notification' },
      { step: 'C', action: 'Manager Approves', detail: 'Manager clicks "Flow" → approves → status becomes "Approved"' },
      { step: 'D', action: 'Work Execution', detail: 'Contractor does the work → uploads photos + checklist' },
      { step: 'E', action: 'Close PTW', detail: 'Change status to "Closed" → audit trail recorded' },
    ],
  },
  {
    id: 'inventory',
    title: 'Inventory & Stock Movement',
    icon: <Package className="w-4 h-4" />,
    color: '#10B981',
    steps: [
      { step: 'A', action: 'Add Inventory Item', detail: 'Create record: Item Name, Current Stock, Minimum Level, Unit Price' },
      { step: 'B', action: 'Material Request', detail: 'Create Material Request → link to inventory item + quantity' },
      { step: 'C', action: 'Stock Movement', detail: 'Use Stock Movement API → reduces inventory → audit trail' },
      { step: 'D', action: 'Low Stock Alert', detail: 'When stock < minimum → notification + AI predictive insight' },
      { step: 'E', action: 'Reorder', detail: 'Create Purchase Request → link to vendor → approve → receive' },
    ],
  },
  {
    id: 'assets',
    title: 'Asset Management',
    icon: <Package className="w-4 h-4" />,
    color: '#8B5CF6',
    steps: [
      { step: 'A', action: 'Register Asset', detail: 'Add Asset Name, Category, Building, Floor, Location, Value' },
      { step: 'B', action: 'Set Maintenance Frequency', detail: 'Fill "Maintenance Frequency" + "Default Checklist" + "Next Maintenance Due"' },
      { step: 'C', action: 'Upload Product Image', detail: 'Use "Product Image" field to upload a photo of the asset' },
      { step: 'D', action: 'Track Maintenance', detail: 'When WO is created for this asset → "Last Maintenance Date" auto-updates' },
      { step: 'E', action: 'Dispose', detail: 'Change status to "Disposed" → moves to recycle bin if deleted' },
    ],
  },
  {
    id: 'safety',
    title: 'Safety Inspection',
    icon: <Shield className="w-4 h-4" />,
    color: '#EF4444',
    steps: [
      { step: 'A', action: 'Schedule Inspection', detail: 'Create record: Area, Inspector, Type, Date' },
      { step: 'B', action: 'Conduct Inspection', detail: 'Fill Findings, Risk Level, Action Required' },
      { step: 'C', action: 'Upload Photos', detail: 'Use image fields to upload inspection photos' },
      { step: 'D', action: 'Assign Corrective Action', detail: 'Create a Work Order linked to the inspection finding' },
      { step: 'E', action: 'Close Inspection', detail: 'Change status to "Completed" → audit trail recorded' },
    ],
  },
  {
    id: 'pur_req',
    title: 'Purchase Request → PO → Receiving',
    icon: <BarChart3 className="w-4 h-4" />,
    color: '#10B981',
    steps: [
      { step: 'A', action: 'Create Purchase Request', detail: 'Fill Date, Requested By, Description, Estimated Cost, Priority' },
      { step: 'B', action: 'Approve PR', detail: 'Manager clicks "Flow" → approves → status becomes "Approved"' },
      { step: 'C', action: 'Create PO', detail: 'Create Purchase Order linked to the approved PR → select Vendor' },
      { step: 'D', action: 'Receive Goods', detail: 'Create Store Issue Voucher → update inventory stock' },
      { step: 'E', action: 'Audit Trail', detail: 'All steps recorded in Audit Logs + AI predictive insights' },
    ],
  },
];

export function FlowGuidance() {
  const [expanded, setExpanded] = useState<string | null>('workorders');

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Workflow className="w-5 h-5 text-[var(--erp-accent)]" />
        <div>
          <h2 className="text-[15px] font-semibold text-[var(--erp-text)]">Flow Guidance (A → B → C → D)</h2>
          <p className="text-[11px] text-[var(--erp-text-muted)]">Step-by-step workflow for each section of the ERP</p>
        </div>
      </div>

      <div className="space-y-2">
        {FLOWS.map((flow) => {
          const isExpanded = expanded === flow.id;
          return (
            <div key={flow.id} className="rounded-lg border border-[var(--erp-border)] bg-[var(--erp-bg-card)] overflow-hidden">
              <button
                onClick={() => setExpanded(isExpanded ? null : flow.id)}
                className="w-full flex items-center gap-3 p-3 hover:bg-[var(--erp-bg-hover)] transition-colors"
              >
                <span style={{ color: flow.color }}>{flow.icon}</span>
                <span className="text-[13px] font-semibold text-[var(--erp-text)] flex-1 text-left">{flow.title}</span>
                {isExpanded ? <ChevronDown className="w-4 h-4 text-[var(--erp-text-muted)]" /> : <ChevronRight className="w-4 h-4 text-[var(--erp-text-muted)]" />}
              </button>
              {isExpanded && (
                <div className="border-t border-[var(--erp-border)] p-3 bg-[var(--erp-bg-input)] space-y-2">
                  {flow.steps.map((s, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                        style={{ background: flow.color }}
                      >
                        {s.step}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] font-semibold text-[var(--erp-text)]">{s.action}</div>
                        <div className="text-[10px] text-[var(--erp-text-muted)] mt-0.5">{s.detail}</div>
                      </div>
                      {idx < flow.steps.length - 1 && (
                        <div className="text-[var(--erp-text-muted)] text-[10px]">↓</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
