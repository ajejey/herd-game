// Utility function to normalize answers for comparison
export function normalizeAnswer(answer) {
    if (!answer) return '';
    
    return answer
      // Convert to lowercase
      .toLowerCase()
      // Remove extra whitespace at start, end, and between words
      .trim()
      .replace(/\s+/g, ' ')
      // Remove punctuation
      .replace(/[.,!?'"]/g, '')
      // Replace common abbreviations/variations
      .replace(/&/g, 'and')
      // Remove special characters and emojis
      .replace(/[^\w\s-]/g, '')
      // Handle common typos/variations
      .replace(/ph/g, 'f')
      // Remove common filler words
      .replace(/\b(the|a|an)\b/g, '')
      // Handle common plural variations
      .replace(/([^s])s\b/, '$1')
      // Handle common number variations
      .replace(/zero/g, '0')
      .replace(/one/g, '1')
      .replace(/two/g, '2')
      .replace(/three/g, '3')
      .replace(/four/g, '4')
      .replace(/five/g, '5')
      // Remove 'ing' endings
      .replace(/ing\b/g, '')
      // Handle common misspellings
      .replace(/ie\b/g, 'y')
      .trim();
  }
  
  // Function to check if two answers should be considered the same
  export function areAnswersSimilar(answer1, answer2) {
    const normalized1 = normalizeAnswer(answer1);
    const normalized2 = normalizeAnswer(answer2);
    
    // Check exact match after normalization
    if (normalized1 === normalized2) return true;
    
    // Check for very similar strings (Levenshtein distance)
    const maxLength = Math.max(normalized1.length, normalized2.length);
    const distance = levenshteinDistance(normalized1, normalized2);
    
    // Allow 1 character difference for every 5 characters in length
    const allowedDistance = Math.floor(maxLength / 5) + 1;
    return distance <= allowedDistance;
  }
  
  // Levenshtein distance implementation for catching typos
  export function levenshteinDistance(str1, str2) {
    const matrix = Array(str2.length + 1).fill().map(() => 
      Array(str1.length + 1).fill(0)
    );
  
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
  
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const substitutionCost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + substitutionCost // substitution
        );
      }
    }
    return matrix[str2.length][str1.length];
  }