/** Demo values only — clearly not real customer data (see App.tsx "Prototype" flag). */
export const DOSAGE_FORM_OPTIONS = [
  "Tablets",
  "Capsules",
  "Oral liquids",
  "Small-volume injectables",
  "Large-volume injectables",
  "Creams & ointments",
  "Suppositories",
  "Powders for reconstitution",
];

export const INITIAL_VALUES: Record<string, unknown> = {
  mfgLegalNameAddress: "Danadams Pharmaceutical Ind. Ltd — Plot 14, Kaase Industrial Area, Kumasi, Ghana",
  siteBuildingsList: [
    { buildingName: "Building A — Solid Dosage", streetAddress: "Plot 14A, Kaase Industrial Area" },
    { buildingName: "Building B — Warehouse", streetAddress: "Plot 14B, Kaase Industrial Area" },
  ],
  emergencyContactName: "Ama Owusu, Head of Quality",
  emergencyContactPhone: "+233 24 555 0110",
  siteGeoIdentification: { lat: "6.6666", lng: "-1.6163", dunsNumber: "", otherIdentifier: "" },
  mfgAuthorityNotIssued: { toggle: false, text: "" },
  mfgAuthorizationFile: [{ name: "manufacturing-authorization-2024.pdf", size: "482 KB" }],
  authorizedActivitiesDescription:
    "Manufacture and packaging of solid oral dosage forms (tablets, capsules) for human use, for domestic distribution and export to ECOWAS member states.",
  productsManufacturedOnSite: ["Tablets", "Capsules"],
  hasInspectionHistory: "Yes",
  gmpInspectionHistory: [{ inspectionDate: "2024-03-12", authority: "Ghana FDA", country: "Ghana", outcome: "Minor findings" }],
  currentGmpCertificateFile: [{ name: "gmp-certificate-2024.pdf", size: "210 KB" }],
  nonPharmaActivitiesDescription: "None.",
  siteSizeBuildingsTable: [{ buildingName: "Building A", sizeSqm: "1200", marketDestination: "Ghana, ECOWAS" }],
  manufacturingAreaPlanFile: [{ name: "site-plan-buildingA.pdf", size: "1.1 MB" }],
  productionAreaLayoutsFile: [{ name: "production-layout-r3.pdf", size: "3.4 MB" }],
  hvacAirSupplyPrinciples:
    "Single-pass HEPA-filtered air supply to Grade D production areas; unidirectional flow limited to dispensing booths.",
  hvacTemperatureRange: { min: "20", max: "24" },
  hvacHumidityRange: { min: "40", max: "60" },
  hvacPressureDifferentials: "10",
  hvacAirChangeRate: "20",
  hvacRecirculationPercent: "70",
  waterSystemGrade: "Purified water",
  waterSystemGradeDetails: "Single-pass RO + EDI loop, ambient temperature, continuously recirculated.",
  waterSystemSchematicFile: [{ name: "water-system-schematic.pdf", size: "640 KB" }],
  labEquipmentList: [
    { equipmentName: "Tablet compression machine", model: "Cadmach CMB4-27", location: "Production Room 2", isCritical: "Yes" },
  ],
};

/** One authored guidance sentence per chapter, citing the TRS 961 Annex 14
 * clause the open chapter maps to — same role as the mockup's Guidance
 * card ("Per WHO GMP Ch.11, ..."), populated per chapter instead of
 * hardcoded to one module. */
export const CHAPTER_GUIDANCE: Record<number, string> = {
  1: "Per TRS 961 Annex 14 §1, general site information must let an inspector identify the legal manufacturer, every production building on site, and a 24-hour contact for product defects or recalls without needing a site visit first.",
  2: "Per TRS 961 Annex 14 §2, the quality management system description must cover the standards referenced, the Authorized Person's role in batch release, and the site's approach to quality risk management — not just list document titles.",
  3: "Per TRS 961 Annex 14 §3, personnel information is limited to organizational structure and headcount by function; individual CVs and training records live in the platform's Training module, not the SMF.",
  4: "Per TRS 961 Annex 14 §4, premises and equipment must be described with room classification, pressure differentials, and utility systems (HVAC, water) sufficient for an inspector to assess GMP compliance from the document alone.",
  5: "Per TRS 961 Annex 14 §5, the documentation system description should state whether records are electronic, manual, or hybrid, and disclose any off-site archive location and retrieval time.",
  6: "Per TRS 961 Annex 14 §6, production information covers dosage forms manufactured, validation policy, and materials handling arrangements — cross-reference Annex 2 for the authoritative dosage form list rather than re-typing it here.",
  7: "Per TRS 961 Annex 14 §7, quality control scope (physical, chemical, microbiological, biological) is described narratively; detailed test methods belong in site SOPs, not the SMF.",
  8: "Per TRS 961 Annex 14 §8, distribution and recall arrangements must show how the site verifies a recipient's legal entitlement to receive medicinal products and prevents entry into the illegal supply chain.",
  9: "Per TRS 961 Annex 14 §9, the self-inspection system description covers area-selection criteria and follow-up — this should cross-reference the platform's own Self-Inspection module where the actual programme is tracked.",
};
