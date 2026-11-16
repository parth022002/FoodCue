export function isValidGtin(value: string): boolean {
  const digits = value.replace(/\s+/g, "");
  if (!/^\d+$/.test(digits) || ![8, 12, 13, 14].includes(digits.length)) return false;
  const body = digits.slice(0, -1);
  const expected = Number(digits.at(-1));
  const sum = [...body].reverse().reduce((total, char, index) => {
    return total + Number(char) * (index % 2 === 0 ? 3 : 1);
  }, 0);
  return (10 - (sum % 10)) % 10 === expected;
}

export const validateGtinCheckDigit = isValidGtin;

export function normaliseGtin(value: string): string | null {
  const normalised = value.replace(/\s+/g, "");
  return isValidGtin(normalised) ? normalised : null;
}
