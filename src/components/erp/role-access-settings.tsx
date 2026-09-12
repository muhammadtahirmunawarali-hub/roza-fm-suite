'use client';

// FMCore ERP — Role Access Settings
// Shows all roles and their permissions. Super Admin can manage what each role sees.
import { useEffect, useState } from 'react';
import { useErpStore } from '@/lib/erp/store';
import { ROLES } from '@/lib/erp/seed';
import { cn } from '@/lib/utils';
import { Shield, Users, Check, X, Lock, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

const ALL_MODULES = [
  'dashboard', 'meetings', 'attendance', 'toolbox',
  'workorders', 'wo_attachments', 'pm', 'cm', 'gen_log', 'chiller_log', 'elec_insp',
  'safety_insp', 'risk_assess', 'ptw', 'incidents', 'accident', 'fire_equip',
  'assets', 'equipment', 'buildings', 'calibration',
  'vendors', 'contracts', 'mat_req', 'pur_req', 'inventory', 'siv',
  'visitors', 'leave', 'training',
  'housekeeping', 'kpi', 'checklists', 'method_stmt', 'locations',
  'reports', 'audit', 'settings', 'users', 'recycle_bin',
];

const ALL_ACTIONS = ['view', 'create', 'edit', 'delete', 'approve', 'export', 'import'];

export function RoleAccessSettings() {
  const { user } = useErpStore();
  const [expandedRole, setExpandedRole] = useState<string | null>(null);

  return (
    <div className="space-y-4 max-w-[1200px]">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Shield className="w-5 h-5 text-[var(--erp-accent)]" />
        <div>
          <h2 className="text-[15px] font-semibold text-[var(--erp-text)]">Role Access Settings</h2>
          <p className="text-[11px] text-[var(--erp-text-muted)]">Manage what each role can see and do across the system</p>
        </div>
      </div>

      {/* Info banner */}
      <div className="p-3 rounded-md border border-[rgba(59,130,246,0.3)] bg-[rgba(59,130,246,0.05)] text-[11px] text-[var(--erp-text-secondary)]">
        <strong className="text-[#3B82F6]">ℹ️ How it works:</strong> Each role has permissions for specific modules.
        Super Admin has full access to everything. Other roles see only what they're assigned.
        Click a role to expand its permission matrix.
      </div>

      {/* Role cards */}
      <div className="space-y-2">
        {ROLES.map((role) => {
          const isExpanded = expandedRole === role.id;
          const isSuperAdmin = role.id === 'Super Admin';
          
          return (
            <div key={role.id} className="rounded-lg border border-[var(--erp-border)] bg-[var(--erp-bg-card)] overflow-hidden">
              {/* Role header (clickable) */}
              <button
                onClick={() => setExpandedRole(isExpanded ? null : role.id)}
                className="w-full flex items-center gap-3 p-3 hover:bg-[var(--erp-bg-hover)] transition-colors"
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-[12px] font-bold shrink-0"
                  style={{ background: role.color }}
                >
                  {role.name.charAt(0)}
                </div>
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-semibold text-[var(--erp-text)]">{role.name}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[var(--erp-bg-hover)] text-[var(--erp-text-muted)] font-mono">Level {role.level}</span>
                    {isSuperAdmin && <Lock className="w-3 h-3 text-[var(--erp-warning)]" />}
                  </div>
                  <div className="text-[10px] text-[var(--erp-text-muted)]">{role.description}</div>
                </div>
                {isExpanded ? <ChevronDown className="w-4 h-4 text-[var(--erp-text-muted)]" /> : <ChevronRight className="w-4 h-4 text-[var(--erp-text-muted)]" />}
              </button>

              {/* Permission matrix (expanded) */}
              {isExpanded && (
                <div className="border-t border-[var(--erp-border)] p-3 bg-[var(--erp-bg-input)]">
                  {isSuperAdmin ? (
                    <div className="text-center py-4 text-[12px] text-[var(--erp-warning)]">
                      <Lock className="w-5 h-5 mx-auto mb-1" />
                      Super Admin has full access to all modules and actions. Cannot be modified.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-[10px]">
                        <thead>
                          <tr className="border-b border-[var(--erp-border)]">
                            <th className="text-left py-1.5 px-2 text-[var(--erp-text-muted)] uppercase">Module</th>
                            {ALL_ACTIONS.map(action => (
                              <th key={action} className="text-center py-1.5 px-1 text-[var(--erp-text-muted)] uppercase text-[9px]">{action.slice(0, 4)}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {ALL_MODULES.map((mod, idx) => (
                            <tr key={mod} className={cn('border-b border-[var(--erp-border)]/50', idx % 2 === 0 && 'bg-[var(--erp-bg-card)]/50')}>
                              <td className="py-1 px-2 text-[var(--erp-text-secondary)] font-mono text-[10px]">{mod}</td>
                              {ALL_ACTIONS.map(action => {
                                // Simplified: show what each role typically has
                                const hasPermission = getRolePermission(role.id, mod, action);
                                return (
                                  <td key={action} className="text-center py-1 px-1">
                                    {hasPermission ? (
                                      <Check className="w-3 h-3 text-[var(--erp-success)] mx-auto" />
                                    ) : (
                                      <X className="w-3 h-3 text-[var(--erp-text-muted)] mx-auto opacity-30" />
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Role descriptions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {ROLES.map(role => (
          <div key={role.id} className="flex items-center gap-2 p-2 rounded-md border border-[var(--erp-border)] bg-[var(--erp-bg-card)]">
            <div className="w-6 h-6 rounded flex items-center justify-center text-white text-[10px] font-bold shrink-0" style={{ background: role.color }}>
              {role.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-semibold text-[var(--erp-text)]">{role.name}</div>
              <div className="text-[9px] text-[var(--erp-text-muted)] truncate">{role.description}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Helper: returns what permissions each role has for a module+action
function getRolePermission(role: string, module: string, action: string): boolean {
  // Super Admin: full access
  if (role === 'Super Admin' || role === 'Administrator') return true;
  
  // Manager: everything except users/settings
  if (role === 'Manager') {
    return !['users', 'settings'].includes(module);
  }
  
  // Main Contractor: maintenance modules
  if (role === 'Main Contractor') {
    return ['dashboard', 'workorders', 'wo_attachments', 'pm', 'cm', 'assets', 'checklists', 'method_stmt', 'locations', 'reports'].includes(module) 
      && ['view', 'create', 'edit', 'approve', 'export'].includes(action);
  }
  
  // Client Staff: read-only access to key modules
  if (role === 'Client Staff') {
    return ['dashboard', 'workorders', 'pm', 'assets', 'reports'].includes(module) && action === 'view';
  }
  
  // Sub Contractor: assigned WOs only
  if (role === 'Sub Contractor') {
    return ['dashboard', 'workorders', 'wo_attachments', 'checklists'].includes(module) 
      && ['view', 'create', 'edit'].includes(action);
  }
  
  // Accountant: finance modules
  if (role === 'Accountant') {
    return ['dashboard', 'vendors', 'contracts', 'pur_req', 'inventory', 'reports', 'audit'].includes(module);
  }
  
  // Technician: maintenance execution
  if (role === 'Technician') {
    return ['dashboard', 'workorders', 'wo_attachments', 'pm', 'cm', 'gen_log', 'chiller_log', 'elec_insp', 'checklists', 'method_stmt', 'locations'].includes(module)
      && ['view', 'create', 'edit', 'export'].includes(action);
  }
  
  // HR: HR modules
  if (role === 'HR') {
    return ['dashboard', 'attendance', 'visitors', 'leave', 'training', 'reports'].includes(module);
  }
  
  // Storekeeper: inventory
  if (role === 'Storekeeper') {
    return ['dashboard', 'inventory', 'siv', 'mat_req'].includes(module)
      && ['view', 'create', 'edit', 'export'].includes(action);
  }
  
  // Employee: self-service
  if (role === 'Employee') {
    return ['dashboard', 'attendance', 'leave', 'training'].includes(module) && action === 'view';
  }
  
  // Viewer: read-only
  if (role === 'Viewer') {
    return action === 'view';
  }
  
  return false;
}
