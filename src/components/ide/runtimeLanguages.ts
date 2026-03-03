export const IDE_LANGUAGES = ['python', 'javascript', 'cpp', 'java', 'c'] as const

export type IdeRunLanguage = (typeof IDE_LANGUAGES)[number]

export const IDE_LANGUAGE_LABELS: Record<IdeRunLanguage, string> = {
  python: 'Python',
  javascript: 'JavaScript',
  cpp: 'C++',
  java: 'Java',
  c: 'C (GNU)',
}

export const IDE_MONACO_LANGUAGE: Record<IdeRunLanguage, string> = {
  python: 'python',
  javascript: 'javascript',
  cpp: 'cpp',
  java: 'java',
  c: 'c',
}

const STARTER_TEMPLATES: Record<IdeRunLanguage, string> = {
  python: `print("Hello, World!")\n`,
  javascript: `console.log("Hello, World!")\n`,
  cpp: `#include <iostream>\n\nint main() {\n  std::cout << "Hello, World!" << std::endl;\n  return 0;\n}\n`,
  java: `public class Main {\n  public static void main(String[] args) {\n    System.out.println("Hello, World!");\n  }\n}\n`,
  c: `#include <stdio.h>\n\nint main(void) {\n  printf("Hello, World!\\n");\n  return 0;\n}\n`,
}

export function getStarterCodeForLanguage(language: IdeRunLanguage) {
  return STARTER_TEMPLATES[language]
}
