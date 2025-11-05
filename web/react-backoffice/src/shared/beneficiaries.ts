import type {
  AppStatus,
  ClusteringCandidate,
  ClusteringPriority,
  Region,
  SurveyAnswers,
  SurveyStatus,
  Visit,
} from '@domain/types'

type ClusterStatus = ClusteringCandidate['status']

type DocumentSeed = {
  id: string
  type: string
  url: string
  sha256: string
}

type TimelineSeed = {
  at: string
  by: string
  action: string
  reason?: string
}

export type BeneficiarySeed = {
  personId: string
  applicationId: string
  name: string
  nik: string
  dob: string
  phone: string
  region: Region
  householdSize: number
  scores: { ocr: number; face: number; liveness: 'OK' }
  status: AppStatus
  assignedTo: string | null
  agingDays: number
  createdAt: string
  flags: {
    duplicate_nik: boolean
    duplicate_face: boolean
    device_anomaly: boolean
    similarity: number
    candidates?: Array<{ id: string; name: string; similarity: number; selfie_url?: string }>
  }
  documents: DocumentSeed[]
  visits: Visit[]
  timeline: TimelineSeed[]
  recommendedCluster: 'PKH' | 'BPNT' | 'PBI' | 'LAINNYA'
  recommendedPriority: ClusteringPriority
  clusterScore: number
  clusterStatus: ClusterStatus
  clusterNotes?: string
  reviewer?: string
  reviewedAt?: string
  survey?: {
    completed: boolean
    submittedAt?: string
    status?: SurveyStatus
    answers?: SurveyAnswers
  }
}

const docs = (appId: string): DocumentSeed[] => [
  { id: `${appId}-KTP`, type: 'KTP', url: '/mock/ktp1.jpg', sha256: `${appId}-ktp` },
  { id: `${appId}-SELFIE`, type: 'SELFIE', url: '/mock/selfie1.jpg', sha256: `${appId}-selfie` },
]

const visit = (id: string, scheduled: string, status: Visit['status'], tksk = 'TKSK-1002'): Visit => ({
  id,
  scheduled_at: scheduled,
  geotag: null,
  photos: [],
  checklist: {},
  status,
  tksk_id: tksk,
})

