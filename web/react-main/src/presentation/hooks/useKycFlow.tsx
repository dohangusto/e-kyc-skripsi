import { createContext, useContext, useEffect, useMemo, useReducer, useRef } from "react";
import type { ReactNode, Dispatch } from "react";

import { buildUsecases } from "@application/services";

import { MockOCR } from "@infrastructure/adapters/mock-ocr";
import { MockFaceMatch } from "@infrastructure/adapters/mock-face-match";
import { MockLiveness } from "@infrastructure/adapters/mock-liveness";
import { MockSubmitter } from "@infrastructure/adapters/mock-submit";
import { LocalKycRepository } from "@infrastructure/adapters/local-kyc-repository";

import { Applicant, OcrResult, FaceMatchingScore, LivenessResult } from "@domain/types";
import { KYC_STEPS, INITIAL_STEP, type StepKey } from "@domain/value-objects/kyc-flow";
import type { KycRepository, KycProgress } from "@domain/repositories/kyc-repository";

export const ALL_STEPS: readonly StepKey[] = KYC_STEPS;

type Artifacts = { ktpImage?: File, selfieImage?: File};

interface State {
    step: StepKey;
    artifacts: Artifacts;
    submitting: boolean;

    ocr?: OcrResult;
    face?: FaceMatchingScore;
    live?: LivenessResult;

    applicantDraft: Partial<Applicant>;

    submissionId?: string;
    error?: string;
}

type Action =
    | { type: "NEXT" }
    | { type: "BACK"}
    | { type: "GOTO"; step: StepKey }
    | { type: "SET_KTP", file?: File}
    | { type: "SET_SELFIE", file?: File}
    | { type: "SET_OCR", ocr: OcrResult}
    | { type: "PATCH_OCR"; patch: Partial<{ number: string; name: string; birthDate: string; address: string }> }
    | { type: "SET_FACE", face: FaceMatchingScore}
    | { type: "SET_LIVE", live: LivenessResult}
    | { type: "PATCH_APPLICANT", patch: Partial<Applicant>}
    | { type: "SUBMIT_START"}
    | { type: "SUBMIT_SUCCESS", id: string}
    | { type: "SUBMIT_FAIL", error: string}
    | { type: "HYDRATE"; progress: KycProgress };

const initialState: State = {
    step: INITIAL_STEP,
    artifacts: {},
    applicantDraft: {},
    submitting: false,
};

function reduce(state: State, action: Action): State {
    const idx = KYC_STEPS.indexOf(state.step);
    switch (action.type) {
        case "NEXT": return { ...state, step: KYC_STEPS[Math.min(idx + 1, KYC_STEPS.length - 1)] };
        case "BACK": return { ...state, step: KYC_STEPS[Math.max(idx - 1, 0)] };
        case "GOTO": return { ...state, step: action.step };
        case "SET_KTP": return { ...state, artifacts: { ...state.artifacts, ktpImage: action.file } };
        case "SET_SELFIE": return { ...state, artifacts: { ...state.artifacts, selfieImage: action.file } };
        case "SET_OCR": return { ...state, ocr: action.ocr };
        case "PATCH_OCR": {
            return { ...state, ocr: { ...state.ocr, ...action.patch } };
        }
        case "SET_FACE": return { ...state, face: action.face };
        case "SET_LIVE": return { ...state, live: action.live };
        case "PATCH_APPLICANT": return { ...state, applicantDraft: { ...state.applicantDraft, ...action.patch } };
        case "SUBMIT_START": return { ...state, submitting: true, error: undefined };
        case "SUBMIT_SUCCESS": return { ...state, submitting: false, submissionId: action.id, step: "DONE" };
        case "SUBMIT_FAIL": return {...state, submitting: false, error: action.error };
        case "HYDRATE": {
            const safeStep = KYC_STEPS.includes(action.progress.step) ? action.progress.step : state.step;
            return {
                ...state,
                step: safeStep,
                ocr: action.progress.ocr ?? state.ocr,
            };
        }
        default: return state;
    }
}

// TODO: Make delayed parallel request to gateway

type KycFlowContextValue = {
    state: State;
    dispatch: Dispatch<Action>;
    uc: ReturnType<typeof buildUsecases>;
};

const KycFlowContext = createContext<KycFlowContextValue | null>(null);

function useProvideKycFlow(repository: KycRepository) {
    const [state, dispatch] = useReducer(reduce, initialState);
    const ports = useMemo(() => ({
        ocr: MockOCR,
        face: MockFaceMatch,
        live: MockLiveness,
        submitter: MockSubmitter,
    }), []);
    const uc = useMemo(() => buildUsecases(ports), [ports]);

    const hydrated = useRef(false);

    useEffect(() => {
        let active = true;
        (async () => {
            try {
                const progress = await repository.loadProgress();
                if (!active || !progress) return;
                dispatch({ type: "HYDRATE", progress });
            } finally {
                if (active) hydrated.current = true;
            }
        })();
        return () => {
            active = false;
        };
    }, [repository]);

    useEffect(() => {
        if (!hydrated.current) return;
        if (state.step === "DONE") {
            repository.clearProgress();
            return;
        }
        const progress: KycProgress = { step: state.step };
        if (state.ocr) progress.ocr = state.ocr;
        repository.saveProgress(progress);
    }, [repository, state.step, state.ocr]);

    return useMemo(() => ({ state, dispatch, uc }), [state, uc]);
}

export function KycFlowProvider({ children, repository = LocalKycRepository }: { children: ReactNode; repository?: KycRepository }) {
    const value = useProvideKycFlow(repository);
    return <KycFlowContext.Provider value={value}>{children}</KycFlowContext.Provider>;
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
