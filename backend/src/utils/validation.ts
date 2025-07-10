const COMMON_PASSWORDS = new Set([
  '123456', 'password', '123456789', '12345678', '12345',
  'azerty', 'qwerty', '111111', '123123', 'password123'
]);

/**
 * Valide un mot de passe.
 * @param password Le mot de passe à valider.
 * @returns Un tableau d'erreurs. Retourne un tableau vide si le mot de passe est valide.
 */
export function validatePassword(password: string): string[] {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Le mot de passe doit contenir au moins 8 caractères.');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins une lettre majuscule.');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins une lettre minuscule.');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins un chiffre.');
  }

  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    errors.push('Le mot de passe est trop courant.');
  }

  return errors;
} 