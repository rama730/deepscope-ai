/**
 * Server-side password validation and complexity checking
 */

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong';
  score: number;
}

/**
 * Common passwords list (top 100+)
 */
const COMMON_PASSWORDS = [
  'password', '123456', '123456789', '12345678', '12345', '1234567',
  '1234567890', 'qwerty', 'abc123', '111111', '123123', 'admin',
  'letmein', 'welcome', 'monkey', '123456789', 'password1', 'qwerty123',
  'dragon', 'sunshine', 'princess', 'football', 'iloveyou', 'master',
  'hello', 'freedom', 'whatever', 'qazwsx', 'trustno1', '654321',
  'jordan23', 'harley', 'password123', 'shadow', 'superman', 'qwertyuiop',
  'michael', 'mustang', 'freedom', 'batman', 'thomas', 'hunter',
  'ranger', 'daniel', 'hannah', 'maggie', 'jessica', 'charlie',
  'jordan', 'michelle', 'andrew', 'joshua', 'amanda', 'justin',
  'basketball', 'soccer', 'baseball', 'tigger', 'jennifer', 'nicole',
  'computer', 'michelle', 'jordan', 'taylor', 'bailey', 'alexis',
  'austin', 'william', 'james', 'michael', 'david', 'joseph',
  'daniel', 'matthew', 'anthony', 'mark', 'donald', 'steven',
  'paul', 'andrew', 'joshua', 'kenneth', 'kevin', 'brian',
  'george', 'timothy', 'ronald', 'jason', 'edward', 'jeffrey',
  'ryan', 'jacob', 'gary', 'nicholas', 'eric', 'stephen',
  'jonathan', 'larry', 'justin', 'scott', 'brandon', 'benjamin',
  'samuel', 'frank', 'gregory', 'raymond', 'alexander', 'patrick',
  'jack', 'dennis', 'jerry', 'tyler', 'aaron', 'jose',
  'henry', 'adam', 'douglas', 'nathan', 'zachary', 'kyle',
  'noah', 'ethan', 'mason', 'logan', 'lucas', 'jackson',
  'aiden', 'oliver', 'owen', 'wyatt', 'carter', 'luke',
  'grayson', 'jack', 'julian', 'ryan', 'jaxon', 'lincoln',
  'mason', 'ezra', 'luke', 'hunter', 'leo', 'liam',
  'noah', 'oliver', 'william', 'elijah', 'james', 'benjamin',
  'lucas', 'henry', 'alexander', 'mason', 'michael', 'ethan',
  'daniel', 'jacob', 'logan', 'jackson', 'levi', 'sebastian',
  'mateo', 'jack', 'owen', 'theodore', 'aiden', 'samuel',
  'joseph', 'john', 'david', 'wyatt', 'matthew', 'luke',
  'asher', 'carter', 'julian', 'grayson', 'leo', 'jayden',
  'lincoln', 'jaxon', 'aaron', 'adam', 'adrian', 'alan',
  'albert', 'alex', 'alfred', 'andrew', 'anthony', 'arthur',
  'austin', 'benjamin', 'billy', 'bobby', 'brandon', 'brian',
  'bruce', 'bryan', 'caleb', 'carl', 'charles', 'chris',
  'christian', 'christopher', 'colin', 'colin', 'colin', 'colin',
  'colin', 'colin', 'colin', 'colin', 'colin', 'colin',
];

/**
 * Check if password is in common passwords list
 */
function isCommonPassword(password: string): boolean {
  const lowerPassword = password.toLowerCase();
  return COMMON_PASSWORDS.includes(lowerPassword);
}

/**
 * Validate password complexity on server-side
 */
export function validatePasswordComplexity(password: string): PasswordValidationResult {
  const errors: string[] = [];
  let score = 0;

  // Minimum length check
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  } else {
    score += 1;
  }

  // Maximum length check (prevent DoS)
  if (password.length > 128) {
    errors.push('Password must be less than 128 characters');
    return { valid: false, errors, strength: 'weak', score: 0 };
  }

  // Uppercase letter check
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  } else {
    score += 1;
  }

  // Lowercase letter check
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  } else {
    score += 1;
  }

  // Number check
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  } else {
    score += 1;
  }

  // Special character check
  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push('Password must contain at least one special character');
  } else {
    score += 1;
  }

  // Common password check
  if (isCommonPassword(password)) {
    errors.push('Password is too common. Please choose a more unique password');
  } else {
    score += 1;
  }

  // Additional strength checks
  if (password.length >= 12) {
    score += 1;
  }

  // Determine strength
  let strength: 'weak' | 'medium' | 'strong' = 'weak';
  if (score >= 6) {
    strength = 'strong';
  } else if (score >= 4) {
    strength = 'medium';
  }

  // Password is valid if it meets minimum requirements (score >= 4)
  const valid = errors.length === 0 && score >= 4;

  return {
    valid,
    errors,
    strength,
    score,
  };
}

/**
 * Check password against user's email/username (prevent using personal info)
 */
export function validatePasswordAgainstUserInfo(
  password: string,
  email?: string,
  username?: string
): { valid: boolean; error?: string } {
  const lowerPassword = password.toLowerCase();

  if (email) {
    const emailLocal = email.split('@')[0].toLowerCase();
    if (lowerPassword.includes(emailLocal) && emailLocal.length >= 3) {
      return {
        valid: false,
        error: 'Password cannot contain your email address',
      };
    }
  }

  if (username) {
    const lowerUsername = username.toLowerCase();
    if (lowerPassword.includes(lowerUsername) && lowerUsername.length >= 3) {
      return {
        valid: false,
        error: 'Password cannot contain your username',
      };
    }
  }

  return { valid: true };
}

/**
 * Comprehensive password validation
 */
export function validatePassword(
  password: string,
  email?: string,
  username?: string
): PasswordValidationResult {
  // First check complexity
  const complexityResult = validatePasswordComplexity(password);

  // Then check against user info
  const userInfoResult = validatePasswordAgainstUserInfo(password, email, username);

  // Combine results
  const errors = [...complexityResult.errors];
  if (!userInfoResult.valid && userInfoResult.error) {
    errors.push(userInfoResult.error);
  }

  return {
    valid: complexityResult.valid && userInfoResult.valid,
    errors,
    strength: complexityResult.strength,
    score: complexityResult.score,
  };
}
