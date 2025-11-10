import { backofficeHttpClient } from '@infrastructure/adapters/http/client'
import type {
  AuthResultResponse,
  AuthSessionResponse,
  LoginAdminPayload,
  LoginBeneficiaryPayload,
} from './backoffice.types'

const routes = {
  adminLogin: '/api/auth/admin/login',
  beneficiaryLogin: '/api/auth/beneficiary/login',
  me: '/api/auth/me',
} as const

export const AuthAPI = {
  loginAdmin(payload: LoginAdminPayload) {
    return backofficeHttpClient.post<AuthResultResponse, LoginAdminPayload>(routes.adminLogin, { body: payload })
  },

  loginBeneficiary(payload: LoginBeneficiaryPayload) {
    return backofficeHttpClient.post<AuthResultResponse, LoginBeneficiaryPayload>(routes.beneficiaryLogin, {
      body: payload,
    })
  },

  me(token: string) {
    return backofficeHttpClient.get<AuthSessionResponse>(routes.me, { headers: { Authorization: `Bearer ${token}` } })
  },
}
