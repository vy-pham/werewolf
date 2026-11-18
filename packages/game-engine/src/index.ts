// Pure, deterministic rules engine. No I/O here — see docs/03-technical-design.md §4.
// The reducer (createGame / validate / apply / advancePhase / projectFor / voicePermissions)
// is built in milestone M1.
export * from './role-set';
export * from './winner';
