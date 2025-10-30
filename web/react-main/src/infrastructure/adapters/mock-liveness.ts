import type { LivenessPort } from "@application/ports/liveness-port";

export const MockLiveness: LivenessPort = {
    async check() {
        await new Promise(r => setTimeout(r, 200));
        return {
            passed: true,
            signal: "blink + yaw detected",
        };
    }
};