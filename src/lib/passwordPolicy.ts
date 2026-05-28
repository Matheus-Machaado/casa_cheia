export interface PasswordRule {
  id: string;
  label: string;
  test: (pw: string) => boolean;
}

export const PASSWORD_RULES: PasswordRule[] = [
  { id: 'len', label: 'Pelo menos 8 caracteres', test: (pw) => pw.length >= 8 },
  { id: 'upper', label: 'Uma letra maiúscula', test: (pw) => /[A-Z]/.test(pw) },
  { id: 'lower', label: 'Uma letra minúscula', test: (pw) => /[a-z]/.test(pw) },
  { id: 'digit', label: 'Um número', test: (pw) => /\d/.test(pw) },
];

export interface PasswordValidity {
  valid: boolean;
  reason: string;
}

export function validatePasswordStrength(pw: string): PasswordValidity {
  for (const rule of PASSWORD_RULES) {
    if (!rule.test(pw)) return { valid: false, reason: rule.label };
  }
  return { valid: true, reason: '' };
}

export function ruleStatus(pw: string): Array<{ id: string; ok: boolean }> {
  return PASSWORD_RULES.map((r) => ({ id: r.id, ok: r.test(pw) }));
}

export function strengthScore(pw: string): number {
  let s = 0;
  for (const rule of PASSWORD_RULES) if (rule.test(pw)) s++;
  if (pw.length >= 12) s = Math.min(4, s + 0.5);
  return Math.round(s);
}
