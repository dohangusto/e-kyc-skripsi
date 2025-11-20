import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from "react";
import type { ReactNode, Dispatch } from "react";

import {
  createEkycApi,
  type EkycSession,
} from "@infrastructure/services/ekyc-api";
import {
  Applicant,
  OcrResult,
  FaceMatchingScore,
  LivenessResult,
} from "@domain/types";
import {
  KYC_STEPS,
  INITIAL_STEP,
  type StepKey,
} from "@domain/value-objects/kyc-flow";

export const ALL_STEPS: readonly StepKey[] = KYC_STEPS;

type Artifacts = { ktpImage?: File; selfieImage?: File };

interface State {
  step: StepKey;
  artifacts: Artifacts;
  sessionId?: string;
  session?: EkycSession;
  submitting: boolean;
  syncing: boolean;

  ocr?: OcrResult;
  face?: FaceMatchingScore;
  live?: LivenessResult;

  applicantDraft: Partial<Applicant>;

  submissionId?: string;
  error?: string;
}

type Action =
  | { type: "NEXT" }
  | { type: "BACK" }
  | { type: "GOTO"; step: StepKey }
  | { type: "SET_KTP"; file?: File }
  | { type: "SET_SELFIE"; file?: File }
  | { type: "SET_OCR"; ocr: OcrResult }
  | {
      type: "PATCH_OCR";
      patch: Partial<{
        number: string;
        name: string;
        birthDate: string;
        address: string;
      }>;
    }
  | { type: "SET_FACE"; face: FaceMatchingScore }
  | { type: "SET_LIVE"; live: LivenessResult }
  | { type: "PATCH_APPLICANT"; patch: Partial<Applicant> }
  | { type: "SUBMIT_START" }
  | { type: "SUBMIT_SUCCESS"; id: string }
  | { type: "SUBMIT_FAIL"; error: string }
  | { type: "SET_SESSION"; session: EkycSession }
  | { type: "UPDATE_SESSION"; session: EkycSession }
  | { type: "SET_SYNCING"; syncing: boolean }
  | { type: "SET_ERROR"; error?: string };

const initialState: State = {
  step: INITIAL_STEP,
  artifacts: {},
  applicantDraft: {},
  submitting: false,
  syncing: false,
};

function reduce(state: State, action: Action): State {
  const idx = KYC_STEPS.indexOf(state.step);
  switch (action.type) {
    case "NEXT":
      return {
        ...state,
        step: KYC_STEPS[Math.min(idx + 1, KYC_STEPS.length - 1)],
      };
    case "BACK":
      return { ...state, step: KYC_STEPS[Math.max(idx - 1, 0)] };
    case "GOTO":
      return { ...state, step: action.step };
    case "SET_KTP":
      return {
        ...state,
        artifacts: { ...state.artifacts, ktpImage: action.file },
      };
    case "SET_SELFIE":
      return {
        ...state,
        artifacts: { ...state.artifacts, selfieImage: action.file },
      };
    case "SET_OCR":
      return { ...state, ocr: action.ocr };
    case "PATCH_OCR": {
      return {
        ...state,
        ocr: { ...(state.ocr ?? { confidence: 0 }), ...action.patch },
      };
    }
    case "SET_FACE":
      return { ...state, face: action.face };
    case "SET_LIVE":
      return { ...state, live: action.live };
    case "PATCH_APPLICANT":
      return {
        ...state,
        applicantDraft: { ...state.applicantDraft, ...action.patch },
      };
    case "SUBMIT_START":
      return { ...state, submitting: true, error: undefined };
    case "SUBMIT_SUCCESS":
      return {
        ...state,
        submitting: false,
        submissionId: action.id,
        step: "DONE",
      };
    case "SUBMIT_FAIL":
      return { ...state, submitting: false, error: action.error };
    case "SET_SESSION":
      return {
        ...state,
        sessionId: action.session.id,
        session: action.session,
        error: undefined,
      };
    case "UPDATE_SESSION":
      return { ...state, session: action.session };
    case "SET_SYNCING":
      return { ...state, syncing: action.syncing };
    case "SET_ERROR":
      return { ...state, error: action.error };
    default:
      return state;
  }
}

// TODO: Make delayed parallel request to gateway

type KycFlowContextValue = {
  state: State;
  dispatch: Dispatch<Action>;
  api: ReturnType<typeof createEkycApi>;
};

const KycFlowContext = createContext<KycFlowContextValue | null>(null);

function useProvideKycFlow() {
  const [state, dispatch] = useReducer(reduce, initialState);
  const api = useMemo(() => createEkycApi(), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      dispatch({ type: "SET_SYNCING", syncing: true });
      try {
        const session = await api.createSession();
        if (!cancelled) {
          dispatch({ type: "SET_SESSION", session });
        }
      } catch (err: any) {
        if (!cancelled) {
          dispatch({
            type: "SET_ERROR",
            error: err?.message ?? "Gagal membuat sesi e-KYC",
          });
        }
      } finally {
        if (!cancelled) {
          dispatch({ type: "SET_SYNCING", syncing: false });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api]);

  useEffect(() => {
    if (!state.sessionId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const poll = async () => {
      try {
        const session = await api.getSession(state.sessionId!);
        if (cancelled) return;
        dispatch({ type: "UPDATE_SESSION", session });
        if (session.status !== "COMPLETED") {
          timer = setTimeout(poll, 5000);
        }
      } catch {
        if (!cancelled) {
          timer = setTimeout(poll, 7000);
        }
      }
    };

    poll();

    return () => {
      cancelled = true;
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [api, state.sessionId]);

  return useMemo(() => ({ state, dispatch, api }), [state, api]);
}

export function KycFlowProvider({ children }: { children: ReactNode }) {
  const value = useProvideKycFlow();
  return (
    <KycFlowContext.Provider value={value}>{children}</KycFlowContext.Provider>
  );
}

export function useKycFlow() {
  const ctx = useContext(KycFlowContext);
  if (!ctx) {
    throw new Error("useKycFlow must be used within KycFlowProvider");
  }
  return ctx;
}

export function useKycStep(step: StepKey) {
  const { state } = useKycFlow();
  return state.step === step;
}

export type { StepKey } from "@domain/value-objects/kyc-flow";
