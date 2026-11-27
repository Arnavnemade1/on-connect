// Communication guideline matrix (spec 22.3): one evidence row per developmental profile × situation, plus cross-cutting rows.
// Rows were compiled by the student researcher from published guidance and imported unchanged from the project spreadsheet.
// The words-to-avoid patterns were transcribed by hand from each row's "Don't do" column.
// Journal references were checked against Crossref on 2026-11-27 (each DOI resolves; title, authors and year match). Institutional
// documents could not be checked automatically and are marked. Existence was checked, not whether each page says exactly what the row says.
import data from "@/data/guidelines.json";
import type { Level } from "./content";

export type GTopic = "diagnosis" | "mri" | "ct" | "ultrasound" | "bloodtest" | "catheter" | "biopsy" | "embolization" | "ablation" | "emotions" | "teachback" | "caregivers" | "language" | "scope";
export interface Guideline { id: string; age: Level | "all"; topic: GTopic; situation: string; crossCutting: boolean; rule: string; dont: string; example: string; source: string; refs: string[]; type: string; noSpecificEvidence: boolean; avoid: { pattern: string; phrase: string }[]; }
export const GUIDELINE_VERSION = "guidelines-2.0";
export const GUIDELINES = data.rows as Guideline[];
export const GUIDELINE_BY_ID = Object.fromEntries(GUIDELINES.map(g => [g.id, g])) as Record<string, Guideline>;
export const SITUATIONS: { id: GTopic; label: string }[] = [["diagnosis", "Understanding a diagnosis"], ["mri", "MRI"], ["ct", "CT"], ["ultrasound", "Ultrasound"], ["bloodtest", "Blood test"], ["catheter", "Catheter / port"], ["biopsy", "Biopsy"], ["embolization", "Embolization"], ["ablation", "Tumor ablation"]].map(([id, label]) => ({ id: id as GTopic, label }));

export interface GRef { key: string; cite: string; doi?: string; verified: "crossref" | "institutional"; }
export const GREFS: GRef[] = [
  { key: "bibace80", cite: "Bibace, R., & Walsh, M. E. (1980). Development of children's concepts of illness. Pediatrics, 66(6), 912–917.", doi: "10.1542/peds.66.6.912", verified: "crossref" },
  { key: "aap21", cite: "Romito, B., Jewell, J., Jackson, M., et al. (2021). Child Life Services. Pediatrics, 147(1).", doi: "10.1542/peds.2020-040261", verified: "crossref" },
  { key: "debie10", cite: "de Bie, H. M. A., Boersma, M., Wattjes, M. P., et al. (2010). Preparing children with a mock scanner training protocol results in high quality structural and functional MRI scans. European Journal of Pediatrics, 169(9), 1079–1085.", doi: "10.1007/s00431-010-1181-z", verified: "crossref" },
  { key: "birnie18", cite: "Birnie, K. A., Noel, M., Chambers, C. T., et al. (2018). Psychological interventions for needle-related procedural pain and distress in children and adolescents. Cochrane Database of Systematic Reviews, CD005179.", doi: "10.1002/14651858.cd005179.pub4", verified: "crossref" },
  { key: "flowers15", cite: "Flowers, S. R., & Birnie, K. A. (2015). Procedural preparation and support as a standard of care in pediatric oncology. Pediatric Blood & Cancer, 62(S5).", doi: "10.1002/pbc.25813", verified: "crossref" },
  { key: "inan19", cite: "İnan, G., & İnal, S. (2019). The impact of 3 different distraction techniques on the pain and anxiety levels of children during venipuncture. The Clinical Journal of Pain, 35(2), 140–147.", doi: "10.1097/ajp.0000000000000666", verified: "crossref" },
  { key: "wiener15", cite: "Wiener, L., Kazak, A. E., Noll, R. B., et al. (2015). Standards for the psychosocial care of children with cancer and their families: An introduction to the special issue. Pediatric Blood & Cancer, 62(S5).", doi: "10.1002/pbc.25675", verified: "crossref" },
  { key: "gerhardt15", cite: "Gerhardt, C. A., Lehmann, V., Long, K. A., et al. (2015). Supporting siblings as a standard of care in pediatric oncology. Pediatric Blood & Cancer, 62(S5).", doi: "10.1002/pbc.25821", verified: "crossref" },
  { key: "thompson15", cite: "Thompson, A. L., & Young-Saleme, T. K. (2015). Anticipatory guidance and psychoeducation as a standard of care in pediatric oncology. Pediatric Blood & Cancer, 62(S5).", doi: "10.1002/pbc.25721", verified: "crossref" },
  { key: "nccn23", cite: "Bhatia, S., Pappo, A. S., et al. (2023). Adolescent and Young Adult (AYA) Oncology, Version 2.2024, NCCN Clinical Practice Guidelines in Oncology. Journal of the National Comprehensive Cancer Network, 21(8), 851–880.", doi: "10.6004/jnccn.2023.0040", verified: "crossref" },
  { key: "ahrq", cite: "Agency for Healthcare Research and Quality. Health Literacy Universal Precautions Toolkit (Tools 5 and 9).", verified: "institutional" },
  { key: "pemat", cite: "Agency for Healthcare Research and Quality. Patient Education Materials Assessment Tool (PEMAT).", verified: "institutional" },
  { key: "cdc", cite: "Centers for Disease Control and Prevention. CDC Clear Communication Index.", verified: "institutional" },
  { key: "nci", cite: "National Cancer Institute. Children with Cancer: A Guide for Parents; sibling booklets.", verified: "institutional" },
  { key: "cog", cite: "Children's Oncology Group. Family Handbook.", verified: "institutional" },
  { key: "aclp24", cite: "Association of Child Life Professionals. ACLP Bulletin (Fall 2024), “Supporting Children Through a Port Access.”", verified: "institutional" },
  { key: "rch", cite: "The Royal Children's Hospital Melbourne. Procedural Pain Management clinical guideline.", verified: "institutional" },
  { key: "upmc", cite: "UPMC Children's Hospital of Pittsburgh. Image-guided biopsies (patient education).", verified: "institutional" },
  { key: "mountsinai", cite: "Mount Sinai. Pediatric surgery preparation guide (patient education).", verified: "institutional" },
  { key: "nationwide", cite: "Nationwide Children's Hospital. Implanted port guide (patient education).", verified: "institutional" },
];
export const GREF_BY_KEY = Object.fromEntries(GREFS.map(r => [r.key, r])) as Record<string, GRef>;
/** Evidence strength from the row's type, highest first: systematic review, study, guideline, expert opinion or patient education. */
export const strength = (g: Guideline) => g.noSpecificEvidence ? "No specific evidence (fallback)" : /systematic/i.test(g.type) ? "Systematic review" : /study/i.test(g.type) ? "Study" : /guideline/i.test(g.type) ? "Guideline" : "Expert opinion";

