interface PasswordValidationResult {
  isValid: boolean;
  message: string;
}

// Liste des mots de passe courants à rejeter
const COMMON_PASSWORDS = [
  'password', 'password123', '123456', '123456789', 'qwerty', 'abc123',
  'password1', 'admin', 'welcome', 'letmein', 'monkey', 'dragon',
  'master', 'hello', 'login', 'freedom', 'whatever', 'admin123',
  'sunshine', 'princess', 'access', 'football', 'basketball', 'baseball',
  'superman', 'batman', 'trustno1', 'chocolate', 'computer', 'internet',
  'flower', 'jordan', 'liverpool', 'manchester', 'arsenal', 'chelsea',
  'matcha', 'dating', 'love', 'romance', 'single', 'couple',
  // Mots français courants
  'motdepasse', 'azerty', 'bonjour', 'salut', 'france', 'paris',
  'secret', 'amour', 'rencontre', 'coeur', 'bonheur', 'plaisir'
];

// Mots relatifs au site de rencontre à éviter
const SITE_RELATED_WORDS = [
  'matcha', 'match', 'dating', 'love', 'romance', 'single', 'couple',
  'rencontre', 'amour', 'coeur', 'date', 'heart', 'kiss', 'sex'
];

export function validatePassword(password: string): PasswordValidationResult {
  // Vérifier la longueur minimale
  if (password.length < 8) {
    return {
      isValid: false,
      message: 'Le mot de passe doit contenir au moins 8 caractères'
    };
  }

  // Vérifier la longueur maximale (éviter les attaques de déni de service)
  if (password.length > 128) {
    return {
      isValid: false,
      message: 'Le mot de passe ne peut pas dépasser 128 caractères'
    };
  }

  // Vérifier la présence d'au moins une lettre minuscule
  if (!/[a-z]/.test(password)) {
    return {
      isValid: false,
      message: 'Le mot de passe doit contenir au moins une lettre minuscule'
    };
  }

  // Vérifier la présence d'au moins une lettre majuscule
  if (!/[A-Z]/.test(password)) {
    return {
      isValid: false,
      message: 'Le mot de passe doit contenir au moins une lettre majuscule'
    };
  }

  // Vérifier la présence d'au moins un chiffre
  if (!/\d/.test(password)) {
    return {
      isValid: false,
      message: 'Le mot de passe doit contenir au moins un chiffre'
    };
  }

  // Vérifier la présence d'au moins un caractère spécial
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return {
      isValid: false,
      message: 'Le mot de passe doit contenir au moins un caractère spécial (!@#$%^&*...)'
    };
  }

  // Vérifier que le mot de passe n'est pas dans la liste des mots courants
  const lowerPassword = password.toLowerCase();
  if (COMMON_PASSWORDS.includes(lowerPassword)) {
    return {
      isValid: false,
      message: 'Ce mot de passe est trop courant. Choisissez un mot de passe plus unique.'
    };
  }

  // Vérifier que le mot de passe ne contient pas de mots relatifs au site
  for (const word of SITE_RELATED_WORDS) {
    if (lowerPassword.includes(word)) {
      return {
        isValid: false,
        message: `Le mot de passe ne doit pas contenir le mot "${word}"`
      };
    }
  }

  // Vérifier les séquences de caractères répétitifs (aaa, 111, etc.)
  if (/(.)\1{2,}/.test(password)) {
    return {
      isValid: false,
      message: 'Le mot de passe ne doit pas contenir plus de 2 caractères consécutifs identiques'
    };
  }

  // Vérifier les séquences de clavier courantes
  const keyboardSequences = [
    'qwerty', 'asdf', 'zxcv', 'yuiop', 'hjkl', 'bnm',
    'azerty', 'qsdf', 'wxcv', // français
    '123456', '234567', '345678', '456789', '567890',
    'abcdef', 'bcdefg', 'cdefgh', 'defghi'
  ];

  for (const sequence of keyboardSequences) {
    if (lowerPassword.includes(sequence)) {
      return {
        isValid: false,
        message: 'Le mot de passe ne doit pas contenir de séquences de clavier courantes'
      };
    }
  }

  // Vérifier les motifs de date courants (1990, 2000, etc.)
  if (/19\d{2}|20\d{2}/.test(password)) {
    return {
      isValid: false,
      message: 'Le mot de passe ne doit pas contenir d\'années (ex: 1990, 2023)'
    };
  }

  // Si toutes les vérifications passent
  return {
    isValid: true,
    message: 'Mot de passe valide'
  };
}

// Fonction pour évaluer la force du mot de passe (optionnel)
export function getPasswordStrength(password: string): {
  score: number;
  level: 'Très faible' | 'Faible' | 'Moyen' | 'Fort' | 'Très fort';
} {
  let score = 0;
  
  // Longueur
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;
  
  // Complexité
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 1;
  
  // Diversité des caractères
  const uniqueChars = new Set(password).size;
  if (uniqueChars >= password.length * 0.7) score += 1;
  
  let level: 'Très faible' | 'Faible' | 'Moyen' | 'Fort' | 'Très fort';
  
  if (score <= 2) {
    level = 'Très faible';
  } else if (score <= 4) {
    level = 'Faible';
  } else if (score <= 6) {
    level = 'Moyen';
  } else if (score <= 7) {
    level = 'Fort';
  } else {
    level = 'Très fort';
  }
  
  return { score, level };
} 