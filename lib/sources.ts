// Educational Knowledge Retrieval Engine and source-verification layer (spec 2.2 F, 21.7, 22.4).
// Every source below was fetched on the date in `verified`, returned HTTP 200, and its page title was checked.
// `passages` are short verbatim sentences taken from that page, so a citation can be matched to text that is
// really there. Nothing here is invented. Re-check with `npm run check:sources`.
export type SourceType = "government" | "professional_society" | "pediatric_hospital" | "academic_medical";
export interface Source { id: string; title: string; org: string; url: string; type: SourceType; reviewed: string | null; verified: string; topics: string[]; passages: string[]; }

const V = "2026-11-27";
export const SOURCES: Source[] = [
  { id: "medline-biopsy", title: "Biopsy", org: "MedlinePlus, U.S. National Library of Medicine", url: "https://medlineplus.gov/biopsy.html", type: "government", reviewed: null, verified: V, topics: ["biopsy", "diagnosis"],
    passages: ["A doctor called a pathologist looks at the cells or tissue under a microscope to check for damage or disease.", "In most cases, a biopsy is the only test that can tell for sure if a suspicious area is cancer.", "A needle biopsy removes tissue with a needle passed through your skin to the site of the problem."] },
  { id: "kh-biopsy", title: "Biopsies", org: "Nemours KidsHealth", url: "https://kidshealth.org/en/parents/biopsy.html", type: "pediatric_hospital", reviewed: null, verified: V, topics: ["biopsy"],
    passages: ["A biopsy is when doctors take a sample of tissue or cells for testing.", "Some needle biopsies are done in a radiology department where an ultrasound or CAT scan can show the doctor exactly where to insert the needle."] },
  { id: "nci-diagnosis", title: "Tests and Procedures Used to Diagnose Cancer", org: "National Cancer Institute", url: "https://www.cancer.gov/about-cancer/diagnosis-staging/diagnosis", type: "government", reviewed: null, verified: V, topics: ["diagnosis", "biopsy"],
    passages: ["There is no single test that can diagnose cancer.", "They may order lab tests, imaging tests (scans), or other tests or procedures.", "You may also need a biopsy, which is often the only way to tell for sure if you have cancer."] },
  { id: "medline-ct", title: "CT Scans", org: "MedlinePlus, U.S. National Library of Medicine", url: "https://medlineplus.gov/ctscans.html", type: "government", reviewed: null, verified: V, topics: ["ct"],
    passages: ["Computed tomography (CT) is a type of medical imaging test that uses special x-ray equipment to make detailed pictures of the inside of your body.", "A CT scan produces cross-sectional pictures, which are like slices of the body.", "These images show the size and structure of organs, bones, and other tissues."] },
  { id: "nibib-ct", title: "Computed Tomography (CT)", org: "National Institute of Biomedical Imaging and Bioengineering (NIH)", url: "https://www.nibib.nih.gov/science-education/science-topics/computed-tomography-ct", type: "government", reviewed: null, verified: V, topics: ["ct"],
    passages: ["During a CT scan, the patient lies on a bed that slowly moves through the gantry while the x-ray tube rotates around the patient, shooting narrow beams of x-rays through the body."] },
  { id: "medline-mri", title: "MRI Scans", org: "MedlinePlus, U.S. National Library of Medicine", url: "https://medlineplus.gov/mriscans.html", type: "government", reviewed: null, verified: V, topics: ["mri"],
    passages: ["Magnetic resonance imaging (MRI) is an imaging test that is usually painless and uses magnets, radio waves, and a computer to create detailed pictures of the inside of your body.", "MRI scans show organs and soft tissues clearly and can help tell healthy from unhealthy tissue in many cases.", "A specialist called a radiologist reviews the images and shares them with your provider."] },
  { id: "nibib-mri", title: "Magnetic Resonance Imaging (MRI)", org: "National Institute of Biomedical Imaging and Bioengineering (NIH)", url: "https://www.nibib.nih.gov/science-education/science-topics/magnetic-resonance-imaging-mri", type: "government", reviewed: null, verified: V, topics: ["mri"],
    passages: ["To obtain an MRI image, a patient is placed inside a large magnet and must remain very still during the imaging process in order not to blur the image."] },
  { id: "kh-mri", title: "Magnetic Resonance Imaging (MRI)", org: "Nemours KidsHealth", url: "https://kidshealth.org/en/parents/mri.html", type: "pediatric_hospital", reviewed: null, verified: V, topics: ["mri"],
    passages: ["An MRI (magnetic resonance imaging) is a safe and painless test that uses magnets and radio waves to make detailed pictures of the body's organs, muscles, soft tissues, and structures.", "Unlike a CAT scan, an MRI doesn’t use radiation."] },
  { id: "medline-us", title: "Ultrasound", org: "MedlinePlus, U.S. National Library of Medicine", url: "https://medlineplus.gov/lab-tests/sonogram/", type: "government", reviewed: null, verified: V, topics: ["ultrasound", "biopsy"],
    passages: ["An ultrasound is an imaging test that uses sound waves to make pictures (also known as a sonogram) of organs, tissues, and other structures inside your body.", "An ultrasound can find the abnormal area and guide the needle to the right place to collect the sample."] },
  { id: "nibib-us", title: "Ultrasound", org: "National Institute of Biomedical Imaging and Bioengineering (NIH)", url: "https://www.nibib.nih.gov/science-education/science-topics/ultrasound", type: "government", reviewed: null, verified: V, topics: ["ultrasound"],
    passages: ["Most diagnostic ultrasound probes are placed on the skin.", "Diagnostic ultrasound is a non-invasive diagnostic technique used to image inside the body."] },
  { id: "medline-cbc", title: "Complete Blood Count (CBC)", org: "MedlinePlus, U.S. National Library of Medicine", url: "https://medlineplus.gov/lab-tests/complete-blood-count-cbc/", type: "government", reviewed: null, verified: V, topics: ["bloodtest"],
    passages: ["A complete blood count, or CBC, is a group of blood tests that measure the number and size of the different cells in your blood.", "Red blood cells, which carry oxygen from your lungs to the rest of your body.", "White blood cells, which fight infections and other diseases."] },
  { id: "medline-venipuncture", title: "Venipuncture", org: "MedlinePlus Medical Encyclopedia", url: "https://medlineplus.gov/ency/article/003423.htm", type: "government", reviewed: null, verified: V, topics: ["bloodtest"],
    passages: ["Venipuncture is the collection of blood from a vein.", "The needle is taken out and the spot is covered with a bandage to stop bleeding."] },
  { id: "nhlbi-blood", title: "Blood Tests", org: "National Heart, Lung, and Blood Institute (NIH)", url: "https://www.nhlbi.nih.gov/health/blood-tests", type: "government", reviewed: null, verified: V, topics: ["bloodtest"],
    passages: ["They also help check the function of your organs and show how well treatments are working.", "Platelets are blood cell fragments that help your blood clot."] },
  { id: "kh-ports", title: "Implanted Ports", org: "Nemours KidsHealth", url: "https://kidshealth.org/en/parents/implanted-ports.html", type: "pediatric_hospital", reviewed: null, verified: V, topics: ["catheter"],
    passages: ["A central line (also called a central venous catheter) is like an intravenous (IV) line.", "A patient can get medicine, fluids, blood, or nutrition through a central line.", "This is easier and less painful than a typical needle stick."] },
  { id: "mskcc-port", title: "About Your Implanted Port: Information for Pediatric Patients", org: "Memorial Sloan Kettering Cancer Center", url: "https://www.mskcc.org/cancer-care/patient-education/your-implanted-port-peds", type: "academic_medical", reviewed: null, verified: V, topics: ["catheter"],
    passages: ["A CVC is a flexible tube that goes into one of your veins.", "A port protects your veins from damage from repeated access."] },
  { id: "ri-embol", title: "Catheter Embolization", org: "RadiologyInfo.org (RSNA and ACR)", url: "https://www.radiologyinfo.org/en/info/cathembol", type: "professional_society", reviewed: null, verified: V, topics: ["embolization"],
    passages: ["Embolization is a minimally invasive treatment that blocks one or more blood vessels or abnormal vascular channels."] },
  { id: "ri-ablation", title: "Thermal Ablation for Tumor Treatment", org: "RadiologyInfo.org (RSNA and ACR)", url: "https://www.radiologyinfo.org/en/info/thermal-ablation-therapy", type: "professional_society", reviewed: null, verified: V, topics: ["ablation"],
    passages: ["Thermal ablation is a minimally invasive, image-guided treatment that uses heat or extreme cold to destroy tumor cells, including cancer.", "Thermal ablation uses ultrasound, computed tomography (CT), or magnetic resonance imaging (MRI) to help guide a needle probe into a cancerous tumor."] },
  { id: "ri-sedation", title: "Pediatric Sedation", org: "RadiologyInfo.org (RSNA and ACR)", url: "https://www.radiologyinfo.org/en/info/sedation", type: "professional_society", reviewed: "2024-08-25", verified: V, topics: ["sedation"],
    passages: ["While most imaging exams are quick and painless, pediatric patients sometimes need sedation to remain still and follow instructions throughout an exam.", "Pediatric sedation helps relieve anxiety and to control pain and excessive movement."] },
  { id: "kh-anesthesia", title: "Types of Anesthesia", org: "Nemours KidsHealth", url: "https://kidshealth.org/en/parents/anesthesia-basics.html", type: "pediatric_hospital", reviewed: null, verified: V, topics: ["sedation"],
    passages: ["Anesthesia is the use of medicine to prevent discomfort during surgery or medical procedures.", "Most kids recover well from anesthesia and don’t have any complications from it."] },
  { id: "medline-children", title: "Cancer in Children", org: "MedlinePlus, U.S. National Library of Medicine", url: "https://medlineplus.gov/cancerinchildren.html", type: "government", reviewed: null, verified: V, topics: ["diagnosis"],
    passages: ["In all types of cancer, some of the body's cells begin to divide without stopping and spread into surrounding tissues.", "Children can get cancer in the same parts of the body as adults, but there are differences."] },
  { id: "kh-cancer", title: "Childhood Cancer", org: "Nemours KidsHealth", url: "https://kidshealth.org/en/parents/cancer.html", type: "pediatric_hospital", reviewed: null, verified: V, topics: ["diagnosis"],
    passages: ["Cancer happens when abnormal cells grow out of control in the body.", "It’s not common for kids or teens to get cancer, but when they do, it’s called childhood, or pediatric, cancer."] },
  { id: "medline-prep-preschool", title: "Preschooler test or procedure preparation", org: "MedlinePlus Medical Encyclopedia", url: "https://medlineplus.gov/ency/article/002057.htm", type: "government", reviewed: null, verified: V, topics: ["coping"],
    passages: ["Preparing children for medical tests can reduce their anxiety.", "It helps if your child knows what to expect.", "If your child is worried about a part of the test, do not downplay this concern."] },
  { id: "medline-prep-school", title: "School age test or procedure preparation", org: "MedlinePlus Medical Encyclopedia", url: "https://medlineplus.gov/ency/article/002058.htm", type: "government", reviewed: null, verified: V, topics: ["coping"],
    passages: ["Explaining the procedure may help reduce your child's anxiety.", "Let your child participate and make as many decisions as possible."] },
  { id: "nci-feelings", title: "Emotions and Cancer", org: "National Cancer Institute", url: "https://www.cancer.gov/about-cancer/coping/feelings", type: "government", reviewed: null, verified: V, topics: ["coping"],
    passages: ["To cope with fears and worries, it often helps to be informed.", "The more you know, the more in control you'll feel."] },
  { id: "sir-patients", title: "Interventional radiology for patients", org: "Society of Interventional Radiology", url: "https://www.sirweb.org/patients/", type: "professional_society", reviewed: null, verified: V, topics: ["ir"],
    passages: ["Interventional radiology (IR) uses advanced imaging, including X-rays, CT, MRI and ultrasound, to pinpoint problems inside the body and guide minimally invasive treatments in real time."] },
];
export const SOURCE_BY_ID = Object.fromEntries(SOURCES.map(s => [s.id, s])) as Record<string, Source>;
export const TYPE_LABEL: Record<SourceType, string> = { government: "Government health agency", professional_society: "Professional society", pediatric_hospital: "Pediatric health system", academic_medical: "Academic medical center" };
const RANK: Record<SourceType, number> = { government: 0, professional_society: 1, academic_medical: 2, pediatric_hospital: 3 };   // spec 21.7 hierarchy, among the source types we hold
export const RETRIEVAL_VERSION = "retrieval-1.0";
export const KB_VERSION = "kb-2026.11.27";

