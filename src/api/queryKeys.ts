export const queryKeys = {
  jurisdictionProfiles: () => ["jurisdiction-profiles"] as const,
  document: (editionId: string) => ["document", editionId] as const,
  editions: (editionId: string) => ["editions", editionId] as const,
  chapter: (editionId: string, ref: string) => ["chapter", editionId, ref] as const,
  annex: (editionId: string, annexId: string) => ["annex", editionId, annexId] as const,
  comments: (editionId: string) => ["comments", editionId] as const,
  jurisdictionAppendix: (editionId: string, appendixId: string) => ["jurisdiction-appendix", editionId, appendixId] as const,
};
