const E164 = /^\+[1-9]\d{7,14}$/;

/**
 * Normaliza para E.164. Sem "+", assume Brasil: exige DDD e 8 ou 9 digitos.
 * Retorna null quando o telefone nao e valido.
 */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");

  if (input.trim().startsWith("+")) {
    const phone = `+${digits}`;
    return E164.test(phone) ? phone : null;
  }

  const national = digits.replace(/^0/, "");
  if (national.length === 10 || national.length === 11) return `+55${national}`;
  if (/^55\d{10,11}$/.test(national)) return `+${national}`;
  return null;
}

/** +5511999998888 -> +55 (11) 99999-8888. Outros paises ficam como estao. */
export function formatPhone(phone: string): string {
  const match = phone.match(/^\+55(\d{2})(\d{4,5})(\d{4})$/);
  return match ? `+55 (${match[1]}) ${match[2]}-${match[3]}` : phone;
}