export const beneficiaries: BeneficiarySeed[] = [
  {
    personId: 'BEN-001',
    applicationId: 'APP-2025-0001',
    name: 'Siti Aminah',
    nik: '3271011234560001',
    dob: '1987-04-12',
    phone: '08123450001',
    region: { prov: 'Kepri', kab: 'Batam', kec: 'Sekupang', kel: 'Tg Riau' },
    householdSize: 4,
    scores: { ocr: 0.92, face: 0.88, liveness: 'OK' },
    status: 'DESK_REVIEW',
    assignedTo: 'TKSK-1002',
    agingDays: 2,
    createdAt: '2025-10-18T08:30:00Z',
    flags: { duplicate_nik: false, duplicate_face: false, device_anomaly: false, similarity: 0.82 },
    documents: docs('APP-2025-0001'),
    visits: [],
    timeline: [
      { at: '2025-10-18T08:30:00Z', by: 'system', action: 'SUBMITTED' },
      { at: '2025-10-18T08:31:00Z', by: 'scoring', action: 'SCORED' },
      { at: '2025-10-19T09:15:00Z', by: 'ADM-1', action: 'DESK_REVIEW_STARTED' },
    ],
    recommendedCluster: 'PKH',
    recommendedPriority: 'TINGGI',
    clusterScore: 0.86,
    clusterStatus: 'IN_REVIEW',
    survey: {
      completed: false,
      status: 'belum-dikumpulkan',
    },
  },
  {
    personId: 'BEN-002',
    applicationId: 'APP-2025-0002',
    name: 'Rahmat Hidayat',
    nik: '3271012234560002',
    dob: '1984-06-21',
    phone: '08123450002',
    region: { prov: 'Kepri', kab: 'Batam', kec: 'Batam Kota', kel: 'Belian' },
    householdSize: 3,
    scores: { ocr: 0.9, face: 0.81, liveness: 'OK' },
    status: 'FIELD_VISIT',
    assignedTo: 'TKSK-1002',
    agingDays: 4,
    createdAt: '2025-10-15T07:10:00Z',
    flags: {
      duplicate_nik: false,
      duplicate_face: true,
      device_anomaly: false,
      similarity: 0.89,
      candidates: [
        { id: 'APP-2024-8890', name: 'Rahmad Hidayat', similarity: 0.78 },
      ],
    },
    documents: docs('APP-2025-0002'),
    visits: [
      visit('VST-4001', '2025-10-20T03:00:00Z', 'IN_PROGRESS'),
    ],
    timeline: [
      { at: '2025-10-15T07:10:00Z', by: 'system', action: 'SUBMITTED' },
      { at: '2025-10-15T07:12:00Z', by: 'scoring', action: 'SCORED' },
      { at: '2025-10-18T06:20:00Z', by: 'ADM-1', action: 'FIELD_VISIT_REQUESTED' },
      { at: '2025-10-20T02:55:00Z', by: 'TKSK-1002', action: 'VISIT:IN_PROGRESS' },
    ],
    recommendedCluster: 'BPNT',
    recommendedPriority: 'SEDANG',
    clusterScore: 0.73,
    clusterStatus: 'IN_REVIEW',
    survey: {
      completed: true,
      status: 'disetujui',
      submittedAt: '2025-10-19T08:45:00Z',
      answers: {
        partB: {
          householdMembers: 3,
          schoolChildren: 'Ada (1 SD)',
          toddlers: 'Tidak ada',
          elderly: 'Ada (1 lansia)',
          disability: 'Tidak ada',
        },
        partC: {
          education: 'SMA/SMK',
          occupation: 'Pekerja lepas',
          income: 'Rp1.000.000 – Rp2.000.000',
          extraIncome: 'Tidak ada',
        },
        partD: {
          homeOwnership: 'Milik sendiri',
          floorType: 'Keramik',
          wallType: 'Tembok plester',
          roofType: 'Genteng/Beton',
          vehicle: 'Motor',
          savings: 'Tidak',
          lighting: 'Listrik PLN subsidi',
          waterSource: 'PDAM',
          cookingFuel: 'Gas LPG',
          toilet: 'Toilet sendiri di rumah',
          wasteDisposal: 'Got tertutup/tanki',
          sanitation: 'Sehat',
        },
        partE: {
          healthCheck: 'Ya',
        },
      },
    },
  },
  {
    personId: 'BEN-003',
    applicationId: 'APP-2025-0003',
    name: 'Andi Pratama',
    nik: '3271013234560003',
    dob: '1990-01-19',
    phone: '08123450003',
    region: { prov: 'Kepri', kab: 'Batam', kec: 'Sagulung', kel: 'Sungai Langkai' },
    householdSize: 5,
    scores: { ocr: 0.95, face: 0.9, liveness: 'OK' },
    status: 'FINAL_APPROVED',
    assignedTo: 'TKSK-1002',
    agingDays: 7,
    createdAt: '2025-10-10T05:30:00Z',
    flags: { duplicate_nik: false, duplicate_face: false, device_anomaly: false, similarity: 0.91 },
    documents: docs('APP-2025-0003'),
    visits: [
      visit('VST-4002', '2025-10-12T02:00:00Z', 'SUBMITTED'),
    ],
    timeline: [
      { at: '2025-10-10T05:30:00Z', by: 'system', action: 'SUBMITTED' },
      { at: '2025-10-10T05:31:00Z', by: 'scoring', action: 'SCORED' },
      { at: '2025-10-12T06:00:00Z', by: 'TKSK-1002', action: 'VISIT:SUBMITTED' },
      { at: '2025-10-13T04:10:00Z', by: 'ADM-1', action: 'STATUS:FINAL_APPROVED' },
    ],
    recommendedCluster: 'PKH',
    recommendedPriority: 'TINGGI',
    clusterScore: 0.9,
    clusterStatus: 'APPROVED',
    reviewer: 'TKSK-1002',
    reviewedAt: '2025-10-13T04:00:00Z',
    clusterNotes: 'Telah diverifikasi lapangan dan layak menerima PKH.',
    survey: {
      completed: true,
      status: 'diperiksa',
      submittedAt: '2025-10-11T09:20:00Z',
      answers: {
        partB: {
          householdMembers: 5,
          schoolChildren: 'Ada (2 SD)',
          toddlers: 'Ada (1 balita)',
          elderly: 'Tidak ada',
          disability: 'Tidak ada',
        },
        partC: {
          education: 'SMP',
          occupation: 'Buruh harian',
          income: '< Rp 1.000.000',
          extraIncome: 'Istri jualan kue',
        },
        partD: {
          homeOwnership: 'Kontrak',
          floorType: 'Semen',
          wallType: 'Kayu',
          roofType: 'Seng',
          vehicle: 'Tidak punya',
          savings: 'Tidak',
          lighting: 'Listrik PLN non-subsidi',
          waterSource: 'Sumur gali',
          cookingFuel: 'Kayu bakar',
          toilet: 'Toilet bersama',
          wasteDisposal: 'Dibiarkan mengalir',
          sanitation: 'Kurang sehat',
        },
        partE: {
          healthCheck: 'Kadang-kadang',
        },
      },
    },
  },
  {
    personId: 'BEN-004',
    applicationId: 'APP-2025-0004',
    name: 'Lestari Dewi',
    nik: '3271014234560004',
    dob: '1994-09-02',
    phone: '08123450004',
    region: { prov: 'Kepri', kab: 'Batam', kec: 'Batu Aji', kel: 'Buliang' },
    householdSize: 2,
    scores: { ocr: 0.85, face: 0.79, liveness: 'OK' },
    status: 'RETURNED_FOR_REVISION',
    assignedTo: null,
    agingDays: 6,
    createdAt: '2025-10-12T09:00:00Z',
    flags: { duplicate_nik: false, duplicate_face: false, device_anomaly: false, similarity: 0.76 },
    documents: docs('APP-2025-0004'),
    visits: [],
    timeline: [
      { at: '2025-10-12T09:00:00Z', by: 'system', action: 'SUBMITTED' },
      { at: '2025-10-12T09:02:00Z', by: 'scoring', action: 'SCORED' },
      { at: '2025-10-16T02:40:00Z', by: 'ADM-1', action: 'STATUS:RETURNED_FOR_REVISION', reason: 'Perlu dokumen KK terbaru' },
    ],
    recommendedCluster: 'BPNT',
    recommendedPriority: 'SEDANG',
    clusterScore: 0.65,
    clusterStatus: 'PENDING_REVIEW',
    survey: {
      completed: false,
      status: 'antrean',
      submittedAt: '2025-10-16T04:00:00Z',
    },
  },
  {
    personId: 'BEN-005',
    applicationId: 'APP-2025-0005',
    name: 'Budi Santoso',
    nik: '3271015234560005',
    dob: '1982-03-11',
    phone: '08123450005',
    region: { prov: 'Kepri', kab: 'Batam', kec: 'Nongsa', kel: 'Kabil' },
    householdSize: 3,
    scores: { ocr: 0.8, face: 0.77, liveness: 'OK' },
    status: 'SUBMITTED',
    assignedTo: null,
    agingDays: 1,
    createdAt: '2025-10-20T11:05:00Z',
    flags: { duplicate_nik: false, duplicate_face: false, device_anomaly: false, similarity: 0.7 },
    documents: docs('APP-2025-0005'),
    visits: [],
    timeline: [
      { at: '2025-10-20T11:05:00Z', by: 'system', action: 'SUBMITTED' },
    ],
    recommendedCluster: 'PBI',
    recommendedPriority: 'RENDAH',
    clusterScore: 0.58,
    clusterStatus: 'PENDING_REVIEW',
  },
  {
    personId: 'BEN-006',
    applicationId: 'APP-2025-0006',
    name: 'Nur Aisyah',
    nik: '3271016234560006',
    dob: '1992-07-14',
    phone: '08123450006',
    region: { prov: 'Kepri', kab: 'Tanjung Pinang', kec: 'Bukit Bestari', kel: 'Dompak' },
    householdSize: 4,
    scores: { ocr: 0.88, face: 0.72, liveness: 'OK' },
    status: 'FINAL_REJECTED',
    assignedTo: 'TKSK-1002',
    agingDays: 9,
    createdAt: '2025-10-05T06:45:00Z',
    flags: {
      duplicate_nik: false,
      duplicate_face: true,
      device_anomaly: true,
      similarity: 0.93,
      candidates: [
        { id: 'APP-2024-7711', name: 'Nur Aisya', similarity: 0.82 },
        { id: 'APP-2023-5520', name: 'Nur Ajeng', similarity: 0.76 },
      ],
    },
    documents: docs('APP-2025-0006'),
    visits: [],
    timeline: [
      { at: '2025-10-05T06:45:00Z', by: 'system', action: 'SUBMITTED' },
      { at: '2025-10-05T06:47:00Z', by: 'scoring', action: 'SCORED' },
      { at: '2025-10-08T03:30:00Z', by: 'ADM-1', action: 'STATUS:FINAL_REJECTED', reason: 'Face match rendah dan anomali perangkat' },
    ],
    recommendedCluster: 'LAINNYA',
    recommendedPriority: 'RENDAH',
    clusterScore: 0.49,
    clusterStatus: 'IN_REVIEW',
  },
  {
    personId: 'BEN-007',
    applicationId: 'APP-2025-0007',
    name: 'Fajar Maulana',
    nik: '3271017234560007',
    dob: '1988-11-03',
    phone: '08123450007',
    region: { prov: 'Kepri', kab: 'Batam', kec: 'Batu Ampar', kel: 'Tanjung Sengkuang' },
    householdSize: 6,
    scores: { ocr: 0.94, face: 0.92, liveness: 'OK' },
    status: 'DISBURSEMENT_READY',
    assignedTo: 'TKSK-1002',
    agingDays: 11,
    createdAt: '2025-10-01T04:20:00Z',
    flags: { duplicate_nik: false, duplicate_face: false, device_anomaly: false, similarity: 0.95 },
    documents: docs('APP-2025-0007'),
    visits: [visit('VST-4003', '2025-10-04T01:30:00Z', 'VERIFIED')],
    timeline: [
      { at: '2025-10-01T04:20:00Z', by: 'system', action: 'SUBMITTED' },
      { at: '2025-10-01T04:21:00Z', by: 'scoring', action: 'SCORED' },
      { at: '2025-10-04T02:10:00Z', by: 'TKSK-1002', action: 'VISIT:VERIFIED' },
      { at: '2025-10-05T05:45:00Z', by: 'ADM-1', action: 'STATUS:FINAL_APPROVED' },
      { at: '2025-10-06T08:00:00Z', by: 'ADM-1', action: 'STATUS:DISBURSEMENT_READY' },
    ],
    recommendedCluster: 'PKH',
    recommendedPriority: 'TINGGI',
    clusterScore: 0.93,
    clusterStatus: 'APPROVED',
    reviewer: 'TKSK-1002',
    reviewedAt: '2025-10-05T05:30:00Z',
    clusterNotes: 'Prioritas tinggi, keluarga dengan 4 anak sekolah.',
  },
  {
    personId: 'BEN-008',
    applicationId: 'APP-2025-0008',
    name: 'Sari Melati',
    nik: '3271018234560008',
    dob: '1996-02-22',
    phone: '08123450008',
    region: { prov: 'Kepri', kab: 'Batam', kec: 'Sekupang', kel: 'Patam Lestari' },
    householdSize: 3,
    scores: { ocr: 0.89, face: 0.84, liveness: 'OK' },
    status: 'FIELD_VISIT',
    assignedTo: null,
    agingDays: 3,
    createdAt: '2025-10-17T07:40:00Z',
    flags: { duplicate_nik: false, duplicate_face: false, device_anomaly: false, similarity: 0.8 },
    documents: docs('APP-2025-0008'),
    visits: [visit('VST-4004', '2025-10-22T04:30:00Z', 'PLANNED')],
    timeline: [
      { at: '2025-10-17T07:40:00Z', by: 'system', action: 'SUBMITTED' },
      { at: '2025-10-17T07:41:00Z', by: 'scoring', action: 'SCORED' },
      { at: '2025-10-19T08:15:00Z', by: 'ADM-1', action: 'FIELD_VISIT_REQUESTED' },
    ],
    recommendedCluster: 'BPNT',
    recommendedPriority: 'SEDANG',
    clusterScore: 0.69,
    clusterStatus: 'PENDING_REVIEW',
  },
  {
    personId: 'BEN-009',
    applicationId: 'APP-2025-0009',
    name: 'Dedi Kurniawan',
    nik: '3271019234560009',
    dob: '1985-05-09',
    phone: '08123450009',
    region: { prov: 'Kepri', kab: 'Batam', kec: 'Batu Aji', kel: 'Telaga Punggur' },
    householdSize: 4,
    scores: { ocr: 0.82, face: 0.8, liveness: 'OK' },
    status: 'DESK_REVIEW',
    assignedTo: null,
    agingDays: 5,
    createdAt: '2025-10-16T09:55:00Z',
    flags: {
      duplicate_nik: true,
      duplicate_face: false,
      device_anomaly: false,
      similarity: 0.88,
      candidates: [
        { id: 'APP-2024-5521', name: 'Deddy Kurniawan', similarity: 0.74 },
      ],
    },
    documents: docs('APP-2025-0009'),
    visits: [],
    timeline: [
      { at: '2025-10-16T09:55:00Z', by: 'system', action: 'SUBMITTED' },
      { at: '2025-10-16T09:56:00Z', by: 'scoring', action: 'SCORED' },
      { at: '2025-10-17T12:20:00Z', by: 'ADM-1', action: 'DESK_REVIEW_STARTED' },
    ],
    recommendedCluster: 'PBI',
    recommendedPriority: 'SEDANG',
    clusterScore: 0.62,
    clusterStatus: 'PENDING_REVIEW',
  },
  {
    personId: 'BEN-010',
    applicationId: 'APP-2025-0010',
    name: 'Lina Marlina',
    nik: '3271020234560010',
    dob: '1998-12-18',
    phone: '08123450010',
    region: { prov: 'Kepri', kab: 'Batam', kec: 'Sekupang', kel: 'Tg Pinggir' },
    householdSize: 2,
    scores: { ocr: 0.87, face: 0.82, liveness: 'OK' },
    status: 'SUBMITTED',
    assignedTo: null,
    agingDays: 0,
    createdAt: '2025-10-21T13:15:00Z',
    flags: { duplicate_nik: false, duplicate_face: false, device_anomaly: false, similarity: 0.68 },
    documents: docs('APP-2025-0010'),
    visits: [],
    timeline: [
      { at: '2025-10-21T13:15:00Z', by: 'system', action: 'SUBMITTED' },
    ],
    recommendedCluster: 'LAINNYA',
    recommendedPriority: 'RENDAH',
    clusterScore: 0.55,
    clusterStatus: 'PENDING_REVIEW',
  },
]
