import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { Data } from "@application/services/data-service";
import { useDataSnapshot } from "@application/services/useDataSnapshot";
import { StatusPill } from "@presentation/components/StatusPill";
import { ScoreBadge } from "@presentation/components/ScoreBadge";
import { ConfirmModal } from "@presentation/components/ConfirmModal";
import { Toast } from "@presentation/components/Toast";
import { PageIntro } from "@presentation/components/PageIntro";
import { getSession } from "@shared/session";
import { DocumentGallery } from "@presentation/components/DocumentGallery";
import { VisitManager } from "@presentation/components/VisitManager";
import { RoleGate } from "@presentation/components/RoleGate";
import type { Application, AuditEntry, SurveyStatus } from "@domain/types";

type ActionModal = "APPROVE" | "READY" | "REJECT" | "RETURN";

const returnSchema = z.object({
  reason: z.string().min(10, "Minimal 10 karakter"),
  fields: z.array(z.string()).min(1, "Pilih minimal 1 field"),
});
const rejectSchema = z.object({
  reason: z.string().min(10, "Minimal 10 karakter"),
  code: z.string().min(3, "Kode minimal 3 karakter"),
});

const TABS = [
  { key: "summary", label: "Summary" },
  { key: "documents", label: "Documents" },
  { key: "tksk", label: "TKSK" },
  { key: "audit", label: "Audit" },
];

