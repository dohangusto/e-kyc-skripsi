import { useKycFlow } from "@presentation/hooks/useKycFlow";

export default function OnboardingWizard() {
  const { state, dispatch, uc } = useKycFlow();

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">E-KYC Onboarding</h1>
      <p className="text-sm text-slate-600">Step: {state.step}</p>

      {state.step === "UPLOAD_KTP" && (
        <div className="space-y-2">
          <input type="file" accept="image/*"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              dispatch({ type: "SET_KTP", file: f });
              const ocr = await uc.extractKtp(f);
              dispatch({ type: "SET_OCR", ocr });
              dispatch({ type: "NEXT" });
            }}
          />
        </div>
      )}

      {state.step === "OCR_REVIEW" && (
        <div className="space-y-2">
          <pre className="text-xs bg-slate-100 p-2 rounded">{JSON.stringify(state.ocr, null, 2)}</pre>
          <div className="flex gap-2">
            <button className="px-3 py-2 bg-slate-200 rounded" onClick={() => dispatch({ type: "BACK" })}>Back</button>
            <button className="px-3 py-2 bg-black text-white rounded" onClick={() => dispatch({ type: "NEXT" })}>Next</button>
          </div>
        </div>
      )}

      {state.step === "SELFIE" && (
        <div className="space-y-2">
          <input type="file" accept="image/*" onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) { dispatch({ type: "SET_SELFIE", file: f }); }
          }} />
          <button className="px-3 py-2 bg-black text-white rounded" disabled={!state.artifacts.selfieImage} onClick={() => dispatch({ type: "NEXT" })}>Next</button>
        </div>
      )}

      {state.step === "FACE_MATCH" && state.artifacts.ktpImage && state.artifacts.selfieImage && (
        <div className="space-y-2">
          <button className="px-3 py-2 bg-black text-white rounded"
            onClick={async () => {
              const r = await uc.compareFace(state.artifacts.ktpImage!, state.artifacts.selfieImage!);
              dispatch({ type: "SET_FACE", face: r });
            }}>
            Run Face Match
          </button>
          <pre className="text-xs bg-slate-100 p-2 rounded">{JSON.stringify(state.face, null, 2)}</pre>
          <button className="px-3 py-2 bg-black text-white rounded" disabled={!state.face} onClick={() => dispatch({ type: "NEXT" })}>Next</button>
        </div>
      )}

      {state.step === "LIVENESS" && state.artifacts.selfieImage && (
        <div className="space-y-2">
          <button className="px-3 py-2 bg-black text-white rounded"
            onClick={async () => {
              const r = await uc.checkLiveness(state.artifacts.selfieImage!);
              dispatch({ type: "SET_LIVE", live: r });
            }}>
            Check Liveness
          </button>
          <pre className="text-xs bg-slate-100 p-2 rounded">{JSON.stringify(state.live, null, 2)}</pre>
          <button className="px-3 py-2 bg-black text-white rounded" disabled={!state.live?.passed} onClick={() => dispatch({ type: "NEXT" })}>Next</button>
        </div>
      )}

      {state.step === "DATA_ENTRY" && (
        <div className="space-y-2">
          <input className="border p-2 rounded w-full" placeholder="Phone" onChange={(e) => dispatch({ type: "PATCH_APPLICANT", patch: { phone: e.target.value }})}/>
          <input className="border p-2 rounded w-full" placeholder="Email" onChange={(e) => dispatch({ type: "PATCH_APPLICANT", patch: { email: e.target.value }})}/>
          <div className="flex gap-2">
            <button className="px-3 py-2 bg-slate-200 rounded" onClick={() => dispatch({ type: "BACK" })}>Back</button>
            <button className="px-3 py-2 bg-black text-white rounded" onClick={() => dispatch({ type: "NEXT" })}>Next</button>
          </div>
        </div>
      )}

      {state.step === "REVIEW_SUBMIT" && (
        <div className="space-y-2">
          <pre className="text-xs bg-slate-100 p-2 rounded">{JSON.stringify({ocr: state.ocr, face: state.face, live: state.live, draft: state.applicantDraft}, null, 2)}</pre>
          <button className="px-3 py-2 bg-black text-white rounded"
            onClick={async () => {
              try {
                dispatch({ type: "SUBMIT_START" });
                const applicant = {
                  number: state.ocr?.number || "",
                  name: state.ocr?.name || "",
                  birthDate: state.ocr?.birthDate || "",
                  address: state.ocr?.address || "",
                  phone: state.applicantDraft.phone || "",
                  email: state.applicantDraft.email || "",
                };
                const res = await uc.submitKyc(applicant as any, state.artifacts);
                dispatch({ type: "SUBMIT_SUCCESS", id: res.id });
              } catch (e: any) {
                dispatch({ type: "SUBMIT_FAIL", error: e?.message ?? "Unknown error" });
              }
            }}>
            Submit
          </button>
          {state.error && <p className="text-red-600 text-sm">{state.error}</p>}
        </div>
      )}

      {state.step === "DONE" && (
        <div className="text-center space-y-1">
          <p className="text-xl font-semibold">Submitted!</p>
          <p className="text-sm text-slate-600">ID: {state.submissionId}</p>
        </div>
      )}
    </div>
  );
}
