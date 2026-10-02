import fs from 'fs';

const slices = [
  { name: 'init', start: 289, end: 331 },
  { name: 'palette', start: 332, end: 449 },
  { name: 'nodes', start: 450, end: 1022 },
  { name: 'cables_conn', start: 1023, end: 1356 },
  { name: 'cables_route', start: 1357, end: 2372 },
  { name: 'cables_bridges', start: 2373, end: 3243 },
  { name: 'canvas_events', start: 3244, end: 3639 },
  { name: 'nodes_drag', start: 3640, end: 3883 },
  { name: 'cable_modal', start: 3884, end: 4545 },
  { name: 'inspector', start: 4546, end: 5859 },
  { name: 'zones', start: 5860, end: 6286 },
  { name: 'underlay', start: 6287, end: 6560 },
  { name: 'layers', start: 6561, end: 6611 },
  { name: 'search', start: 6612, end: 6731 },
  { name: 'ip_inventory', start: 6732, end: 7114 },
  { name: 'audit_ping', start: 7115, end: 7183 },
  { name: 'audit_linter', start: 7184, end: 7392 },
  { name: 'topbar_dropdowns', start: 7393, end: 7408 },
  { name: 'sheets', start: 7409, end: 8003 },
  { name: 'projects_storage', start: 8004, end: 8126 },
  { name: 'history', start: 8127, end: 8394 },
  { name: 'filesystem', start: 8395, end: 8794 },
  { name: 'pdf_export', start: 8795, end: 10512 },
  { name: 'svg_export', start: 10513, end: 11102 },
  { name: 'default_topology', start: 11103, end: 11237 },
  { name: 'canvas_guides', start: 11238, end: 11313 },
  { name: 'canvas_minimap', start: 11314, end: 11555 },
  { name: 'topbar_view_menu', start: 11556, end: 11613 },
  { name: 'bom', start: 11614, end: 11951 },
  { name: 'topbar_events', start: 11952, end: 12631 },
  { name: 'sidebars', start: 12632, end: 12739 },
  { name: 'shortcuts', start: 12740, end: 12919 },
  { name: 'utils', start: 12920, end: 12951 }
];

console.log('Total slices:', slices.length);
let expectedNext = 289;
let hasGaps = false;

for (const s of slices) {
  if (s.start !== expectedNext) {
    console.error(`GAP or OVERLAP at ${s.name}: expected ${expectedNext}, got ${s.start}`);
    hasGaps = true;
  }
  expectedNext = s.end + 1;
}

if (!hasGaps) {
  console.log(`PERFECT CONTINUITY! All lines from 289 to ${expectedNext - 1} are covered without a single missing line or overlap.`);
}
