export const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function normalizeEmailCandidate(email: unknown) {
  if (typeof email !== 'string') {
    return ''
  }
  return email.trim().toLowerCase()
}

export function isValidEmailCandidate(email: string) {
  return EMAIL_REGEX.test(email)
}

export function normalizeUsernameCandidate(username: unknown) {
  if (typeof username !== 'string') {
    return ''
  }
  return username.trim()
}

export function isValidUsernameCandidate(username: string) {
  return USERNAME_REGEX.test(username)
}

export function getUsernameValidationError(username: string) {
  if (!username) {
    return 'Username is required'
  }
  if (username.length < 3 || username.length > 20) {
    return 'Username must be 3–20 characters'
  }
  if (!USERNAME_REGEX.test(username)) {
    return 'Only letters, numbers, and underscores allowed'
  }
  return undefined
}

export function getPasswordValidationError(password: string) {
  if (!password) {
    return 'Password is required'
  }
  if (password.length < 8) {
    return 'Password must be at least 8 characters'
  }
  if (!/[a-z]/.test(password)) {
    return 'Password must include a lowercase letter'
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must include an uppercase letter'
  }
  if (!/[0-9]/.test(password)) {
    return 'Password must include a number'
  }
  return undefined
}
