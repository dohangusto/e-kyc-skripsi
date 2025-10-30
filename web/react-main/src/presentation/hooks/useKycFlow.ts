import { useMemo, useReducer } from "react";

import { buildUsecases } from "@application/services";

import { MockOCR} from "@infrastructure/adapters/mock-ocr";
import { MockFaceMatch } from "@infrastructure/adapters/mock-face-match";
import { MockLiveness } from "@infrastructure/adapters/mock-liveness";
import { MockSubmitter } from "@infrastructure/adapters/mock-submit";

import { Applicant, OcrResult, FaceMatchingScore, LivenessResult } from "@domain/types";


export type StepKey = "UPLOAD_KTP" | "OCR_REVIEW" | "SELFIE" | "FACE_MATCH" | "LIVENESS" | "DATA_ENTRY" | "REVIEW_SUBMIT" | "DONE";
export const ALL_STEPS: StepKey[] = ["UPLOAD_KTP", "OCR_REVIEW", "SELFIE", "FACE_MATCH", "LIVENESS", "DATA_ENTRY", "REVIEW_SUBMIT", "DONE"]

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
    | { type: "SET_KTP", file?: File}
    | { type: "SET_SELFIE", file?: File}
    | { type: "SET_OCR", ocr: OcrResult}
    | { type: "SET_FACE", face: FaceMatchingScore}
    | { type: "SET_LIVE", live: LivenessResult}
    | { type: "PATCH_APPLICANT", patch: Partial<Applicant>}
    | { type: "SUBMIT_START"}
    | { type: "SUBMIT_SUCCESS", id: string}
    | { type: "SUBMIT_FAIL", error: string};

const initialState: State = {
    step: "UPLOAD_KTP",
    artifacts: {},
    applicantDraft: {},
    submitting: false,
};

function reduce(state: State, action: Action): State {
    const idx = ALL_STEPS.indexOf(state.step);
    switch (action.type) {
        case "NEXT": return { ...state, step: ALL_STEPS[Math.min(idx + 1, ALL_STEPS.length - 1)] };
        case "BACK": return { ...state, step: ALL_STEPS[Math.max(idx - 1, 0)] };
        case "SET_KTP": return { ...state, artifacts: { ...state.artifacts, ktpImage: action.file } };
        case "SET_SELFIE": return { ...state, artifacts: { ...state.artifacts, selfieImage: action.file } };
        case "SET_OCR": return { ...state, ocr: action.ocr };
        case "SET_FACE": return { ...state, face: action.face };
        case "SET_LIVE": return { ...state, live: action.live };
        case "PATCH_APPLICANT": return { ...state, applicantDraft: { ...state.applicantDraft, ...action.patch } };
        case "SUBMIT_START": return { ...state, submitting: true, error: undefined };
        case "SUBMIT_SUCCESS": return { ...state, submitting: false, submissionId: action.id, step: "DONE" };
        case "SUBMIT_FAIL": return { ...state, submitting: false, error: action.error };
        default: return state;
    }
}

export function useKycFlow() {
    const [state, dispatch] = useReducer(reduce, initialState);
    const ports = useMemo(() => ({
        ocr: MockOCR,
        face: MockFaceMatch,
        live: MockLiveness,
        submitter: MockSubmitter,
    }), []);
    const uc = useMemo(() => buildUsecases(ports), [ports]);

    return { state, dispatch, uc };
}
