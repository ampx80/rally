// Shared helpers for the canonical field registry seeds.
// f() builds one system field definition; sec() stamps a section
// name + field order onto a block of definitions.
// Definition shape (spec Section 5.1):
//   { key, label, type, section, fieldOrder, system: true,
//     picklist?  - id into PICKLISTS (picklists.js)
//     options?   - inline option list when no shared picklist exists
//     linkTarget? - object type for link fields
//     multi?     - link/user/email/url fields that hold many values
//     required?  - create-level required (rare by design)
//     computed?  - system-computed, write-locked
//     defaultVisible? - shows uncollapsed in editors and default views
//     storeKey?  - legacy store column name when it differs from key }
export const f = (key, label, type, extra = {}) => ({ key, label, type, system: true, ...extra });
export const sec = (section, defs) => defs.map((d, i) => ({ ...d, section, fieldOrder: i }));