export default function ApplicationDetailPage({ id }: { id: string }) {
  const snapshot = useDataSnapshot();
  const application = useMemo(
    () => snapshot.applications.find((app) => app.id === id) ?? null,
    [snapshot.applications, id],
  );
  const [loadingDetail, setLoadingDetail] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tab, setTab] = useState<"summary" | "documents" | "tksk" | "audit">(
    "summary",
  );
  const [modal, setModal] = useState<{
    type: ActionModal;
    candidate?: string;
  } | null>(null);
  const [returnForm, setReturnForm] = useState({
    reason: "",
    fields: [] as string[],
  });
  const [rejectForm, setRejectForm] = useState({ reason: "", code: "" });
  const session = getSession();
  const status = application?.status ?? "";
  const canReview = [
    "DESK_REVIEW",
    "FIELD_VISIT",
    "RETURNED_FOR_REVISION",
  ].includes(status);
  const canSetReady = status === "FINAL_APPROVED";
  const isReady = status === "DISBURSEMENT_READY";
  const isRejected = status === "FINAL_REJECTED";
  const isApproved = status === "FINAL_APPROVED" || isReady;

  useEffect(() => {
    let active = true;
    setLoadingDetail(true);
    setLoadError(null);
    Data.fetchApplication(id)
      .catch((err) => {
        if (!active) return;
        setLoadError((err as Error).message);
      })
      .finally(() => {
        if (active) setLoadingDetail(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  if (!application)
    return (
      <div className="text-sm text-slate-600">
        {loadingDetail ? "Memuat detail aplikasi..." : "Data tidak ditemukan."}
      </div>
    );
  if (session?.role === "TKSK" && application.assigned_to !== session.userId) {
    return (
      <div className="text-sm text-slate-600">
        Anda tidak memiliki akses ke aplikasi ini.
      </div>
    );
  }

  async function run(action: () => Promise<unknown>, success: string) {
    try {
      await action();
      Toast.show(success);
    } catch (e) {
      Toast.show("Gagal: " + (e as Error).message, "error");
    } finally {
      setModal(null);
    }
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-slate-900">
              {application.applicant.name}
            </h1>
            <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-mono text-slate-600">
              {application.id}
            </span>
          </div>
          <p className="text-sm text-slate-600">
            {application.region.kab} / {application.region.kec} ·{" "}
            {application.region.kel}
          </p>
          <p className="text-xs text-slate-500">
            Dibuat: {new Date(application.created_at).toLocaleString("id-ID")}
          </p>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <StatusPill status={application.status} />
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
            <div className="text-[11px] uppercase tracking-wide text-slate-500">
              Verifikasi biometrik
            </div>
            <ScoreBadge
              face={application.scores.face}
              liveness={application.scores.liveness}
            />
          </div>
        </div>
      </header>
      <PageIntro>
        Ringkasan pengajuan, dokumen e-KYC, jadwal TKSK, dan catatan audit dalam
        satu tempat.
      </PageIntro>

      {loadError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded p-3">
          Gagal memuat detail terbaru: {loadError}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
          <header className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Keputusan verifikasi
              </p>
              <h3 className="text-sm font-semibold text-slate-800">
                Tindak lanjuti hasil review
              </h3>
            </div>
            <StatusPill status={application.status} />
          </header>
          <div className="flex flex-wrap gap-2">
            <RoleGate allow={["ADMIN"]}>
              {canReview && (
                <>
                  <button
                    className="px-3 py-2 rounded border border-slate-200 text-sm text-slate-700 hover:bg-slate-50"
                    onClick={() => setModal({ type: "RETURN" })}
                  >
                    Return
                  </button>
                  <button
                    className="px-3 py-2 rounded border border-rose-200 text-sm text-rose-700 bg-rose-50 hover:bg-rose-100"
                    onClick={() => setModal({ type: "REJECT" })}
                  >
                    Reject
                  </button>
                  <button
                    className="px-3 py-2 rounded border border-emerald-200 text-sm text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                    onClick={() => setModal({ type: "APPROVE" })}
                  >
                    Approve
                  </button>
                </>
              )}
              {isRejected && (
                <p className="text-sm text-rose-600">
                  Aplikasi sudah ditolak. Tidak ada aksi lain.
                </p>
              )}
              {isApproved && !isReady && (
                <p className="text-sm text-emerald-700">
                  Pengajuan telah disetujui.
                </p>
              )}
              {isReady && (
                <p className="text-sm text-blue-700">
                  Status: siap penyaluran/disbursement.
                </p>
              )}
            </RoleGate>
          </div>
        </section>
        <section className="rounded-xl border border-blue-200 bg-blue-50 p-4 shadow-sm space-y-3">
          <header className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-blue-700">
                Langkah penyaluran
              </p>
              <h3 className="text-sm font-semibold text-blue-900">
                Tandai kesiapan salur
              </h3>
              <p className="text-xs text-blue-800">
                Gunakan setelah verifikasi final disetujui.
              </p>
            </div>
          </header>
          <RoleGate allow={["ADMIN"]}>
            {canSetReady && (
              <button
                className="px-3 py-2 rounded bg-blue-600 text-white text-sm hover:bg-blue-700"
                onClick={() => setModal({ type: "READY" })}
              >
                Tandai Disbursement Ready
              </button>
            )}
            {isReady && (
              <div className="inline-flex items-center gap-2 rounded-full bg-white border border-blue-200 px-3 py-1 text-sm text-blue-700">
                ✅ Sudah diset ke DISBURSEMENT_READY
              </div>
            )}
            {!canSetReady && !isReady && (
              <p className="text-sm text-blue-800">
                Disbursement Ready tersedia setelah status FINAL_APPROVED.
              </p>
            )}
          </RoleGate>
        </section>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <nav
          role="tablist"
          aria-label="Application detail tabs"
          className="flex flex-wrap gap-2 border-b bg-slate-50 px-3 py-2"
        >
          {TABS.map((t) => (
            <button
              role="tab"
              key={t.key}
              aria-selected={tab === t.key}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition ${tab === t.key ? "bg-blue-600 text-white shadow" : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"}`}
              onClick={() => setTab(t.key as typeof tab)}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <div className="p-3">
          {tab === "summary" && <SummaryTab application={application} />}
          {tab === "documents" && (
            <DocumentsTab application={application} loading={loadingDetail} />
          )}
          {tab === "tksk" && <VisitManager app={application} />}
          {tab === "audit" && (
            <AuditTab appId={application.id} rows={snapshot.audit} />
          )}
        </div>
      </div>

      {modal?.type === "APPROVE" && (
        <ConfirmModal
          title="Approve Application"
          min={10}
          onCancel={() => setModal(null)}
          onConfirm={(reason) =>
            run(
              () =>
                Data.updateStatus(
                  application.id,
                  "FINAL_APPROVED",
                  session?.userId || "system",
                  reason,
                ),
              "Disetujui",
            )
          }
        />
      )}
      {modal?.type === "READY" && (
        <ConfirmModal
          title="Set Disbursement Ready"
          min={5}
          onCancel={() => setModal(null)}
          onConfirm={(reason) =>
            run(
              () =>
                Data.updateStatus(
                  application.id,
                  "DISBURSEMENT_READY",
                  session?.userId || "system",
                  reason,
                ),
              "Siap disbursement",
            )
          }
        />
      )}

      {modal?.type === "RETURN" && (
        <ReturnModal
          value={returnForm}
          onChange={setReturnForm}
          onCancel={() => {
            setModal(null);
            setReturnForm({ reason: "", fields: [] });
          }}
          onSubmit={() => {
            const parsed = returnSchema.safeParse(returnForm);
            if (!parsed.success) {
              const msg = parsed.error.issues[0]?.message || "Invalid";
              Toast.show(msg, "error");
              return;
            }
            run(
              () =>
                Data.updateStatus(
                  application.id,
                  "RETURNED_FOR_REVISION",
                  session?.userId || "system",
                  `${returnForm.fields.join(", ")} :: ${returnForm.reason}`,
                ),
              "Dikembalikan ke nasabah",
            );
            setReturnForm({ reason: "", fields: [] });
          }}
        />
      )}

      {modal?.type === "REJECT" && (
        <RejectModal
          value={rejectForm}
          onChange={setRejectForm}
          onCancel={() => {
            setModal(null);
            setRejectForm({ reason: "", code: "" });
          }}
          onSubmit={() => {
            const parsed = rejectSchema.safeParse(rejectForm);
            if (!parsed.success) {
              const msg = parsed.error.issues[0]?.message || "Invalid";
              Toast.show(msg, "error");
              return;
            }
            run(
              () =>
                Data.updateStatus(
                  application.id,
                  "FINAL_REJECTED",
                  session?.userId || "system",
                  `${rejectForm.code} :: ${rejectForm.reason}`,
                ),
              "Ditolak",
            );
            setRejectForm({ reason: "", code: "" });
          }}
        />
      )}
    </div>
  );
}

function DocumentsTab({
  application,
  loading,
}: {
  application: Application;
  loading?: boolean;
}) {
  return (
    <section className="space-y-4" role="tabpanel">
      {application.documents.length > 0 ? (
        <DocumentGallery documents={application.documents} />
      ) : (
        <div className="rounded border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
          {loading
            ? "Mengambil dokumen e-KYC dan survei..."
            : "Belum ada dokumen yang diunggah."}
        </div>
      )}
      <SurveyPanel survey={application.survey} />
    </section>
  );
}

function SurveyPanel({ survey }: { survey?: Application["survey"] }) {
  if (!survey) {
    return (
      <aside
        className="bg-white border rounded p-4 text-sm space-y-2"
        aria-label="Survey keluarga"
      >
        <header>
          <h3 className="text-base font-semibold">Survey Keluarga</h3>
          <p className="text-xs text-slate-500">
            Belum ada data survey yang dikumpulkan.
          </p>
        </header>
      </aside>
    );
  }

  const statusLabel = survey.status
    ? formatSurveyStatus(survey.status)
    : "Status belum tersedia";
  const submitted = survey.submitted_at
    ? formatSurveyDate(survey.submitted_at)
    : "Belum pernah";
  const statusTone = survey.status
    ? getSurveyStatusTone(survey.status)
    : "bg-slate-200 text-slate-700";

  return (
    <aside
      className="bg-white border rounded p-4 text-sm space-y-4"
      aria-label="Survey keluarga"
    >
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-semibold">Survey Keluarga</h3>
          <p className="text-xs text-slate-500">
            Rekap jawaban survey kesejahteraan keluarga.
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-1 text-xs font-medium px-3 py-1 rounded-full ${statusTone}`}
        >
          {statusLabel}
        </span>
      </header>

      <div className="grid gap-3 sm:grid-cols-3 text-xs">
        <MetadataItem label="Terakhir dikirim" value={submitted} />
        <MetadataItem
          label="Survey selesai"
          value={survey.completed ? "Ya" : "Belum"}
        />
        <MetadataItem
          label="Jumlah bagian terisi"
          value={survey.answers ? "Lengkap" : "Belum lengkap"}
        />
      </div>

      {survey.answers ? (
        <div className="space-y-4">
          <SurveySection
            title="B. Kondisi Keluarga"
            fields={[
              {
                label: "Status dalam keluarga",
                value: survey.answers.partB.householdRole,
              },
              {
                label: "Jumlah tanggungan",
                value: survey.answers.partB.dependents,
              },
              {
                label: "Jumlah anak sekolah",
                value: survey.answers.partB.schoolChildren,
              },
              {
                label: "Balita / anak usia dini",
                value: survey.answers.partB.toddlers,
              },
              { label: "Anggota lansia", value: survey.answers.partB.elderly },
              {
                label: "Disabilitas / penyakit kronis",
                value: survey.answers.partB.disability,
              },
            ]}
          />
          <SurveySection
            title="C. Pendidikan & Pekerjaan"
            fields={[
              {
                label: "Pendidikan terakhir",
                value: survey.answers.partC.education,
              },
              {
                label: "Pekerjaan kepala keluarga",
                value: survey.answers.partC.occupation,
              },
              {
                label: "Penghasilan per bulan",
                value: survey.answers.partC.income,
              },
            ]}
          />
          <SurveySection
            title="D. Kondisi Tempat Tinggal & Aset"
            fields={[
              {
                label: "Status kepemilikan rumah",
                value: survey.answers.partD.homeOwnership,
              },
              {
                label: "Jenis lantai rumah",
                value: survey.answers.partD.floorType,
              },
              {
                label: "Jenis dinding rumah",
                value: survey.answers.partD.wallType,
              },
              {
                label: "Jenis atap rumah",
                value: survey.answers.partD.roofType,
              },
              {
                label: "Bahan bakar memasak",
                value: survey.answers.partD.cookingFuel,
              },
              { label: "Jenis kloset", value: survey.answers.partD.toiletType },
              {
                label: "Fasilitas MCK",
                value: survey.answers.partD.toiletFacility,
              },
              {
                label: "Pembuangan akhir tinja",
                value: survey.answers.partD.sewageDisposal,
              },
              {
                label: "Sumber air minum",
                value: survey.answers.partD.waterSource,
              },
              {
                label: "Sumber energi listrik",
                value: survey.answers.partD.lighting,
              },
            ]}
          />
          <SurveySection
            title="E. Aset & Lahan"
            fields={[
              {
                label: "Aset bergerak",
                value: survey.answers.partE.movableAssets,
              },
              {
                label: "Jumlah aset bergerak",
                value: survey.answers.partE.movableAssetCount,
              },
              {
                label: "Aset tidak bergerak",
                value: survey.answers.partE.immovableAssets,
              },
              {
                label: "Jumlah aset tidak bergerak",
                value: survey.answers.partE.immovableAssetCount,
              },
              {
                label: "Kepemilikan lahan / ternak",
                value: survey.answers.partE.landOwnership,
              },
            ]}
          />
        </div>
      ) : (
        <div className="rounded border border-dashed border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
          Survey sudah tercatat namun jawaban detail belum lengkap.
        </div>
      )}
    </aside>
  );
}

function MetadataItem({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded border border-slate-200 bg-slate-50 p-3">
      <div className="text-[11px] uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-1 font-medium text-slate-700">{value}</div>
    </div>
  );
}

function SurveySection({
  title,
  fields,
}: {
  title: string;
  fields: Array<{ label: string; value: string | number | "" | undefined }>;
}) {
  return (
    <section className="space-y-3">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </h4>
      <div className="grid gap-2 sm:grid-cols-2">
        {fields.map((field) => (
          <div
            key={field.label}
            className="rounded border border-slate-200 bg-slate-50 p-3 text-xs"
          >
            <div className="text-[11px] uppercase tracking-wide text-slate-500">
              {field.label}
            </div>
            <div className="mt-1 font-medium text-slate-700">
              {formatSurveyValue(field.value)}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function formatSurveyValue(value: string | number | "" | undefined) {
  if (value === "" || value === undefined || value === null) return "—";
  return typeof value === "number" ? value.toString() : value;
}

function formatSurveyStatus(status: SurveyStatus) {
  if (!status) return "Status belum tersedia";
  const map: Record<string, string> = {
    "belum-dikumpulkan": "Belum dikumpulkan",
    antrean: "Dalam antrean",
    diperiksa: "Sedang diperiksa",
    disetujui: "Disetujui",
    ditolak: "Ditolak",
  };
  return map[status] ?? status;
}

function formatSurveyDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getSurveyStatusTone(status: SurveyStatus) {
  switch (status) {
    case "belum-dikumpulkan":
      return "bg-slate-200 text-slate-700";
    case "antrean":
      return "bg-amber-100 text-amber-600";
    case "diperiksa":
      return "bg-blue-100 text-blue-600";
    case "disetujui":
      return "bg-emerald-100 text-emerald-700";
    case "ditolak":
      return "bg-rose-100 text-rose-600";
    default:
      return "bg-slate-200 text-slate-700";
  }
}

function SummaryTab({ application }: { application: Application }) {
  return (
    <section className="space-y-4" role="tabpanel">
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Profil pemohon
            </h4>
            <div className="grid gap-3 sm:grid-cols-2 text-sm mt-2">
              <MetadataItem
                label="NIK"
                value={application.applicant.nik_mask}
              />
              <MetadataItem
                label="Phone"
                value={application.applicant.phone_mask}
              />
              <MetadataItem label="DOB" value={application.applicant.dob} />
              <MetadataItem
                label="Wilayah"
                value={`${application.region.prov} / ${application.region.kab} / ${application.region.kec} / ${application.region.kel}`}
              />
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-2">
            <h4 className="text-sm font-semibold text-slate-800">
              Ringkasan aplikasi
            </h4>
            <div className="grid gap-3 sm:grid-cols-3 text-sm">
              <MetadataItem label="ID Pengajuan" value={application.id} />
              <MetadataItem
                label="Dibuat pada"
                value={new Date(application.created_at).toLocaleString("id-ID")}
              />
              <MetadataItem
                label="Assign TKSK"
                value={application.assigned_to || "Belum ditugaskan"}
              />
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              {application.flags.duplicate_face && (
                <span className="rounded-full bg-amber-100 text-amber-700 px-2 py-1">
                  Dugaan wajah ganda
                </span>
              )}
              {application.flags.duplicate_nik && (
                <span className="rounded-full bg-amber-100 text-amber-700 px-2 py-1">
                  Dugaan NIK ganda
                </span>
              )}
              {application.flags.device_anomaly && (
                <span className="rounded-full bg-amber-100 text-amber-700 px-2 py-1">
                  Anomali perangkat
                </span>
              )}
              {application.flags.escalated && (
                <span className="rounded-full bg-rose-100 text-rose-700 px-2 py-1">
                  Perlu eskalasi
                </span>
              )}
              {!application.flags.duplicate_face &&
                !application.flags.duplicate_nik &&
                !application.flags.device_anomaly &&
                !application.flags.escalated && (
                  <span className="text-xs text-slate-500">
                    Tidak ada flag risiko.
                  </span>
                )}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-800">Timeline</h4>
              <span className="text-[11px] uppercase tracking-wide text-slate-500">
                Urut terbaru
              </span>
            </div>
            <ol className="relative mt-3 border-l border-slate-200 ml-4 space-y-3">
              {application.timeline
                .slice()
                .reverse()
                .map((t, i) => (
                  <li key={i} className="pl-3">
                    <span
                      className="absolute -left-[7px] mt-1 w-3 h-3 bg-blue-500 rounded-full"
                      aria-hidden="true"
                    />
                    <p className="text-xs text-slate-500">
                      {new Date(t.at).toLocaleString("id-ID")}
                    </p>
                    <p className="text-sm font-medium text-slate-800">
                      {t.action} · {t.by}
                    </p>
                    {t.reason && (
                      <p className="text-xs text-slate-500">{t.reason}</p>
                    )}
                  </li>
                ))}
              {application.timeline.length === 0 && (
                <li className="text-sm text-slate-500">Belum ada timeline.</li>
              )}
            </ol>
          </div>
        </div>

        <aside className="rounded-lg border border-slate-200 bg-white p-3 space-y-2">
          <h4 className="text-sm font-semibold text-slate-800">Skor & aging</h4>
          <div className="text-sm space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Face match</span>
              <span className="font-semibold text-slate-800">
                {application.scores.face}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Liveness</span>
              <span className="font-semibold text-slate-800">
                {application.scores.liveness}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Aging</span>
              <span className="font-semibold text-slate-800">
                {application.aging_days} hari
              </span>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

function AuditTab({ appId, rows }: { appId: string; rows: AuditEntry[] }) {
  const filtered = rows
    .filter((a) => a.entity === appId)
    .slice()
    .reverse();
  return (
    <section
      role="tabpanel"
      className="bg-white border rounded p-3 overflow-auto"
    >
      <table className="min-w-full text-sm">
        <thead className="bg-slate-100">
          <tr>
            <th className="text-left p-2">At</th>
            <th className="text-left p-2">Actor</th>
            <th className="text-left p-2">Action</th>
            <th className="text-left p-2">Reason</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((row, idx) => (
            <tr key={idx}>
              <td className="p-2 text-xs text-slate-500">
                {new Date(row.at).toLocaleString("id-ID")}
              </td>
              <td className="p-2">{row.actor}</td>
              <td className="p-2">{row.action}</td>
              <td className="p-2 text-xs text-slate-500">{row.reason || ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {filtered.length === 0 && (
        <p className="text-sm text-slate-500">Belum ada audit log.</p>
      )}
    </section>
  );
}

function ReturnModal({
  value,
  onChange,
  onCancel,
  onSubmit,
}: {
  value: { reason: string; fields: string[] };
  onChange: (next: { reason: string; fields: string[] }) => void;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  const fields = [
    "Foto KTP",
    "Foto Selfie",
    "Kartu Keluarga",
    "Alamat Domisili",
    "Koordinat Rumah",
  ];
  function toggle(field: string) {
    onChange({
      ...value,
      fields: value.fields.includes(field)
        ? value.fields.filter((f) => f !== field)
        : [...value.fields, field],
    });
  }
  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur grid place-items-center z-50 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded shadow max-w-lg w-full p-4 space-y-3">
        <h3 className="font-semibold">Return Application</h3>
        <div className="space-y-2">
          <p className="text-sm font-medium">Field diminta ulang</p>
          <div className="flex flex-wrap gap-2">
            {fields.map((f) => (
              <label
                key={f}
                className="text-xs border rounded px-2 py-1 flex items-center gap-1"
              >
                <input
                  type="checkbox"
                  checked={value.fields.includes(f)}
                  onChange={() => toggle(f)}
                />{" "}
                {f}
              </label>
            ))}
          </div>
        </div>
        <label className="text-sm flex flex-col gap-1">
          <span>Alasan (min 10 karakter)</span>
          <textarea
            className="border rounded p-2 h-24"
            value={value.reason}
            onChange={(e) => onChange({ ...value, reason: e.target.value })}
          />
        </label>
        <div className="flex justify-end gap-2">
          <button className="px-3 py-1 border rounded" onClick={onCancel}>
            Batal
          </button>
          <button
            className="px-3 py-1 border rounded bg-blue-600 text-white"
            onClick={onSubmit}
          >
            Return
          </button>
        </div>
      </div>
    </div>
  );
}

function RejectModal({
  value,
  onChange,
  onCancel,
  onSubmit,
}: {
  value: { reason: string; code: string };
  onChange: (next: { reason: string; code: string }) => void;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur grid place-items-center z-50 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded shadow max-w-lg w-full p-4 space-y-3">
        <h3 className="font-semibold">Reject Application</h3>
        <label className="text-sm flex flex-col gap-1">
          <span>Kode Penolakan</span>
          <input
            className="border rounded p-2"
            value={value.code}
            onChange={(e) => onChange({ ...value, code: e.target.value })}
            placeholder="contoh: RSK-101"
          />
        </label>
        <label className="text-sm flex flex-col gap-1">
          <span>Alasan (min 10 karakter)</span>
          <textarea
            className="border rounded p-2 h-24"
            value={value.reason}
            onChange={(e) => onChange({ ...value, reason: e.target.value })}
          />
        </label>
        <div className="flex justify-end gap-2">
          <button className="px-3 py-1 border rounded" onClick={onCancel}>
            Batal
          </button>
          <button
            className="px-3 py-1 border rounded bg-rose-600 text-white"
            onClick={onSubmit}
          >
            Reject
          </button>
        </div>
      </div>
    </div>
  );
}
