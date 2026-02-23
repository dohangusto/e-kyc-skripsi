import type { VerificationCase } from "@/domain/entities/verification-case";
import type {
  CaseStatus,
  Eligibility,
  FaceMatch,
  Liveness,
  OcrConsistency,
  Restriction,
} from "@/domain/types";

const ktpImageUrl = new URL("./assets/ktp-placeholder.svg", import.meta.url)
  .href;
const selfieImageUrl = new URL(
  "./assets/selfie-placeholder.svg",
  import.meta.url,
).href;

const regions = [
  {
    code: "3171",
    province: "DKI Jakarta",
    city: "Jakarta Pusat",
    districts: ["Gambir", "Menteng"],
  },
  {
    code: "3273",
    province: "Jawa Barat",
    city: "Bandung",
    districts: ["Coblong", "Sukajadi"],
  },
  {
    code: "3578",
    province: "Jawa Timur",
    city: "Surabaya",
    districts: ["Tegalsari", "Wonokromo"],
  },
  {
    code: "5171",
    province: "Bali",
    city: "Denpasar",
    districts: ["Denpasar Selatan", "Denpasar Utara"],
  },
];

const firstNames = [
  "Alya",
  "Bagas",
  "Citra",
  "Dimas",
  "Eka",
  "Farah",
  "Gilang",
  "Hana",
  "Indra",
  "Jasmine",
  "Karin",
  "Lutfi",
  "Mira",
  "Naufal",
  "Oktavia",
  "Putra",
  "Qori",
  "Rizky",
  "Salsa",
  "Tegar",
];

const lastNames = [
  "Aditya",
  "Pratama",
  "Mahendra",
  "Wijaya",
  "Santoso",
  "Permata",
  "Saputra",
  "Utami",
  "Anggraini",
  "Firmansyah",
];

const statusPool: CaseStatus[] = [
  ...Array(20).fill("FALLBACK_REVIEW"),
  ...Array(15).fill("EKYC_SUBMITTED"),
  ...Array(10).fill("AUTO_VERIFIED"),
  ...Array(5).fill("EKYC_IN_PROGRESS"),
  ...Array(3).fill("ELIGIBILITY_FAILED"),
  ...Array(3).fill("REJECTED"),
  ...Array(2).fill("APPROVED_MANUAL"),
  ...Array(2).fill("NEED_REVERIFY"),
];

const gestureSets = [
  ["TURN_LEFT", "BLINK", "SMILE"],
  ["TURN_RIGHT", "BLINK"],
  ["NOD", "SMILE"],
  ["BLINK", "SMILE", "TURN_LEFT"],
];

