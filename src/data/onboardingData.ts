export type PlacementLevel = 'beginner' | 'intermediate' | 'pro'
export type PlacementLanguage = 'python' | 'javascript' | 'cpp' | 'java'
export type StartUnit = '0' | 'mid' | 'advanced'

export type LanguageMetadata = {
  id: PlacementLanguage
  label: string
  purpose: string
}

export type PlacementQuestion = {
  id: string
  prompt: string
  options: string[]
  correctIndex: number
}

const levelPrefix: Record<PlacementLevel, string> = {
  beginner: 'Warm-up',
  intermediate: 'Core check',
  pro: 'Challenge',
}

export const languageMetadata: LanguageMetadata[] = [
  {
    id: 'python',
    label: 'Python',
    purpose: 'AI/ML, automation, backend',
  },
  {
    id: 'javascript',
    label: 'JavaScript',
    purpose: 'Web frontend + Node',
  },
  {
    id: 'cpp',
    label: 'C++',
    purpose: 'Performance + DSA',
  },
  {
    id: 'java',
    label: 'Java',
    purpose: 'Enterprise backend + Android + interviews',
  },
]

const questionBank: Record<PlacementLanguage, PlacementQuestion[]> = {
  python: [
    {
      id: 'py-1',
      prompt: 'What prints?\\nprint(len("pebble"))',
      options: ['5', '6', '7', 'Error'],
      correctIndex: 1,
    },
    {
      id: 'py-2',
      prompt: 'Which structure keeps insertion order and key-value pairs?',
      options: ['set', 'tuple', 'dict', 'list'],
      correctIndex: 2,
    },
    {
      id: 'py-3',
      prompt: 'What is the output?\\nprint(3 // 2)',
      options: ['1.5', '1', '2', '0'],
      correctIndex: 1,
    },
    {
      id: 'py-4',
      prompt: 'Which keyword defines a function?',
      options: ['function', 'def', 'fn', 'lambda'],
      correctIndex: 1,
    },
    {
      id: 'py-5',
      prompt: 'Which line reads one line from stdin as text?',
      options: ['stdin.read()', 'input()', 'readline()', 'scan()'],
      correctIndex: 1,
    },
  ],
  javascript: [
    {
      id: 'js-1',
      prompt: 'What prints?\\nconsole.log(typeof [])',
      options: ['array', 'object', 'list', 'undefined'],
      correctIndex: 1,
    },
    {
      id: 'js-2',
      prompt: 'Which keyword declares a block-scoped variable?',
      options: ['var', 'const', 'let', 'Both const and let'],
      correctIndex: 3,
    },
    {
      id: 'js-3',
      prompt: 'What is 2 + "2" in JavaScript?',
      options: ['4', '22', 'NaN', 'Error'],
      correctIndex: 1,
    },
    {
      id: 'js-4',
      prompt: 'Which runtime is commonly used for server-side JavaScript?',
      options: ['Node.js', 'V8 only', 'Babel', 'TypeScript'],
      correctIndex: 0,
    },
    {
      id: 'js-5',
      prompt: 'Which array method returns a new transformed array?',
      options: ['forEach', 'map', 'reduce', 'find'],
      correctIndex: 1,
    },
  ],
  cpp: [
    {
      id: 'cpp-1',
      prompt: 'Which header is used for std::cout?',
      options: ['<stdio.h>', '<iostream>', '<ostream.h>', '<print>'],
      correctIndex: 1,
    },
    {
      id: 'cpp-2',
      prompt: 'What is the typical time complexity of binary search?',
      options: ['O(1)', 'O(n)', 'O(log n)', 'O(n log n)'],
      correctIndex: 2,
    },
    {
      id: 'cpp-3',
      prompt: 'Which container offers contiguous dynamic storage?',
      options: ['std::list', 'std::map', 'std::vector', 'std::set'],
      correctIndex: 2,
    },
    {
      id: 'cpp-4',
      prompt: 'Which keyword is used to define a constant variable?',
      options: ['static', 'final', 'const', 'readonly'],
      correctIndex: 2,
    },
    {
      id: 'cpp-5',
      prompt: 'Which operator accesses a pointer member?',
      options: ['.', '::', '->', '&'],
      correctIndex: 2,
    },
  ],
  java: [
    {
      id: 'java-1',
      prompt: 'Which method is the JVM entry point?',
      options: ['start()', 'init()', 'main(String[] args)', 'run()'],
      correctIndex: 2,
    },
    {
      id: 'java-2',
      prompt: 'Java source is compiled into:',
      options: ['Machine code', 'Bytecode', 'Assembly', 'Python'],
      correctIndex: 1,
    },
    {
      id: 'java-3',
      prompt: 'Which access modifier is visible everywhere?',
      options: ['private', 'protected', 'public', 'package-private'],
      correctIndex: 2,
    },
    {
      id: 'java-4',
      prompt: 'Which collection allows key-value mapping?',
      options: ['List', 'Queue', 'Map', 'Set'],
      correctIndex: 2,
    },
    {
      id: 'java-5',
      prompt: 'Which framework is common for Java backend development?',
      options: ['Spring', 'NumPy', 'Django', 'Flask'],
      correctIndex: 0,
    },
  ],
}

export function isPlacementLevel(value: string | null): value is PlacementLevel {
  return value === 'beginner' || value === 'intermediate' || value === 'pro'
}

export function isPlacementLanguage(value: string | null): value is PlacementLanguage {
  return value === 'python' || value === 'javascript' || value === 'cpp' || value === 'java'
}

export function getLanguageMetadata(language: PlacementLanguage) {
  return languageMetadata.find((item) => item.id === language) ?? languageMetadata[0]
}

export function getPlacementQuestions(language: PlacementLanguage, level: PlacementLevel): PlacementQuestion[] {
  const prefix = levelPrefix[level]
  return questionBank[language].map((question) => ({
    ...question,
    prompt: `${prefix}: ${question.prompt}`,
  }))
}

export function scoreToStartUnit(score: number): StartUnit {
  if (score >= 4) {
    return 'advanced'
  }
  if (score >= 2) {
    return 'mid'
  }
  return '0'
}
