/**
 * Educational FAQ derived from public sources (GQ, Mayo, AUA/ASRM, etc.).
 * Framed for OVUM RUSH: general information & lobby discussion context — not personal medical advice.
 */

export type MensHealthFaqItem = {
  id: string;
  question: string;
  /** Plain text for UI + JSON-LD (no HTML). */
  answer: string;
  source?: { label: string; url: string };
};

export const MENS_HEALTH_FAQ_DISCLAIMER =
  "This page is for general education and community context only. OVUM RUSH does not provide medical advice, diagnosis, or treatment. Always talk to a qualified clinician about your situation.";

export const MENS_HEALTH_FAQ_ITEMS: MensHealthFaqItem[] = [
  {
    id: "what-is-spermmaxxing",
    question: "What is spermmaxxing?",
    answer:
      "“Spermmaxxing” is informal internet language for trying to improve sperm quality or fertility habits—often through lifestyle, diet, avoiding harmful habits, tracking, and sometimes supplements. The trend mixes sensible health basics with unproven “hacks.” Treat online tips skeptically and verify with professionals.",
    source: { label: "British GQ", url: "https://www.gq.com/story/men-are-spermmaxxing-now" },
  },
  {
    id: "can-sperm-quality-improve",
    question: "Can sperm quality actually be improved?",
    answer:
      "Sometimes, when problems are linked to modifiable factors—like lifestyle, heat exposure, infections, obesity, smoking, alcohol, some medications, or varicocele. When causes are anatomical, genetic, or hormonal, lifestyle alone may not be enough. Only a clinician can interpret your case.",
    source: {
      label: "AUA — Male infertility guideline",
      url: "https://www.auanet.org/guidelines-and-quality/guidelines/male-infertility",
    },
  },
  {
    id: "how-long-to-see-results",
    question: "How long does it take to see results?",
    answer:
      "Sperm production cycles are slow—often discussed on the order of several weeks to a few months—so semen analysis reflects conditions over a prior window, not last week’s habits. Follow your lab or doctor’s timing for repeat testing.",
    source: {
      label: "Mayo Clinic — Low sperm count",
      url: "https://www.mayoclinic.org/diseases-conditions/low-sperm-count/diagnosis-treatment/drc-20374591",
    },
  },
  {
    id: "which-metrics-matter",
    question: "Which sperm metrics matter most?",
    answer:
      "Basic semen analysis commonly includes count, motility, and morphology, plus volume and other parameters. You can’t judge fertility reliably by appearance or feel—testing and professional interpretation matter.",
    source: {
      label: "Mayo Clinic — Healthy sperm",
      url: "https://www.mayoclinic.org/healthy-lifestyle/getting-pregnant/in-depth/fertility/art-20047584",
    },
  },
  {
    id: "what-is-normal-analysis",
    question: 'What counts as “normal” on a semen analysis?',
    answer:
      "Reference ranges exist, but one number rarely tells the whole story. Motility, morphology, and concentration are interpreted together—and often with repeat testing and the couple’s context—not as a single pass/fail label.",
    source: {
      label: "Mayo Clinic — Healthy sperm",
      url: "https://www.mayoclinic.org/healthy-lifestyle/getting-pregnant/in-depth/fertility/art-20047584",
    },
  },
  {
    id: "one-analysis-enough",
    question: "Is one semen analysis enough?",
    answer:
      "Often not. Results can vary between samples; if something looks off, a repeat test is common. Guidelines caution against over-interpreting a single report.",
    source: {
      label: "AUA — Male infertility guideline",
      url: "https://www.auanet.org/guidelines-and-quality/guidelines/male-infertility",
    },
  },
  {
    id: "prepare-for-analysis",
    question: "How should I prepare for a semen analysis?",
    answer:
      "Labs usually give instructions—often including abstinence timing, how to collect the full sample, avoiding certain condoms/lubricants, and getting the sample to the lab quickly. Follow the sheet you’re given; partial loss can skew results.",
    source: { label: "Cleveland Clinic — Semen analysis", url: "https://my.clevelandclinic.org/health/diagnostics/21520-semen-analysis" },
  },
  {
    id: "heat-laptops-underwear",
    question: "Do saunas, hot baths, laptops on the lap, and tight underwear matter?",
    answer:
      "Scrotal overheating can affect sperm production; major sources emphasize avoiding chronic extreme heat. Practical takeaway: don’t treat memes as protocols—ask your clinician what matters for you.",
    source: { label: "Your Fertility — Healthy sperm", url: "https://www.yourfertility.org.au/everyone/health-medical/healthy-sperm" },
  },
  {
    id: "cold-ice-practices",
    question: 'Do cold-water or “ice” practices help?',
    answer:
      "Avoiding excess heat is evidence-based; turning that into extreme icing or viral rituals is usually not a standard medical recommendation. Be wary of hype and prioritize clinician guidance.",
    source: {
      label: "AUA — Male infertility guideline",
      url: "https://www.auanet.org/guidelines-and-quality/guidelines/male-infertility",
    },
  },
  {
    id: "illness-stress-temporary",
    question: "Can illness, fever, or stress temporarily worsen a semen test?",
    answer:
      "Yes—acute illness, fever, major stress, or poor collection technique can skew a sample. That’s one reason repeat testing and context matter.",
    source: {
      label: "Mayo Clinic — Low sperm count",
      url: "https://www.mayoclinic.org/diseases-conditions/low-sperm-count/diagnosis-treatment/drc-20374591",
    },
  },
  {
    id: "smoking-alcohol-cannabis",
    question: "How harmful are smoking, alcohol, and cannabis?",
    answer:
      "Major clinics link smoking and heavy substance use to worse semen parameters. If pregnancy is a goal, reducing or stopping these factors is a common clinical talking point—not something to “optimize around.”",
    source: {
      label: "Mayo Clinic — Male infertility",
      url: "https://www.mayoclinic.org/diseases-conditions/male-infertility/symptoms-causes/syc-20374773",
    },
  },
  {
    id: "trt-steroids-fertility",
    question: "Do testosterone, TRT, and anabolic steroids affect fertility?",
    answer:
      "Exogenous testosterone and anabolic steroids can suppress sperm production—sometimes severely. This is a frequent overlooked cause. Never change prescription hormones without a prescriber; discuss fertility goals explicitly.",
    source: {
      label: "AUA — Male infertility guideline",
      url: "https://www.auanet.org/guidelines-and-quality/guidelines/male-infertility",
    },
  },
  {
    id: "vitamins-supplements",
    question: "Are vitamins and supplements worth taking?",
    answer:
      "Some antioxidants and nutrients have been studied, but evidence is mixed and supplements rarely fix serious underlying infertility. Avoid megadosing trends; review products and goals with a clinician.",
    source: {
      label: "Cochrane — Antioxidants for male subfertility",
      url: "https://www.cochrane.org/CD007411/MENSTR_antioxidants-male-subfertility",
    },
  },
  {
    id: "lubricants-conception",
    question: "Can lubricants make conception harder?",
    answer:
      "Some common lubricants can impair sperm motility in testing; fertility-focused guidance often suggests sperm-friendly options or avoiding standard products while trying to conceive—confirm with your care team.",
    source: {
      label: "Mayo Clinic — Healthy sperm",
      url: "https://www.mayoclinic.org/healthy-lifestyle/getting-pregnant/in-depth/fertility/art-20047584",
    },
  },
  {
    id: "sex-frequency-pregnancy",
    question: "How often should we have sex if the goal is pregnancy?",
    answer:
      "Typical guidance emphasizes regular intercourse and timing around the fertile window rather than rigid rules. Your clinician can personalize advice if there are medical constraints.",
    source: {
      label: "ASRM — Optimizing natural fertility",
      url: "https://www.asrm.org/practice-guidance/practice-committee-documents/optimizing-natural-fertility-a-committee-opinion-2021/",
    },
  },
  {
    id: "poor-motility-still-possible",
    question: "Is pregnancy still possible with poor motility or morphology?",
    answer:
      "Sometimes. Abnormal parameters reduce odds but don’t automatically equal “impossible.” Interpretation should be done professionally—not from a single number online.",
    source: {
      label: "ASRM — Infertility in men (Part I)",
      url: "https://www.asrm.org/practice-guidance/practice-committee-documents/diagnosis-and-treatment-of-infertility-in-men-auaasrm-guideline-part-i-2020/",
    },
  },
  {
    id: "dna-fragmentation-test",
    question: "Do I need a sperm DNA fragmentation test?",
    answer:
      "It’s not a routine first step for everyone. Guidelines generally reserve specialized tests for selected scenarios; don’t stack expensive tests based on forums alone.",
    source: {
      label: "AUA — Male infertility guideline",
      url: "https://www.auanet.org/guidelines-and-quality/guidelines/male-infertility",
    },
  },
  {
    id: "varicocele",
    question: "Can varicocele be the reason for poor semen parameters?",
    answer:
      "Varicocele is a common reversible contributor in some cases; treatment decisions belong with a urologist or fertility specialist after proper evaluation.",
    source: {
      label: "Mayo Clinic — Male infertility",
      url: "https://www.mayoclinic.org/diseases-conditions/male-infertility/symptoms-causes/syc-20374773",
    },
  },
  {
    id: "when-see-doctor",
    question: "When is it time to see a doctor?",
    answer:
      "Common thresholds include about a year of trying without contraception (sooner if older or known risk factors), or earlier if you have pain, masses, trauma history, cancer treatment, hormone use, or sexual dysfunction. This list isn’t exhaustive—ask a professional.",
    source: {
      label: "Mayo Clinic — Low sperm count",
      url: "https://www.mayoclinic.org/diseases-conditions/low-sperm-count/symptoms-causes/syc-20374585",
    },
  },
  {
    id: "both-partners-tested",
    question: "Should only the man be tested, or both partners?",
    answer:
      "Guidelines emphasize evaluating both partners in parallel for infertility workups. Focusing blame on one side is a common mistake.",
    source: {
      label: "AUA — Male infertility guideline",
      url: "https://www.auanet.org/guidelines-and-quality/guidelines/male-infertility",
    },
  },
];

export function faqJsonLdMainEntity(items: MensHealthFaqItem[]) {
  return items.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
  }));
}