const mulberry32 = (seed: number) => {
  let value = seed;
  return () => {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const shuffle = <T>(items: T[], random: () => number) => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const buildNik = (regionCode: string, index: number) => {
  const sequence = String(100000 + index).padStart(6, "0");
  const suffix = String(700000 + ((index * 7) % 1000000)).padStart(6, "0");
  return `${regionCode}${sequence}${suffix}`;
};

const deriveSignals = (status: CaseStatus, index: number) => {
  let faceMatch: FaceMatch = "MATCH";
  let liveness: Liveness = "PASS";
  let ocrConsistency: OcrConsistency = "CONSISTENT";
  let restriction: Restriction = "FULL";

  if (status === "FALLBACK_REVIEW") {
    faceMatch = index % 3 === 0 ? "PENDING" : "MISMATCH";
    liveness = index % 2 === 0 ? "FAIL" : "UNCERTAIN";
    ocrConsistency = index % 2 === 0 ? "INCONSISTENT" : "CONSISTENT";
    restriction = "LIMITED";
  } else if (status === "EKYC_IN_PROGRESS") {
    faceMatch = "PENDING";
    liveness = "UNCERTAIN";
  } else if (status === "ELIGIBILITY_FAILED") {
    faceMatch = "MISMATCH";
    liveness = "FAIL";
    ocrConsistency = "INCONSISTENT";
    restriction = "LIMITED";
  } else if (status === "REJECTED") {
    faceMatch = index % 2 === 0 ? "MISMATCH" : "PENDING";
    liveness = "FAIL";
    restriction = "LIMITED";
  } else if (status === "NEED_REVERIFY") {
    faceMatch = "PENDING";
    liveness = "UNCERTAIN";
    restriction = "LIMITED";
  }

  return { faceMatch, liveness, ocrConsistency, restriction };
};

const deriveEligibility = (status: CaseStatus, index: number): Eligibility => {
  if (status === "ELIGIBILITY_FAILED") return "INELIGIBLE";
  if (status === "REJECTED" && index % 2 === 0) return "INELIGIBLE";
  return "ELIGIBLE";
};

const deriveRiskLevel = (
  signals: ReturnType<typeof deriveSignals>,
  eligibility: Eligibility,
) => {
  if (signals.faceMatch === "MISMATCH" || eligibility === "INELIGIBLE")
    return "HIGH";
  if (signals.faceMatch === "PENDING" || signals.restriction === "LIMITED")
    return "MEDIUM";
  return "LOW";
};

const deriveOcr = (
  nik: string,
  name: string,
  index: number,
  ocrConsistency: OcrConsistency,
) => {
  const flags: string[] = [];
  let confidence = 0.92;
  let ocrName = name;

  if (ocrConsistency === "INCONSISTENT") {
    const parts = name.split(" ");
    ocrName = `${parts[0]} X`;
    confidence = 0.62;
    flags.push("NAME_MISMATCH");
  }

  if (index % 7 === 0) {
    flags.push("LOW_LIGHTING");
    confidence = Math.min(confidence, 0.7);
  }

  return {
    nik,
    name: ocrName,
    birthDate: "1994-08-12",
    address: `Jl. Merdeka No.${(index % 20) + 1}`,
    confidence,
    flags: flags.length ? flags : undefined,
  };
};

const deriveScores = (signals: ReturnType<typeof deriveSignals>) => {
  const faceScore =
    signals.faceMatch === "MATCH"
      ? 0.93
      : signals.faceMatch === "PENDING"
        ? 0.64
        : 0.32;
  const livenessScore =
    signals.liveness === "PASS"
      ? 0.9
      : signals.liveness === "UNCERTAIN"
        ? 0.58
        : 0.22;
  return { faceScore, livenessScore };
};

const random = mulberry32(42);
const shuffledStatuses = shuffle(statusPool, random);

export const mockCases: VerificationCase[] = Array.from(
  { length: 60 },
  (_, index) => {
    const status = shuffledStatuses[index];
    const region = regions[index % regions.length];
    const signals = deriveSignals(status, index);
    const eligibility = deriveEligibility(status, index);
    const riskLevel = deriveRiskLevel(signals, eligibility);
    const createdAt = new Date(
      Date.now() - index * 1000 * 60 * 60 * 6,
    ).toISOString();
    const applicantName = `${firstNames[index % firstNames.length]} ${lastNames[index % lastNames.length]}`;
    const nik = buildNik(region.code, index);
    const { faceScore, livenessScore } = deriveScores(signals);

    return {
      id: `case-${1000 + index}`,
      applicant: {
        id: `app-${2000 + index}`,
        nik,
        name: applicantName,
        region: {
          province: region.province,
          city: region.city,
          district: region.districts[index % region.districts.length],
        },
      },
      status,
      signals,
      createdAt,
      updatedAt: createdAt,
      decidedAt: createdAt,
      lastUpdatedAt: createdAt,
      assignedTo: null,
      triageTag: null,
      riskLevel,
      eligibility,
      evidence: {
        ktpImageUrl,
        ktpOcr: deriveOcr(nik, applicantName, index, signals.ocrConsistency),
        selfieWithKtpUrl: selfieImageUrl,
        liveness: {
          result: signals.liveness,
          gestures: gestureSets[index % gestureSets.length],
          score: livenessScore,
        },
        faceMatch: {
          result: signals.faceMatch,
          score: faceScore,
        },
      },
    };
  },
);
