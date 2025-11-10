const requireEnv = (value: string | undefined, key: string): string => {
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`)
  }
  return value
}

export const appEnv = {
  services: {
    apiBackoffice: requireEnv(import.meta.env.VITE_API_BACKOFFICE_URL, 'VITE_API_BACKOFFICE_URL'),
    apiGateway: requireEnv(import.meta.env.VITE_API_GATEWAY_URL, 'VITE_API_GATEWAY_URL'),
  },
} as const