const TOPIC_ALIAS: Record<string, GTopic> = { diagnosis: "diagnosis", mri: "mri", ct: "ct", ultrasound: "ultrasound", bloodtest: "bloodtest", catheter: "catheter", biopsy: "biopsy", embolization: "embolization", ablation: "ablation" };
export interface GuidanceCtx { emotion?: boolean; caregiver?: boolean; nonEnglish?: boolean; }
/** Rows that apply to this reader and topic: the profile × situation cell, plus the cross-cutting rows that fit the context. */
export function guidanceFor(level: Level, topicId: string | null, ctx: GuidanceCtx = {}): Guideline[] {
  const t = topicId ? TOPIC_ALIAS[topicId] : undefined;
  const cell = t ? GUIDELINES.filter(g => g.age === level && g.topic === t) : [];
  const cross = GUIDELINES.filter(g => g.crossCutting && (g.topic === "scope" || g.topic === "teachback" || (g.topic === "emotions" && ctx.emotion) || (g.topic === "caregivers" && ctx.caregiver) || (g.topic === "language" && ctx.nonEnglish)));
  return [...cell, ...cross];
}

/** Prompt block. The rows are written for clinicians, so the model is told to turn them into what the reader hears, not what staff must do. */
export function guidancePrompt(rows: Guideline[]): string {
  if (!rows.length) return "";
  const avoid = [...new Set(rows.flatMap(g => g.avoid.map(a => a.phrase)))];
  return `\n\nCommunication guidance from the evidence matrix (${GUIDELINE_VERSION}). It is written for clinicians and child life specialists: use it to decide what to tell this reader and how, especially what they will see, hear and feel. Do not promise hospital-specific practices (numbing cream, mock scanners, choices of mask); say the reader can ask their care team whether these are available.\n${rows.map(g => `[${g.id}] ${g.situation}${g.crossCutting ? "" : ` (ages ${g.age})`}: ${g.rule}\nAvoid: ${g.dont}\nExample of the right tone (do not copy word for word): "${g.example}"`).join("\n")}${avoid.length ? `\nNever use these words or phrases: ${avoid.map(a => `"${a}"`).join(", ")}.` : ""}`;
}

export interface WordingHit { id: string; phrase: string; match: string; }
/** Checks an answer for the words and phrases the applicable rows say to avoid. */
export function wordingCheck(text: string, rows: Guideline[]): WordingHit[] {
  const plain = text.replace(/\*\*|__/g, "").replace(/[’‘]/g, "'"); const hits: WordingHit[] = [];
  for (const g of rows) for (const a of g.avoid) { const m = plain.match(new RegExp(a.pattern, "i")); if (m) hits.push({ id: g.id, phrase: a.phrase, match: m[0] }); }
  return hits;
}
