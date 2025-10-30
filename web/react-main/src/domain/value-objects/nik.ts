export const isValidNIK = (nik: string): boolean => {
    const digits = nik.replace(/\s+/g, "");

    return /^\d{16}$/.test(digits)
}