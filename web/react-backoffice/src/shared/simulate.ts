export async function simulateRequest<T>(fn: () => T | Promise<T>, opts?: { min?: number; max?: number; failRate?: number }) {
  const { min = 300, max = 800, failRate = 0.05 } = opts || {}
  const delay = Math.floor(Math.random() * (max - min) + min)
  await new Promise(r => setTimeout(r, delay))
  if (Math.random() < failRate) throw new Error('NetworkError')
  return await fn()
}

