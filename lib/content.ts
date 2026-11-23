// DRAFT educational content. Must be reviewed by a clinician before real use.
export type Level = "6-8" | "9-11" | "12-14" | "15-17";
export interface Topic {
  id: string; title: string; keywords: string[];
  why: Record<Level, string>;       // what it is / why
  steps: string[];                  // general sequence
  example: string;                  // familiar comparison
  terms: string[];                  // glossary ids
  questions: string[];
}
export const GLOSSARY: Record<string, string> = {
  tissue: "Tissue is the material your body is made of, like muscle or skin. It is made of tiny building blocks called cells.",
  cell: "Cells are the tiny building blocks of your body. You need a microscope to see them.",
  sample: "A sample is a small piece taken so it can be studied closely.",
  anesthesia: "Anesthesia is medicine that helps you not feel pain, or sleep, during a procedure.",
  contrast: "Contrast is a special liquid that makes parts of the body show up more clearly on a scan.",
  catheter: "A catheter is a thin, soft, flexible tube that doctors place in the body to move fluid or medicine.",
  radiologist: "A radiologist is a doctor who is an expert in reading medical pictures like X-rays and scans.",
  imaging: "Imaging means taking pictures of the inside of the body.",
  tumor: "A tumor is a group of cells that grew more than they should.",
  procedure: "A procedure is something a healthcare team does to learn about or help your body.",
};
export const TOPICS: Topic[] = [
  { id: "biopsy", title: "Biopsy", keywords: ["biopsy", "biopsies", "tissue sample"],
    why: {
      "6-8": "A biopsy is when doctors take a tiny piece of tissue so they can look at it closely and learn more about what is happening.",
      "9-11": "A biopsy is a procedure where doctors collect a small sample of tissue. A specialist looks at the sample in a lab to learn more about the cells.",
      "12-14": "A biopsy removes a small sample of tissue so a pathologist can examine the cells under a microscope. It helps the care team understand exactly what is going on so they can plan next steps.",
      "15-17": "A biopsy is a procedure to obtain a tissue sample, often with image guidance (ultrasound, CT), which a pathologist analyzes. Results can give detailed information about the cells that imaging alone cannot show.",
    },
    steps: ["The team explains what will happen and answers questions.", "You get medicine so you are comfortable (the type depends on the procedure).", "Doctors use pictures like ultrasound or CT to guide a thin needle or tool to the right spot.", "They collect a small sample and send it to a lab.", "You rest and the team checks on you afterward."],
    example: "It is a little like a scientist looking at a tiny drop of pond water under a microscope to learn what lives in it.",
    terms: ["tissue", "cell", "sample", "anesthesia", "imaging"],
    questions: ["How will I be kept comfortable?", "How long will it take, and how long will I be there?", "When will we hear the results?", "Can someone stay with me before and after?"] },
  { id: "ct", title: "CT scan", keywords: ["ct", "cat scan", "ct scan"],
    why: {
      "6-8": "A CT scan is a special camera that takes pictures of the inside of your body. You lie still on a bed that slides through a big ring.",
      "9-11": "A CT scan uses X-rays and a computer to make detailed pictures of the inside of your body, like slices of bread. You lie on a bed that moves through a ring-shaped machine.",
      "12-14": "A CT scan combines many X-ray images with a computer to build cross-section pictures of organs, bones and other tissue. It is quick, and the machine does not touch you.",
      "15-17": "CT uses a rotating X-ray source and detectors to reconstruct cross-sectional images. Contrast may be given to highlight vessels or tissue. Scans usually take minutes, with lying still being the main requirement.",
    },
    steps: ["You change into a gown if needed and lie on the bed.", "Sometimes contrast is given through an IV or by drink.", "The bed slides into the ring and you hold still; you may be asked to hold your breath briefly.", "The pictures are taken, usually in a few minutes.", "A radiologist studies the pictures and shares a report with your team."],
    example: "Imagine slicing a loaf of bread and looking at each slice; a CT lets doctors look at 'slices' of your body without cutting.",
    terms: ["imaging", "contrast", "radiologist"],
    questions: ["Will I need contrast?", "Can a parent be in the room?", "How long do I need to stay still?"] },
  { id: "mri", title: "MRI", keywords: ["mri", "magnetic resonance"],
    why: {
      "6-8": "An MRI is a big machine that takes very clear pictures of the inside of your body. It is loud, like knocking and buzzing, but it does not hurt.",
      "9-11": "An MRI uses a strong magnet and radio waves to take detailed pictures of soft parts of the body. It makes loud knocking sounds, and you wear headphones or earplugs.",
      "12-14": "An MRI uses magnets and radio waves, not X-rays, to make very detailed pictures, especially of soft tissue like the brain and muscles. It can take a while, so staying still and comfortable matters.",
      "15-17": "MRI uses a strong magnetic field and radiofrequency pulses to produce high-contrast images of soft tissue without ionizing radiation. Exams can take 30–90 minutes, and metal items must be removed.",
    },
    steps: ["You remove anything metal and the team checks you are safe for the magnet.", "You lie on a bed that slides into a tunnel; headphones help with the noise.", "You stay as still as you can while pictures are taken.", "The team may talk to you through a speaker.", "A radiologist reviews the pictures afterward."],
    example: "The machine is like a very loud, very careful camera that needs you to stay still, like playing statues.",
    terms: ["imaging", "contrast", "radiologist"],
    questions: ["Can I bring music or a comfort item?", "How long will it take?", "Will I need sedation or contrast?"] },
  { id: "ultrasound", title: "Ultrasound", keywords: ["ultrasound", "sonogram"],
    why: {
      "6-8": "An ultrasound uses a small wand and a bit of gel to make pictures of the inside of your body on a screen. It does not hurt.",
      "9-11": "An ultrasound uses sound waves too high for us to hear to make moving pictures of the inside of the body. A wand with gel slides over your skin.",
      "12-14": "An ultrasound sends high-frequency sound waves into the body and shows the echoes as live images. It uses no radiation and is often used to look at organs and to guide procedures.",
      "15-17": "Ultrasound uses reflected high-frequency sound waves to create real-time images without ionizing radiation. It is commonly used for diagnostic imaging and for guiding needles during procedures.",
    },
    steps: ["Warm gel is put on your skin.", "A technologist moves a smooth wand over the area.", "Pictures show up on a screen.", "The gel is wiped off and you are done."],
    example: "It works a bit like how a bat uses echoes to see in the dark.",
    terms: ["imaging", "radiologist"],
    questions: ["Do I need to eat or drink anything beforehand?", "Can I see the screen?"] },
  { id: "bloodtest", title: "Blood test", keywords: ["blood test", "blood draw", "bloods", "labs"],
    why: {
      "6-8": "A blood test is when a nurse takes a small bit of blood to check how your body is doing.",
      "9-11": "A blood test takes a small sample of blood so a lab can count cells and measure other things that show how your body is working.",
      "12-14": "Blood tests measure blood cell counts and chemicals to show how your body is working and how treatments are affecting it.",
      "15-17": "Blood tests give the team measurements such as blood counts and organ function markers, used to monitor health and guide care.",
    },
    steps: ["A nurse cleans your skin.", "A small needle or your existing line is used to collect blood.", "The blood goes into small tubes for the lab.", "A bandage or cover is placed."],
    example: "It is like checking the dashboard lights in a car to see if everything is running well.",
    terms: ["cell", "sample"],
    questions: ["Is there a way to make it more comfortable, like numbing cream?", "What are you checking for?"] },
  { id: "catheter", title: "Catheter placement", keywords: ["catheter", "port", "central line", "picc"],
    why: {
      "6-8": "A catheter is a thin, soft tube that doctors place under the skin so medicine and blood tests are easier. Doctors help you stay comfortable while it is placed.",
      "9-11": "A catheter placement is a procedure where doctors put a thin, soft tube into a large vein. It lets the team give medicine and take blood without a new needle every time.",
      "12-14": "A central venous catheter is a thin tube placed into a large vein, often guided by ultrasound. It allows medicines and blood draws with fewer needle sticks.",
      "15-17": "A central venous catheter (e.g., a port or tunneled line) is placed into a large vein, typically with imaging guidance and anesthesia, to allow repeated access for treatment and blood sampling.",
    },
    steps: ["The team explains the plan and gives comfort medicine.", "Doctors use pictures to guide the thin tube into the right vein.", "The tube is secured and covered.", "The team shows you how it will be cared for."],
    example: "It is like a small doorway into a vein so medicine can get in without poking you every time.",
    terms: ["catheter", "anesthesia", "imaging"],
    questions: ["How will it be cared for at home?", "Will it limit what I can do, like swimming or sports?"] },
  { id: "embolization", title: "Embolization", keywords: ["embolization", "embolisation"],
    why: {
      "6-8": "Embolization is when doctors use tiny things to block a small blood pathway so less blood goes to one spot.",
      "9-11": "Embolization is a procedure where doctors use a thin tube to place tiny materials in a blood vessel so less blood flows to a certain area.",
      "12-14": "Embolization blocks selected blood vessels, using a catheter guided by X-ray images, to reduce blood flow to a specific area.",
      "15-17": "Embolization is an image-guided procedure in which a catheter delivers embolic material to selected vessels to reduce blood flow to a target area. Your team can explain the specific purpose in your case.",
    },
    steps: ["You get anesthesia or sedation.", "A thin tube is guided through a blood vessel using X-ray pictures.", "Tiny materials are placed at the chosen spot.", "You rest and are monitored afterward."],
    example: "It is a bit like closing a small tap on a pipe so less water runs to one place.",
    terms: ["catheter", "anesthesia", "imaging", "procedure"],
    questions: ["Why is this being recommended for me?", "What will recovery be like?"] },
  { id: "ablation", title: "Tumor ablation", keywords: ["ablation", "ablate"],
    why: {
      "6-8": "Ablation is when doctors use a very thin tool to treat a small spot, while pictures help them aim.",
      "9-11": "Ablation is a procedure where doctors use a thin tool, guided by pictures, to treat a small area of unwanted cells with heat or cold.",
      "12-14": "Tumor ablation uses a needle-like probe, guided by imaging, to destroy a small area of tumor cells with heat or cold.",
      "15-17": "Tumor ablation uses image-guided probes to destroy targeted tumor tissue with heat, cold, or other energy. Suitability depends on many individual factors your team can discuss with you.",
    },
    steps: ["You get anesthesia so you are comfortable.", "Pictures help doctors guide a thin probe to the spot.", "The probe treats the small area.", "You are watched while you wake up and recover."],
    example: "It is like using a very small, precise tool instead of a big one, with a map to help aim.",
    terms: ["tumor", "anesthesia", "imaging", "cell"],
    questions: ["Why might this be a good option?", "What will recovery be like?"] },
  { id: "diagnosis", title: "Understanding a diagnosis", keywords: ["diagnosis", "cancer", "what does it mean", "tumor"],
    why: {
      "6-8": "A diagnosis is the name doctors give to what is happening in your body. Naming it helps the team choose how to help.",
      "9-11": "A diagnosis is the name for what is making someone sick. Cancer means some cells in the body are growing in ways they shouldn't. Doctors use tests to learn which kind, so they can pick the best care.",
      "12-14": "A diagnosis comes from tests, scans and lab results. Cancer is a group of diseases where cells grow abnormally. Each type is different, so your team explains what applies to you.",
      "15-17": "A cancer diagnosis is based on clinical findings, imaging and pathology. Cancers differ widely in behavior and treatment, so details about your specific diagnosis should come from your oncology team, and it is fine to ask them for plain answers about uncertainty.",
    },
    steps: ["Doctors listen to symptoms and examine you.", "Tests and scans are done.", "A specialist studies results.", "Your team explains what they found and discusses a plan."],
    example: "It is like a detective collecting clues, then naming the answer so everyone can make a plan.",
    terms: ["tumor", "cell", "imaging"],
    questions: ["Can you explain my diagnosis in plain words?", "What should I expect next?", "Who can I ask when I think of questions later?"] },
];
export const SOURCE = { title: "Onconnect approved content (draft)", org: "Onconnect", reviewed: "Pending clinician review" };
export const PROFILES: Record<Level, string> = { "6-8": "Early school age", "9-11": "Middle childhood", "12-14": "Early adolescence", "15-17": "Later adolescence" };