const SEDATION_TOPICS = ["biopsy", "catheter", "embolization", "ablation"];
/** Retrieve approved sources for a question: the topic's sources, sedation sources for IR procedures or when sleep or pain is asked about, and coping sources when a feeling was expressed. */
export function retrieve(topic: string | null, question: string, emotion: boolean, max = 4): Source[] {
  const q = question.toLowerCase(); const out: Source[] = [];
  if (topic) out.push(...SOURCES.filter(s => s.topics.includes(topic)).sort((a, b) => RANK[a.type] - RANK[b.type]));
  if (topic && (SEDATION_TOPICS.includes(topic) || /\b(sleep|asleep|anesthe|sedat|hurt|pain|awake)\b/.test(q))) out.push(...SOURCES.filter(s => s.topics.includes("sedation")));
  if (topic && ["biopsy", "catheter", "embolization", "ablation"].includes(topic)) out.push(SOURCE_BY_ID["sir-patients"]);
  if (emotion) out.push(...SOURCES.filter(s => s.topics.includes("coping")).slice(0, 2));
  const seen = new Set<string>(); return out.filter(s => (seen.has(s.id) ? false : (seen.add(s.id), true))).slice(0, max);
}

// ------------------------------------------------------------------ citation checking
const STOP = new Set("a an the and or but of to in on for with is are was be been it its this that these those you your they their them we our can may might will would should could from by as at into than then so if not no do does did have has had about up out over also more most some any all each other such only very just like when where what which who how why there here one two use used uses using make makes made help helps body inside part".split(" "));
const words = (s: string) => (s.toLowerCase().match(/[a-z][a-z-]{2,}/g) ?? []).map(w => w.replace(/(ies|es|s|ing|ed)$/, "")).filter(w => !STOP.has(w));
export interface CitationCheck { sentence: string; cites: string[]; support: "supported" | "weak" | "invalid"; overlap: number; }
export interface CitationReport { cited: string[]; checks: CitationCheck[]; factual: number; citedFactual: number; coverage: number | null; invalid: number; weak: number; uncited: string[]; method: string; }
const FACTUAL = /\b(is|are|uses?|makes?|takes?|shows?|measures?|helps?|blocks?|destroys?|collects?|removes?|carries|lets|means|works?|guides?)\b/i;
const PERSONAL = /\b(you can|you might|you may|ask|it'?s okay|that'?s okay|i'?m glad|this is general education|your (care )?team)\b/i;

/** Matches each cited sentence to the passages of the source it cites, by shared content words. A documented heuristic, not proof of support. */
export function checkCitations(text: string, provided: Source[]): CitationReport {
  const plain = text.replace(/\*\*|__/g, ""); const ids = provided.map(s => s.id);
  const sentences = plain.split(/\n+|(?<=[.!?])\s+(?=[A-Z0-9“"])/).map(s => s.trim()).filter(s => s.split(/\s+/).length >= 5);
  const checks: CitationCheck[] = []; const cited = new Set<string>(); const uncited: string[] = []; let factual = 0, citedFactual = 0;
  for (const s of sentences) {
    const nums = [...s.matchAll(/\[(\d{1,2})\]/g)].map(m => Number(m[1]));
    const isFact = FACTUAL.test(s) && !PERSONAL.test(s);
    if (isFact) factual++;
    if (!nums.length) { if (isFact) uncited.push(s.slice(0, 140)); continue; }
    if (isFact) citedFactual++;
    for (const n of nums) {
      const src = provided[n - 1];
      if (!src) { checks.push({ sentence: s.slice(0, 160), cites: [`[${n}]`], support: "invalid", overlap: 0 }); continue; }
      cited.add(src.id);
      const a = new Set(words(s.replace(/\[\d+\]/g, ""))); const b = new Set(src.passages.flatMap(words));
      const shared = [...a].filter(w => b.has(w)).length; const overlap = a.size ? +(shared / a.size).toFixed(2) : 0;
      checks.push({ sentence: s.slice(0, 160), cites: [src.id], support: shared >= 3 || overlap >= 0.3 ? "supported" : "weak", overlap });
    }
  }
  return { cited: ids.filter(i => cited.has(i)), checks, factual, citedFactual, coverage: factual ? +(citedFactual / factual).toFixed(2) : null, invalid: checks.filter(c => c.support === "invalid").length, weak: checks.filter(c => c.support === "weak").length, uncited, method: "Lexical overlap between the cited sentence and the source's stored passages (≥3 shared content words or ≥30% of the sentence's words). A heuristic, not proof of support." };
}

/** Removes citation markers that point at sources we did not provide, so a broken citation is never shown. */
export const stripInvalid = (text: string, n: number) => text.replace(/\s?\[(\d{1,2})\]/g, (m, d) => (Number(d) >= 1 && Number(d) <= n ? m : ""));
