export const IDE_LANGUAGES = ['python', 'javascript', 'cpp', 'java'] as const

export type IdeRunLanguage = (typeof IDE_LANGUAGES)[number]

export const IDE_LANGUAGE_LABELS: Record<IdeRunLanguage, string> = {
  python: 'Python',
  javascript: 'JavaScript',
  cpp: 'C++',
  java: 'Java',
}

export const IDE_MONACO_LANGUAGE: Record<IdeRunLanguage, string> = {
  python: 'python',
  javascript: 'javascript',
  cpp: 'cpp',
  java: 'java',
}

const STARTER_TEMPLATES: Record<IdeRunLanguage, string> = {
  python: `print("Hello, World!")\n`,
  javascript: `console.log("Hello, World!")\n`,
  cpp: `#include <iostream>\n\nint main() {\n  std::cout << "Hello, World!" << std::endl;\n  return 0;\n}\n`,
  java: `public class Main {\n  public static void main(String[] args) {\n    System.out.println("Hello, World!");\n  }\n}\n`,
}

export function getStarterCodeForLanguage(language: IdeRunLanguage) {
  return STARTER_TEMPLATES[language]
}
