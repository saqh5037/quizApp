import { CONSTANTS } from '../config/constants';

/**
 * Generate a random session code
 */
export const generateSessionCode = (length: number = CONSTANTS.SESSION_CODE.LENGTH): string => {
  const charset = CONSTANTS.SESSION_CODE.CHARSET;
  let code = '';
  
  for (let i = 0; i < length; i++) {
    code += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  
  return code;
};

/**
 * Generate a unique session code by checking existing codes
 */
export const generateUniqueSessionCode = async (
  checkExistence: (code: string) => Promise<boolean>,
  maxAttempts: number = 10
): Promise<string> => {
  for (let i = 0; i < maxAttempts; i++) {
    const code = generateSessionCode();
    const exists = await checkExistence(code);
    
    if (!exists) {
      return code;
    }
  }
  
  throw new Error('Failed to generate unique session code');
};

/**
 * Generate a random nickname for anonymous users
 */
export const generateAnonymousNickname = (): string => {
  const adjectives = [
    'Clever', 'Swift', 'Bright', 'Quick', 'Smart',
    'Happy', 'Lucky', 'Brave', 'Cool', 'Wise',
    'Eager', 'Jolly', 'Noble', 'Proud', 'Bold'
  ];
  
  const nouns = [
    'Eagle', 'Tiger', 'Lion', 'Falcon', 'Phoenix',
    'Dragon', 'Wolf', 'Bear', 'Fox', 'Owl',
    'Hawk', 'Panda', 'Dolphin', 'Shark', 'Raven'
  ];
  
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const number = Math.floor(Math.random() * 1000);
  
  return `${adjective}${noun}${number}`;
};

/**
 * Generate a random color for participant avatar
 */
export const generateAvatarColor = (): string => {
  const colors = [
    '#F44336', '#E91E63', '#9C27B0', '#673AB7',
    '#3F51B5', '#2196F3', '#03A9F4', '#00BCD4',
    '#009688', '#4CAF50', '#8BC34A', '#CDDC39',
    '#FFEB3B', '#FFC107', '#FF9800', '#FF5722'
  ];
  
  return colors[Math.floor(Math.random() * colors.length)];
};