import type { PlacementLanguage, PlacementLevel } from './onboardingData'

export type DifficultyTag = 'easy' | 'medium' | 'hard'

export type PlacementMcqQuestion = {
  id: string
  type: 'mcq'
  prompt: string
  options: string[]
  correctIndex: number
  difficulty: DifficultyTag
}

export type PlacementCodingQuestion = {
  id: string
  type: 'coding'
  prompt: string
  starterCode: string
  tests: Array<{ stdin: string; expected: string }>
  timeoutMs: number
  difficulty: DifficultyTag
}

export type PlacementQuestionSet = {
  mcq: PlacementMcqQuestion[]
  coding: PlacementCodingQuestion[]
  weekBucket: number
}

type RawPlacementMcqQuestion = Omit<PlacementMcqQuestion, 'type'>
type RawPlacementCodingQuestion = Omit<PlacementCodingQuestion, 'type'>

const rawPlacementBank: Record<PlacementLanguage, {
  mcq: RawPlacementMcqQuestion[]
  coding: RawPlacementCodingQuestion[]
}> = {
  "python": {
    "mcq": [
      {
        "id": "py-mcq-1",
        "prompt": "What does len([1,2,3]) return?",
        "options": [
          "2",
          "3",
          "4",
          "Error"
        ],
        "correctIndex": 1,
        "difficulty": "easy"
      },
      {
        "id": "py-mcq-2",
        "prompt": "Which type is mutable?",
        "options": [
          "tuple",
          "str",
          "list",
          "int"
        ],
        "correctIndex": 2,
        "difficulty": "easy"
      },
      {
        "id": "py-mcq-3",
        "prompt": "What does 7 // 2 return?",
        "options": [
          "3.5",
          "3",
          "4",
          "2"
        ],
        "correctIndex": 1,
        "difficulty": "easy"
      },
      {
        "id": "py-mcq-4",
        "prompt": "Which keyword defines a function?",
        "options": [
          "func",
          "def",
          "lambda",
          "fn"
        ],
        "correctIndex": 1,
        "difficulty": "easy"
      },
      {
        "id": "py-mcq-5",
        "prompt": "What is the output type of input()?",
        "options": [
          "int",
          "float",
          "str",
          "bytes"
        ],
        "correctIndex": 2,
        "difficulty": "easy"
      },
      {
        "id": "py-mcq-6",
        "prompt": "Which data structure stores key-value pairs?",
        "options": [
          "list",
          "dict",
          "set",
          "tuple"
        ],
        "correctIndex": 1,
        "difficulty": "easy"
      },
      {
        "id": "py-mcq-7",
        "prompt": "What prints? print(bool(\"\"))",
        "options": [
          "True",
          "False",
          "0",
          "Error"
        ],
        "correctIndex": 1,
        "difficulty": "easy"
      },
      {
        "id": "py-mcq-8",
        "prompt": "What does list(range(3)) produce?",
        "options": [
          "[1,2,3]",
          "[0,1,2]",
          "[0,1,2,3]",
          "[3]"
        ],
        "correctIndex": 1,
        "difficulty": "easy"
      },
      {
        "id": "py-mcq-9",
        "prompt": "Best average-time lookup structure?",
        "options": [
          "list",
          "tuple",
          "dict",
          "str"
        ],
        "correctIndex": 2,
        "difficulty": "medium"
      },
      {
        "id": "py-mcq-10",
        "prompt": "Which statement is true about sets?",
        "options": [
          "Ordered duplicates",
          "Unordered unique values",
          "Key-value only",
          "Index-based"
        ],
        "correctIndex": 1,
        "difficulty": "medium"
      },
      {
        "id": "py-mcq-11",
        "prompt": "Which method appends one element to a list?",
        "options": [
          "extend",
          "append",
          "add",
          "push"
        ],
        "correctIndex": 1,
        "difficulty": "easy"
      },
      {
        "id": "py-mcq-12",
        "prompt": "What does \"abc\"[::-1] return?",
        "options": [
          "abc",
          "cba",
          "bac",
          "Error"
        ],
        "correctIndex": 1,
        "difficulty": "easy"
      },
      {
        "id": "py-mcq-13",
        "prompt": "How do you read all stdin quickly?",
        "options": [
          "sys.stdin.read()",
          "input.read()",
          "stdin()",
          "raw()"
        ],
        "correctIndex": 0,
        "difficulty": "medium"
      },
      {
        "id": "py-mcq-14",
        "prompt": "Which raises KeyError when key missing?",
        "options": [
          "d.get(k)",
          "d[k]",
          "k in d",
          "d.keys()"
        ],
        "correctIndex": 1,
        "difficulty": "medium"
      },
      {
        "id": "py-mcq-15",
        "prompt": "Time complexity to append to end of list (amortized)?",
        "options": [
          "O(1)",
          "O(log n)",
          "O(n)",
          "O(n log n)"
        ],
        "correctIndex": 0,
        "difficulty": "medium"
      },
      {
        "id": "py-mcq-16",
        "prompt": "What prints? print(2**3)",
        "options": [
          "6",
          "8",
          "9",
          "Error"
        ],
        "correctIndex": 1,
        "difficulty": "easy"
      },
      {
        "id": "py-mcq-17",
        "prompt": "What prints? print(\"ab\" * 2)",
        "options": [
          "abab",
          "ab2",
          "ab ab",
          "Error"
        ],
        "correctIndex": 0,
        "difficulty": "easy"
      },
      {
        "id": "py-mcq-18",
        "prompt": "What prints? print(min([4,1,9]))",
        "options": [
          "9",
          "4",
          "1",
          "Error"
        ],
        "correctIndex": 2,
        "difficulty": "easy"
      },
      {
        "id": "py-mcq-19",
        "prompt": "What prints? print(\"a,b\".split(\",\")[1])",
        "options": [
          "a",
          "b",
          "a,b",
          "Error"
        ],
        "correctIndex": 1,
        "difficulty": "easy"
      },
      {
        "id": "py-mcq-20",
        "prompt": "What prints? print(sum([1,2,3]))",
        "options": [
          "5",
          "6",
          "7",
          "Error"
        ],
        "correctIndex": 1,
        "difficulty": "easy"
      },
      {
        "id": "py-mcq-21",
        "prompt": "What prints? print([1,2,3][0])",
        "options": [
          "0",
          "1",
          "2",
          "3"
        ],
        "correctIndex": 1,
        "difficulty": "easy"
      },
      {
        "id": "py-mcq-22",
        "prompt": "What prints? print(\"pebble\".upper())",
        "options": [
          "Pebble",
          "PEBBLE",
          "pebble",
          "Error"
        ],
        "correctIndex": 1,
        "difficulty": "easy"
      },
      {
        "id": "py-mcq-23",
        "prompt": "What prints? print(int(\"12\") + 3)",
        "options": [
          "123",
          "15",
          "9",
          "Error"
        ],
        "correctIndex": 1,
        "difficulty": "easy"
      },
      {
        "id": "py-mcq-24",
        "prompt": "What prints? print(5 % 2)",
        "options": [
          "2",
          "2.5",
          "1",
          "0"
        ],
        "correctIndex": 2,
        "difficulty": "easy"
      },
      {
        "id": "py-mcq-25",
        "prompt": "What prints? print(\"x\" in \"pebble\")",
        "options": [
          "True",
          "False",
          "x",
          "Error"
        ],
        "correctIndex": 1,
        "difficulty": "easy"
      },
      {
        "id": "py-mcq-26",
        "prompt": "Which is best for FIFO queue in Python stdlib?",
        "options": [
          "list",
          "tuple",
          "collections.deque",
          "set"
        ],
        "correctIndex": 2,
        "difficulty": "medium"
      },
      {
        "id": "py-mcq-27",
        "prompt": "Given nums=[1,2,3], nums.pop() returns?",
        "options": [
          "1",
          "2",
          "3",
          "None"
        ],
        "correctIndex": 2,
        "difficulty": "easy"
      },
      {
        "id": "py-mcq-28",
        "prompt": "Which sorting call sorts list in place?",
        "options": [
          "sorted(nums)",
          "nums.sort()",
          "sort(nums)",
          "nums.sorted()"
        ],
        "correctIndex": 1,
        "difficulty": "medium"
      },
      {
        "id": "py-mcq-29",
        "prompt": "What is complexity of binary search on sorted array?",
        "options": [
          "O(n)",
          "O(log n)",
          "O(1)",
          "O(n log n)"
        ],
        "correctIndex": 1,
        "difficulty": "medium"
      },
      {
        "id": "py-mcq-30",
        "prompt": "Which is true about recursion base case?",
        "options": [
          "Optional always",
          "Prevents infinite recursion",
          "Only for loops",
          "Slows all code"
        ],
        "correctIndex": 1,
        "difficulty": "hard"
      }
    ],
    "coding": [
      {
        "id": "python-code-sum-two",
        "prompt": "Read two integers and print their sum.",
        "starterCode": "import sys\n\ntext = sys.stdin.read()\n# TODO: solve sum-two\nprint(0)\n",
        "tests": [
          {
            "stdin": "4 8\n",
            "expected": "12\n"
          },
          {
            "stdin": "10 -3\n",
            "expected": "7\n"
          }
        ],
        "timeoutMs": 3500,
        "difficulty": "easy"
      },
      {
        "id": "python-code-max-three",
        "prompt": "Read three integers and print the maximum.",
        "starterCode": "import sys\n\ntext = sys.stdin.read()\n# TODO: solve max-three\nprint(0)\n",
        "tests": [
          {
            "stdin": "3 9 2\n",
            "expected": "9\n"
          },
          {
            "stdin": "-5 -2 -9\n",
            "expected": "-2\n"
          }
        ],
        "timeoutMs": 3500,
        "difficulty": "easy"
      },
      {
        "id": "python-code-reverse-string",
        "prompt": "Read one line and print the reversed string.",
        "starterCode": "import sys\n\ntext = sys.stdin.read()\n# TODO: solve reverse-string\nprint(0)\n",
        "tests": [
          {
            "stdin": "pebble\n",
            "expected": "elbbep\n"
          },
          {
            "stdin": "code\n",
            "expected": "edoc\n"
          }
        ],
        "timeoutMs": 3500,
        "difficulty": "easy"
      },
      {
        "id": "python-code-count-vowels",
        "prompt": "Read one line and print number of vowels (a,e,i,o,u).",
        "starterCode": "import sys\n\ntext = sys.stdin.read()\n# TODO: solve count-vowels\nprint(0)\n",
        "tests": [
          {
            "stdin": "pebble\n",
            "expected": "2\n"
          },
          {
            "stdin": "education\n",
            "expected": "5\n"
          }
        ],
        "timeoutMs": 3500,
        "difficulty": "easy"
      },
      {
        "id": "python-code-factorial",
        "prompt": "Read n and print n! for 0 <= n <= 12.",
        "starterCode": "import sys\n\ntext = sys.stdin.read()\n# TODO: solve factorial\nprint(0)\n",
        "tests": [
          {
            "stdin": "5\n",
            "expected": "120\n"
          },
          {
            "stdin": "0\n",
            "expected": "1\n"
          }
        ],
        "timeoutMs": 3500,
        "difficulty": "easy"
      },
      {
        "id": "python-code-fibonacci",
        "prompt": "Read n and print nth Fibonacci number (0-indexed).",
        "starterCode": "import sys\n\ntext = sys.stdin.read()\n# TODO: solve fibonacci\nprint(0)\n",
        "tests": [
          {
            "stdin": "7\n",
            "expected": "13\n"
          },
          {
            "stdin": "0\n",
            "expected": "0\n"
          }
        ],
        "timeoutMs": 3500,
        "difficulty": "medium"
      },
      {
        "id": "python-code-palindrome",
        "prompt": "Read one word and print true if palindrome else false.",
        "starterCode": "import sys\n\ntext = sys.stdin.read()\n# TODO: solve palindrome\nprint('false')\n",
        "tests": [
          {
            "stdin": "racecar\n",
            "expected": "true\n"
          },
          {
            "stdin": "pebble\n",
            "expected": "false\n"
          }
        ],
        "timeoutMs": 3500,
        "difficulty": "easy"
      },
      {
        "id": "python-code-sort-numbers",
        "prompt": "Read space-separated integers and print sorted ascending.",
        "starterCode": "import sys\n\ntext = sys.stdin.read()\n# TODO: solve sort-numbers\nprint(0)\n",
        "tests": [
          {
            "stdin": "4 1 3 2\n",
            "expected": "1 2 3 4\n"
          },
          {
            "stdin": "9 -1 5\n",
            "expected": "-1 5 9\n"
          }
        ],
        "timeoutMs": 3500,
        "difficulty": "medium"
      },
      {
        "id": "python-code-two-sum",
        "prompt": "Line1 nums, line2 target. Print indices i j of first valid pair.",
        "starterCode": "import sys\n\ntext = sys.stdin.read()\n# TODO: solve two-sum\nprint(0)\n",
        "tests": [
          {
            "stdin": "2 7 11 15\n9\n",
            "expected": "0 1\n"
          },
          {
            "stdin": "3 2 4\n6\n",
            "expected": "1 2\n"
          }
        ],
        "timeoutMs": 4000,
        "difficulty": "medium"
      },
      {
        "id": "python-code-first-unique",
        "prompt": "Read string and print first non-repeating char index, else -1.",
        "starterCode": "import sys\n\ntext = sys.stdin.read()\n# TODO: solve first-unique\nprint(0)\n",
        "tests": [
          {
            "stdin": "leetcode\n",
            "expected": "0\n"
          },
          {
            "stdin": "aabb\n",
            "expected": "-1\n"
          }
        ],
        "timeoutMs": 4000,
        "difficulty": "medium"
      },
      {
        "id": "python-code-word-count",
        "prompt": "Read one line and print count of words.",
        "starterCode": "import sys\n\ntext = sys.stdin.read()\n# TODO: solve word-count\nprint(0)\n",
        "tests": [
          {
            "stdin": "hello pebble world\n",
            "expected": "3\n"
          },
          {
            "stdin": "one\n",
            "expected": "1\n"
          }
        ],
        "timeoutMs": 3500,
        "difficulty": "easy"
      },
      {
        "id": "python-code-rotate-right",
        "prompt": "Line1 nums, line2 k. Rotate right by k and print result.",
        "starterCode": "import sys\n\ntext = sys.stdin.read()\n# TODO: solve rotate-right\nprint(0)\n",
        "tests": [
          {
            "stdin": "1 2 3 4 5\n2\n",
            "expected": "4 5 1 2 3\n"
          },
          {
            "stdin": "7 8 9\n1\n",
            "expected": "9 7 8\n"
          }
        ],
        "timeoutMs": 4000,
        "difficulty": "medium"
      },
      {
        "id": "python-code-merge-sorted",
        "prompt": "Line1 sorted A, line2 sorted B. Merge and print sorted.",
        "starterCode": "import sys\n\ntext = sys.stdin.read()\n# TODO: solve merge-sorted\nprint(0)\n",
        "tests": [
          {
            "stdin": "1 3 5\n2 4 6\n",
            "expected": "1 2 3 4 5 6\n"
          },
          {
            "stdin": "1 2\n3 4 5\n",
            "expected": "1 2 3 4 5\n"
          }
        ],
        "timeoutMs": 4000,
        "difficulty": "medium"
      },
      {
        "id": "python-code-valid-parentheses",
        "prompt": "Read parentheses string and print true if valid else false.",
        "starterCode": "import sys\n\ntext = sys.stdin.read()\n# TODO: solve valid-parentheses\nprint('false')\n",
        "tests": [
          {
            "stdin": "()[]{}\n",
            "expected": "true\n"
          },
          {
            "stdin": "([)]\n",
            "expected": "false\n"
          }
        ],
        "timeoutMs": 4000,
        "difficulty": "medium"
      },
      {
        "id": "python-code-gcd",
        "prompt": "Read two integers and print their GCD.",
        "starterCode": "import sys\n\ntext = sys.stdin.read()\n# TODO: solve gcd\nprint(0)\n",
        "tests": [
          {
            "stdin": "48 18\n",
            "expected": "6\n"
          },
          {
            "stdin": "17 13\n",
            "expected": "1\n"
          }
        ],
        "timeoutMs": 3500,
        "difficulty": "easy"
      },
      {
        "id": "python-code-range-sum",
        "prompt": "Line1 nums, line2 l r. Print sum nums[l..r].",
        "starterCode": "import sys\n\ntext = sys.stdin.read()\n# TODO: solve range-sum\nprint(0)\n",
        "tests": [
          {
            "stdin": "1 2 3 4 5\n1 3\n",
            "expected": "9\n"
          },
          {
            "stdin": "5 5 5\n0 2\n",
            "expected": "15\n"
          }
        ],
        "timeoutMs": 4000,
        "difficulty": "medium"
      },
      {
        "id": "python-code-diagonal-sum",
        "prompt": "Read 4 ints for 2x2 matrix row-wise. Print diagonal sum.",
        "starterCode": "import sys\n\ntext = sys.stdin.read()\n# TODO: solve diagonal-sum\nprint(0)\n",
        "tests": [
          {
            "stdin": "1 2 3 4\n",
            "expected": "5\n"
          },
          {
            "stdin": "5 1 1 5\n",
            "expected": "10\n"
          }
        ],
        "timeoutMs": 3500,
        "difficulty": "easy"
      },
      {
        "id": "python-code-dedupe-sorted",
        "prompt": "Read sorted integers and print unique values.",
        "starterCode": "import sys\n\ntext = sys.stdin.read()\n# TODO: solve dedupe-sorted\nprint(0)\n",
        "tests": [
          {
            "stdin": "1 1 2 2 3\n",
            "expected": "1 2 3\n"
          },
          {
            "stdin": "4 4 4\n",
            "expected": "4\n"
          }
        ],
        "timeoutMs": 3500,
        "difficulty": "medium"
      },
      {
        "id": "python-code-anagram",
        "prompt": "Line1 s, line2 t. Print true if anagrams else false.",
        "starterCode": "import sys\n\ntext = sys.stdin.read()\n# TODO: solve anagram\nprint('false')\n",
        "tests": [
          {
            "stdin": "listen\nsilent\n",
            "expected": "true\n"
          },
          {
            "stdin": "rat\ncar\n",
            "expected": "false\n"
          }
        ],
        "timeoutMs": 4000,
        "difficulty": "medium"
      },
      {
        "id": "python-code-longest-word-len",
        "prompt": "Read one line and print length of longest word.",
        "starterCode": "import sys\n\ntext = sys.stdin.read()\n# TODO: solve longest-word-len\nprint(0)\n",
        "tests": [
          {
            "stdin": "pebble builds confidence\n",
            "expected": "10\n"
          },
          {
            "stdin": "a bb ccc\n",
            "expected": "3\n"
          }
        ],
        "timeoutMs": 3500,
        "difficulty": "easy"
      }
    ]
  },
  "javascript": {
    "mcq": [
      {
        "id": "js-mcq-1",
        "prompt": "typeof [] returns?",
        "options": [
          "array",
          "object",
          "list",
          "undefined"
        ],
        "correctIndex": 1,
        "difficulty": "easy"
      },
      {
        "id": "js-mcq-2",
        "prompt": "Which declares block scope?",
        "options": [
          "var",
          "let",
          "global",
          "static"
        ],
        "correctIndex": 1,
        "difficulty": "easy"
      },
      {
        "id": "js-mcq-3",
        "prompt": "What is 2 + \"2\"?",
        "options": [
          "4",
          "22",
          "NaN",
          "Error"
        ],
        "correctIndex": 1,
        "difficulty": "easy"
      },
      {
        "id": "js-mcq-4",
        "prompt": "Which is strict equality?",
        "options": [
          "==",
          "=",
          "===",
          "!=="
        ],
        "correctIndex": 2,
        "difficulty": "easy"
      },
      {
        "id": "js-mcq-5",
        "prompt": "Node.js stdin common API?",
        "options": [
          "process.stdin",
          "window.stdin",
          "stdin()",
          "io.in"
        ],
        "correctIndex": 0,
        "difficulty": "easy"
      },
      {
        "id": "js-mcq-6",
        "prompt": "Array transform method?",
        "options": [
          "forEach",
          "map",
          "find",
          "some"
        ],
        "correctIndex": 1,
        "difficulty": "easy"
      },
      {
        "id": "js-mcq-7",
        "prompt": "What prints? Boolean(\"\")",
        "options": [
          "true",
          "false",
          "\"\"",
          "null"
        ],
        "correctIndex": 1,
        "difficulty": "easy"
      },
      {
        "id": "js-mcq-8",
        "prompt": "Which creates a Promise?",
        "options": [
          "setTimeout",
          "new Promise(...)",
          "await",
          "then"
        ],
        "correctIndex": 1,
        "difficulty": "medium"
      },
      {
        "id": "js-mcq-9",
        "prompt": "What does parseInt(\"08\",10) return?",
        "options": [
          "0",
          "8",
          "NaN",
          "10"
        ],
        "correctIndex": 1,
        "difficulty": "easy"
      },
      {
        "id": "js-mcq-10",
        "prompt": "Which method adds to array end?",
        "options": [
          "push",
          "pop",
          "shift",
          "unshift"
        ],
        "correctIndex": 0,
        "difficulty": "easy"
      },
      {
        "id": "js-mcq-11",
        "prompt": "Which removes first array element?",
        "options": [
          "pop",
          "shift",
          "splice(0,1)",
          "Both shift and splice(0,1)"
        ],
        "correctIndex": 3,
        "difficulty": "medium"
      },
      {
        "id": "js-mcq-12",
        "prompt": "What prints? [1,2,3].length",
        "options": [
          "2",
          "3",
          "4",
          "undefined"
        ],
        "correctIndex": 1,
        "difficulty": "easy"
      },
      {
        "id": "js-mcq-13",
        "prompt": "Object key existence best check?",
        "options": [
          "obj.hasOwnProperty(k)",
          "obj[k] !== undefined always",
          "k in JSON",
          "obj.contains(k)"
        ],
        "correctIndex": 0,
        "difficulty": "medium"
      },
      {
        "id": "js-mcq-14",
        "prompt": "Binary search complexity?",
        "options": [
          "O(n)",
          "O(log n)",
          "O(1)",
          "O(n log n)"
        ],
        "correctIndex": 1,
        "difficulty": "medium"
      },
      {
        "id": "js-mcq-15",
        "prompt": "What prints? Math.floor(3.9)",
        "options": [
          "3.9",
          "4",
          "3",
          "Error"
        ],
        "correctIndex": 2,
        "difficulty": "easy"
      },
      {
        "id": "js-mcq-16",
        "prompt": "What prints? \"ab\".repeat(2)",
        "options": [
          "abab",
          "ab2",
          "ab ab",
          "Error"
        ],
        "correctIndex": 0,
        "difficulty": "easy"
      },
      {
        "id": "js-mcq-17",
        "prompt": "What prints? Number(\"12\") + 1",
        "options": [
          "121",
          "13",
          "NaN",
          "Error"
        ],
        "correctIndex": 1,
        "difficulty": "easy"
      },
      {
        "id": "js-mcq-18",
        "prompt": "What prints? [1,2,3][0]",
        "options": [
          "0",
          "1",
          "2",
          "3"
        ],
        "correctIndex": 1,
        "difficulty": "easy"
      },
      {
        "id": "js-mcq-19",
        "prompt": "What prints? \"pebble\".toUpperCase()",
        "options": [
          "Pebble",
          "PEBBLE",
          "pebble",
          "Error"
        ],
        "correctIndex": 1,
        "difficulty": "easy"
      },
      {
        "id": "js-mcq-20",
        "prompt": "What prints? 5 % 2",
        "options": [
          "2",
          "2.5",
          "1",
          "0"
        ],
        "correctIndex": 2,
        "difficulty": "easy"
      },
      {
        "id": "js-mcq-21",
        "prompt": "What prints? \"x\".includes(\"x\")",
        "options": [
          "true",
          "false",
          "x",
          "Error"
        ],
        "correctIndex": 0,
        "difficulty": "easy"
      },
      {
        "id": "js-mcq-22",
        "prompt": "Set in JS stores?",
        "options": [
          "Duplicates only",
          "Unique values",
          "Only strings",
          "Only numbers"
        ],
        "correctIndex": 1,
        "difficulty": "medium"
      },
      {
        "id": "js-mcq-23",
        "prompt": "Map in JS stores?",
        "options": [
          "Index-based only",
          "Key-value pairs",
          "Only booleans",
          "Only arrays"
        ],
        "correctIndex": 1,
        "difficulty": "medium"
      },
      {
        "id": "js-mcq-24",
        "prompt": "const object means?",
        "options": [
          "Object immutable deeply",
          "Binding immutable",
          "Properties cannot change",
          "Throws always"
        ],
        "correctIndex": 1,
        "difficulty": "hard"
      },
      {
        "id": "js-mcq-25",
        "prompt": "What does await require?",
        "options": [
          "for loop",
          "async function (or module)",
          "callback",
          "class"
        ],
        "correctIndex": 1,
        "difficulty": "medium"
      },
      {
        "id": "js-mcq-26",
        "prompt": "Which is not mutating?",
        "options": [
          "sort",
          "reverse",
          "map",
          "splice"
        ],
        "correctIndex": 2,
        "difficulty": "medium"
      },
      {
        "id": "js-mcq-27",
        "prompt": "Two Sum optimal structure?",
        "options": [
          "Array scan only",
          "Hash map/object",
          "Stack",
          "Queue"
        ],
        "correctIndex": 1,
        "difficulty": "medium"
      },
      {
        "id": "js-mcq-28",
        "prompt": "What prints? !!0",
        "options": [
          "true",
          "false",
          "0",
          "Error"
        ],
        "correctIndex": 1,
        "difficulty": "easy"
      },
      {
        "id": "js-mcq-29",
        "prompt": "Time complexity of object lookup average?",
        "options": [
          "O(1)",
          "O(log n)",
          "O(n)",
          "O(n^2)"
        ],
        "correctIndex": 0,
        "difficulty": "medium"
      },
      {
        "id": "js-mcq-30",
        "prompt": "Event loop executes what first?",
        "options": [
          "setTimeout callback",
          "Synchronous code",
          "Promise then always",
          "I/O callback always"
        ],
        "correctIndex": 1,
        "difficulty": "hard"
      }
    ],
    "coding": [
      {
        "id": "javascript-code-sum-two",
        "prompt": "Read two integers and print their sum.",
        "starterCode": "const fs = require('fs')\nconst text = fs.readFileSync(0, 'utf8')\n// TODO: solve sum-two\nconsole.log(0)\n",
        "tests": [
          {
            "stdin": "4 8\n",
            "expected": "12\n"
          },
          {
            "stdin": "10 -3\n",
            "expected": "7\n"
          }
        ],
        "timeoutMs": 3500,
        "difficulty": "easy"
      },
      {
        "id": "javascript-code-max-three",
        "prompt": "Read three integers and print the maximum.",
        "starterCode": "const fs = require('fs')\nconst text = fs.readFileSync(0, 'utf8')\n// TODO: solve max-three\nconsole.log(0)\n",
        "tests": [
          {
            "stdin": "3 9 2\n",
            "expected": "9\n"
          },
          {
            "stdin": "-5 -2 -9\n",
            "expected": "-2\n"
          }
        ],
        "timeoutMs": 3500,
        "difficulty": "easy"
      },
      {
        "id": "javascript-code-reverse-string",
        "prompt": "Read one line and print the reversed string.",
        "starterCode": "const fs = require('fs')\nconst text = fs.readFileSync(0, 'utf8')\n// TODO: solve reverse-string\nconsole.log(0)\n",
        "tests": [
          {
            "stdin": "pebble\n",
            "expected": "elbbep\n"
          },
          {
            "stdin": "code\n",
            "expected": "edoc\n"
          }
        ],
        "timeoutMs": 3500,
        "difficulty": "easy"
      },
      {
        "id": "javascript-code-count-vowels",
        "prompt": "Read one line and print number of vowels (a,e,i,o,u).",
        "starterCode": "const fs = require('fs')\nconst text = fs.readFileSync(0, 'utf8')\n// TODO: solve count-vowels\nconsole.log(0)\n",
        "tests": [
          {
            "stdin": "pebble\n",
            "expected": "2\n"
          },
          {
            "stdin": "education\n",
            "expected": "5\n"
          }
        ],
        "timeoutMs": 3500,
        "difficulty": "easy"
      },
      {
        "id": "javascript-code-factorial",
        "prompt": "Read n and print n! for 0 <= n <= 12.",
        "starterCode": "const fs = require('fs')\nconst text = fs.readFileSync(0, 'utf8')\n// TODO: solve factorial\nconsole.log(0)\n",
        "tests": [
          {
            "stdin": "5\n",
            "expected": "120\n"
          },
          {
            "stdin": "0\n",
            "expected": "1\n"
          }
        ],
        "timeoutMs": 3500,
        "difficulty": "easy"
      },
      {
        "id": "javascript-code-fibonacci",
        "prompt": "Read n and print nth Fibonacci number (0-indexed).",
        "starterCode": "const fs = require('fs')\nconst text = fs.readFileSync(0, 'utf8')\n// TODO: solve fibonacci\nconsole.log(0)\n",
        "tests": [
          {
            "stdin": "7\n",
            "expected": "13\n"
          },
          {
            "stdin": "0\n",
            "expected": "0\n"
          }
        ],
        "timeoutMs": 3500,
        "difficulty": "medium"
      },
      {
        "id": "javascript-code-palindrome",
        "prompt": "Read one word and print true if palindrome else false.",
        "starterCode": "const fs = require('fs')\nconst text = fs.readFileSync(0, 'utf8')\n// TODO: solve palindrome\nconsole.log('false')\n",
        "tests": [
          {
            "stdin": "racecar\n",
            "expected": "true\n"
          },
          {
            "stdin": "pebble\n",
            "expected": "false\n"
          }
        ],
        "timeoutMs": 3500,
        "difficulty": "easy"
      },
      {
        "id": "javascript-code-sort-numbers",
        "prompt": "Read space-separated integers and print sorted ascending.",
        "starterCode": "const fs = require('fs')\nconst text = fs.readFileSync(0, 'utf8')\n// TODO: solve sort-numbers\nconsole.log(0)\n",
        "tests": [
          {
            "stdin": "4 1 3 2\n",
            "expected": "1 2 3 4\n"
          },
          {
            "stdin": "9 -1 5\n",
            "expected": "-1 5 9\n"
          }
        ],
        "timeoutMs": 3500,
        "difficulty": "medium"
      },
      {
        "id": "javascript-code-two-sum",
        "prompt": "Line1 nums, line2 target. Print indices i j of first valid pair.",
        "starterCode": "const fs = require('fs')\nconst text = fs.readFileSync(0, 'utf8')\n// TODO: solve two-sum\nconsole.log(0)\n",
        "tests": [
          {
            "stdin": "2 7 11 15\n9\n",
            "expected": "0 1\n"
          },
          {
            "stdin": "3 2 4\n6\n",
            "expected": "1 2\n"
          }
        ],
        "timeoutMs": 4000,
        "difficulty": "medium"
      },
      {
        "id": "javascript-code-first-unique",
        "prompt": "Read string and print first non-repeating char index, else -1.",
        "starterCode": "const fs = require('fs')\nconst text = fs.readFileSync(0, 'utf8')\n// TODO: solve first-unique\nconsole.log(0)\n",
        "tests": [
          {
            "stdin": "leetcode\n",
            "expected": "0\n"
          },
          {
            "stdin": "aabb\n",
            "expected": "-1\n"
          }
        ],
        "timeoutMs": 4000,
        "difficulty": "medium"
      },
      {
        "id": "javascript-code-word-count",
        "prompt": "Read one line and print count of words.",
        "starterCode": "const fs = require('fs')\nconst text = fs.readFileSync(0, 'utf8')\n// TODO: solve word-count\nconsole.log(0)\n",
        "tests": [
          {
            "stdin": "hello pebble world\n",
            "expected": "3\n"
          },
          {
            "stdin": "one\n",
            "expected": "1\n"
          }
        ],
        "timeoutMs": 3500,
        "difficulty": "easy"
      },
      {
        "id": "javascript-code-rotate-right",
        "prompt": "Line1 nums, line2 k. Rotate right by k and print result.",
        "starterCode": "const fs = require('fs')\nconst text = fs.readFileSync(0, 'utf8')\n// TODO: solve rotate-right\nconsole.log(0)\n",
        "tests": [
          {
            "stdin": "1 2 3 4 5\n2\n",
            "expected": "4 5 1 2 3\n"
          },
          {
            "stdin": "7 8 9\n1\n",
            "expected": "9 7 8\n"
          }
        ],
        "timeoutMs": 4000,
        "difficulty": "medium"
      },
      {
        "id": "javascript-code-merge-sorted",
        "prompt": "Line1 sorted A, line2 sorted B. Merge and print sorted.",
        "starterCode": "const fs = require('fs')\nconst text = fs.readFileSync(0, 'utf8')\n// TODO: solve merge-sorted\nconsole.log(0)\n",
        "tests": [
          {
            "stdin": "1 3 5\n2 4 6\n",
            "expected": "1 2 3 4 5 6\n"
          },
          {
            "stdin": "1 2\n3 4 5\n",
            "expected": "1 2 3 4 5\n"
          }
        ],
        "timeoutMs": 4000,
        "difficulty": "medium"
      },
      {
        "id": "javascript-code-valid-parentheses",
        "prompt": "Read parentheses string and print true if valid else false.",
        "starterCode": "const fs = require('fs')\nconst text = fs.readFileSync(0, 'utf8')\n// TODO: solve valid-parentheses\nconsole.log('false')\n",
        "tests": [
          {
            "stdin": "()[]{}\n",
            "expected": "true\n"
          },
          {
            "stdin": "([)]\n",
            "expected": "false\n"
          }
        ],
        "timeoutMs": 4000,
        "difficulty": "medium"
      },
      {
        "id": "javascript-code-gcd",
        "prompt": "Read two integers and print their GCD.",
        "starterCode": "const fs = require('fs')\nconst text = fs.readFileSync(0, 'utf8')\n// TODO: solve gcd\nconsole.log(0)\n",
        "tests": [
          {
            "stdin": "48 18\n",
            "expected": "6\n"
          },
          {
            "stdin": "17 13\n",
            "expected": "1\n"
          }
        ],
        "timeoutMs": 3500,
        "difficulty": "easy"
      },
      {
        "id": "javascript-code-range-sum",
        "prompt": "Line1 nums, line2 l r. Print sum nums[l..r].",
        "starterCode": "const fs = require('fs')\nconst text = fs.readFileSync(0, 'utf8')\n// TODO: solve range-sum\nconsole.log(0)\n",
        "tests": [
          {
            "stdin": "1 2 3 4 5\n1 3\n",
            "expected": "9\n"
          },
          {
            "stdin": "5 5 5\n0 2\n",
            "expected": "15\n"
          }
        ],
        "timeoutMs": 4000,
        "difficulty": "medium"
      },
      {
        "id": "javascript-code-diagonal-sum",
        "prompt": "Read 4 ints for 2x2 matrix row-wise. Print diagonal sum.",
        "starterCode": "const fs = require('fs')\nconst text = fs.readFileSync(0, 'utf8')\n// TODO: solve diagonal-sum\nconsole.log(0)\n",
        "tests": [
          {
            "stdin": "1 2 3 4\n",
            "expected": "5\n"
          },
          {
            "stdin": "5 1 1 5\n",
            "expected": "10\n"
          }
        ],
        "timeoutMs": 3500,
        "difficulty": "easy"
      },
      {
        "id": "javascript-code-dedupe-sorted",
        "prompt": "Read sorted integers and print unique values.",
        "starterCode": "const fs = require('fs')\nconst text = fs.readFileSync(0, 'utf8')\n// TODO: solve dedupe-sorted\nconsole.log(0)\n",
        "tests": [
          {
            "stdin": "1 1 2 2 3\n",
            "expected": "1 2 3\n"
          },
          {
            "stdin": "4 4 4\n",
            "expected": "4\n"
          }
        ],
        "timeoutMs": 3500,
        "difficulty": "medium"
      },
      {
        "id": "javascript-code-anagram",
        "prompt": "Line1 s, line2 t. Print true if anagrams else false.",
        "starterCode": "const fs = require('fs')\nconst text = fs.readFileSync(0, 'utf8')\n// TODO: solve anagram\nconsole.log('false')\n",
        "tests": [
          {
            "stdin": "listen\nsilent\n",
            "expected": "true\n"
          },
          {
            "stdin": "rat\ncar\n",
            "expected": "false\n"
          }
        ],
        "timeoutMs": 4000,
        "difficulty": "medium"
      },
      {
        "id": "javascript-code-longest-word-len",
        "prompt": "Read one line and print length of longest word.",
        "starterCode": "const fs = require('fs')\nconst text = fs.readFileSync(0, 'utf8')\n// TODO: solve longest-word-len\nconsole.log(0)\n",
        "tests": [
          {
            "stdin": "pebble builds confidence\n",
            "expected": "10\n"
          },
          {
            "stdin": "a bb ccc\n",
            "expected": "3\n"
          }
        ],
        "timeoutMs": 3500,
        "difficulty": "easy"
      }
    ]
  },
  "cpp": {
    "mcq": [
      {
        "id": "cpp-mcq-1",
        "prompt": "Header for std::cout?",
        "options": [
          "<stdio.h>",
          "<iostream>",
          "<ostream.h>",
          "<cstdio>"
        ],
        "correctIndex": 1,
        "difficulty": "easy"
      },
      {
        "id": "cpp-mcq-2",
        "prompt": "Vector provides?",
        "options": [
          "Linked nodes",
          "Contiguous storage",
          "Tree ordering",
          "Hash buckets only"
        ],
        "correctIndex": 1,
        "difficulty": "easy"
      },
      {
        "id": "cpp-mcq-3",
        "prompt": "Operator for pointer member access?",
        "options": [
          ".",
          "::",
          "->",
          "&"
        ],
        "correctIndex": 2,
        "difficulty": "easy"
      },
      {
        "id": "cpp-mcq-4",
        "prompt": "Binary search complexity?",
        "options": [
          "O(n)",
          "O(log n)",
          "O(1)",
          "O(n log n)"
        ],
        "correctIndex": 1,
        "difficulty": "easy"
      },
      {
        "id": "cpp-mcq-5",
        "prompt": "Which adds to vector end?",
        "options": [
          "push",
          "append",
          "push_back",
          "add"
        ],
        "correctIndex": 2,
        "difficulty": "easy"
      },
      {
        "id": "cpp-mcq-6",
        "prompt": "std::string length method?",
        "options": [
          "size()",
          "len()",
          "lengthof()",
          "count() only"
        ],
        "correctIndex": 0,
        "difficulty": "easy"
      },
      {
        "id": "cpp-mcq-7",
        "prompt": "What is true for pass-by-reference?",
        "options": [
          "Copies value",
          "Aliases original object",
          "Only for int",
          "Not allowed"
        ],
        "correctIndex": 1,
        "difficulty": "medium"
      },
      {
        "id": "cpp-mcq-8",
        "prompt": "Which container gives key-value mapping?",
        "options": [
          "vector",
          "map",
          "set",
          "deque"
        ],
        "correctIndex": 1,
        "difficulty": "easy"
      },
      {
        "id": "cpp-mcq-9",
        "prompt": "unordered_map average lookup?",
        "options": [
          "O(1)",
          "O(log n)",
          "O(n)",
          "O(n log n)"
        ],
        "correctIndex": 0,
        "difficulty": "medium"
      },
      {
        "id": "cpp-mcq-10",
        "prompt": "What does std::sort require?",
        "options": [
          "Random-access iterators",
          "Queue",
          "Stack",
          "Tree only"
        ],
        "correctIndex": 0,
        "difficulty": "medium"
      },
      {
        "id": "cpp-mcq-11",
        "prompt": "What prints? std::cout << (7/2);",
        "options": [
          "3.5",
          "3",
          "4",
          "Error"
        ],
        "correctIndex": 1,
        "difficulty": "easy"
      },
      {
        "id": "cpp-mcq-12",
        "prompt": "What keyword for constant variable?",
        "options": [
          "static",
          "const",
          "final",
          "readonly"
        ],
        "correctIndex": 1,
        "difficulty": "easy"
      },
      {
        "id": "cpp-mcq-13",
        "prompt": "What prints? std::max(3,9)",
        "options": [
          "3",
          "9",
          "12",
          "Error"
        ],
        "correctIndex": 1,
        "difficulty": "easy"
      },
      {
        "id": "cpp-mcq-14",
        "prompt": "Use for LIFO stack?",
        "options": [
          "queue",
          "stack",
          "deque only",
          "vector only"
        ],
        "correctIndex": 1,
        "difficulty": "easy"
      },
      {
        "id": "cpp-mcq-15",
        "prompt": "Which loop visits each vector item?",
        "options": [
          "for (int i=0;i<n;++i)",
          "while(true)",
          "switch",
          "goto"
        ],
        "correctIndex": 0,
        "difficulty": "easy"
      },
      {
        "id": "cpp-mcq-16",
        "prompt": "What does v.pop_back() return?",
        "options": [
          "Popped value",
          "bool",
          "void",
          "index"
        ],
        "correctIndex": 2,
        "difficulty": "medium"
      },
      {
        "id": "cpp-mcq-17",
        "prompt": "Preferred include over bits/stdc++.h for portability?",
        "options": [
          "bits/stdc++.h",
          "specific std headers",
          "no headers",
          "stdio only"
        ],
        "correctIndex": 1,
        "difficulty": "medium"
      },
      {
        "id": "cpp-mcq-18",
        "prompt": "When should you use long long?",
        "options": [
          "Never",
          "When int can overflow",
          "Only for strings",
          "Only for loops"
        ],
        "correctIndex": 1,
        "difficulty": "easy"
      },
      {
        "id": "cpp-mcq-19",
        "prompt": "Palindrome two-pointer complexity?",
        "options": [
          "O(n)",
          "O(log n)",
          "O(n^2)",
          "O(1)"
        ],
        "correctIndex": 0,
        "difficulty": "medium"
      },
      {
        "id": "cpp-mcq-20",
        "prompt": "What is RAII?",
        "options": [
          "Runtime API",
          "Resource lifetime bound to object lifetime",
          "Random algo interface",
          "None"
        ],
        "correctIndex": 1,
        "difficulty": "hard"
      },
      {
        "id": "cpp-mcq-21",
        "prompt": "What prints? std::string(\"ab\") + \"c\"",
        "options": [
          "abc",
          "ab",
          "c",
          "Error"
        ],
        "correctIndex": 0,
        "difficulty": "easy"
      },
      {
        "id": "cpp-mcq-22",
        "prompt": "std::getline reads until?",
        "options": [
          "Space",
          "Tab",
          "Newline",
          "EOF only"
        ],
        "correctIndex": 2,
        "difficulty": "easy"
      },
      {
        "id": "cpp-mcq-23",
        "prompt": "For faster stream I/O in contests, common tweak?",
        "options": [
          "sync_with_stdio(false)",
          "use scanf only",
          "avoid cin",
          "none"
        ],
        "correctIndex": 0,
        "difficulty": "hard"
      },
      {
        "id": "cpp-mcq-24",
        "prompt": "Which STL container keeps sorted keys?",
        "options": [
          "unordered_map",
          "map",
          "vector",
          "queue"
        ],
        "correctIndex": 1,
        "difficulty": "medium"
      },
      {
        "id": "cpp-mcq-25",
        "prompt": "What does std::reverse do?",
        "options": [
          "Sort ascending",
          "Reverse range in place",
          "Copy only",
          "Rotate"
        ],
        "correctIndex": 1,
        "difficulty": "easy"
      },
      {
        "id": "cpp-mcq-26",
        "prompt": "Check key in unordered_map um?",
        "options": [
          "um.has(k)",
          "um.find(k)!=um.end()",
          "k in um",
          "um.containsKey(k)"
        ],
        "correctIndex": 1,
        "difficulty": "medium"
      },
      {
        "id": "cpp-mcq-27",
        "prompt": "Complexity of single pass scan?",
        "options": [
          "O(1)",
          "O(log n)",
          "O(n)",
          "O(n^2)"
        ],
        "correctIndex": 2,
        "difficulty": "easy"
      },
      {
        "id": "cpp-mcq-28",
        "prompt": "With boolalpha, true prints as?",
        "options": [
          "1",
          "true",
          "TRUE",
          "t"
        ],
        "correctIndex": 1,
        "difficulty": "medium"
      },
      {
        "id": "cpp-mcq-29",
        "prompt": "Which container is best for FIFO?",
        "options": [
          "stack",
          "queue",
          "set",
          "map"
        ],
        "correctIndex": 1,
        "difficulty": "easy"
      },
      {
        "id": "cpp-mcq-30",
        "prompt": "Recursion must include?",
        "options": [
          "for loop",
          "Base case",
          "Class",
          "Template"
        ],
        "correctIndex": 1,
        "difficulty": "hard"
      }
    ],
    "coding": [
      {
        "id": "cpp-code-sum-two",
        "prompt": "Read two integers and print their sum.",
        "starterCode": "#include <algorithm>\n#include <iostream>\n#include <sstream>\n#include <stack>\n#include <string>\n#include <unordered_map>\n#include <vector>\n\nint main() {\n  std::string text((std::istreambuf_iterator<char>(std::cin)), std::istreambuf_iterator<char>());\n  // TODO: solve sum-two\n  std::cout << 0 << std::endl;\n  return 0;\n}\n",
        "tests": [
          {
            "stdin": "4 8\n",
            "expected": "12\n"
          },
          {
            "stdin": "10 -3\n",
            "expected": "7\n"
          }
        ],
        "timeoutMs": 3500,
        "difficulty": "easy"
      },
      {
        "id": "cpp-code-max-three",
        "prompt": "Read three integers and print the maximum.",
        "starterCode": "#include <algorithm>\n#include <iostream>\n#include <sstream>\n#include <stack>\n#include <string>\n#include <unordered_map>\n#include <vector>\n\nint main() {\n  std::string text((std::istreambuf_iterator<char>(std::cin)), std::istreambuf_iterator<char>());\n  // TODO: solve max-three\n  std::cout << 0 << std::endl;\n  return 0;\n}\n",
        "tests": [
          {
            "stdin": "3 9 2\n",
            "expected": "9\n"
          },
          {
            "stdin": "-5 -2 -9\n",
            "expected": "-2\n"
          }
        ],
        "timeoutMs": 3500,
        "difficulty": "easy"
      },
      {
        "id": "cpp-code-reverse-string",
        "prompt": "Read one line and print the reversed string.",
        "starterCode": "#include <algorithm>\n#include <iostream>\n#include <sstream>\n#include <stack>\n#include <string>\n#include <unordered_map>\n#include <vector>\n\nint main() {\n  std::string text((std::istreambuf_iterator<char>(std::cin)), std::istreambuf_iterator<char>());\n  // TODO: solve reverse-string\n  std::cout << 0 << std::endl;\n  return 0;\n}\n",
        "tests": [
          {
            "stdin": "pebble\n",
            "expected": "elbbep\n"
          },
          {
            "stdin": "code\n",
            "expected": "edoc\n"
          }
        ],
        "timeoutMs": 3500,
        "difficulty": "easy"
      },
      {
        "id": "cpp-code-count-vowels",
        "prompt": "Read one line and print number of vowels (a,e,i,o,u).",
        "starterCode": "#include <algorithm>\n#include <iostream>\n#include <sstream>\n#include <stack>\n#include <string>\n#include <unordered_map>\n#include <vector>\n\nint main() {\n  std::string text((std::istreambuf_iterator<char>(std::cin)), std::istreambuf_iterator<char>());\n  // TODO: solve count-vowels\n  std::cout << 0 << std::endl;\n  return 0;\n}\n",
        "tests": [
          {
            "stdin": "pebble\n",
            "expected": "2\n"
          },
          {
            "stdin": "education\n",
            "expected": "5\n"
          }
        ],
        "timeoutMs": 3500,
        "difficulty": "easy"
      },
      {
        "id": "cpp-code-factorial",
        "prompt": "Read n and print n! for 0 <= n <= 12.",
        "starterCode": "#include <algorithm>\n#include <iostream>\n#include <sstream>\n#include <stack>\n#include <string>\n#include <unordered_map>\n#include <vector>\n\nint main() {\n  std::string text((std::istreambuf_iterator<char>(std::cin)), std::istreambuf_iterator<char>());\n  // TODO: solve factorial\n  std::cout << 0 << std::endl;\n  return 0;\n}\n",
        "tests": [
          {
            "stdin": "5\n",
            "expected": "120\n"
          },
          {
            "stdin": "0\n",
            "expected": "1\n"
          }
        ],
        "timeoutMs": 3500,
        "difficulty": "easy"
      },
      {
        "id": "cpp-code-fibonacci",
        "prompt": "Read n and print nth Fibonacci number (0-indexed).",
        "starterCode": "#include <algorithm>\n#include <iostream>\n#include <sstream>\n#include <stack>\n#include <string>\n#include <unordered_map>\n#include <vector>\n\nint main() {\n  std::string text((std::istreambuf_iterator<char>(std::cin)), std::istreambuf_iterator<char>());\n  // TODO: solve fibonacci\n  std::cout << 0 << std::endl;\n  return 0;\n}\n",
        "tests": [
          {
            "stdin": "7\n",
            "expected": "13\n"
          },
          {
            "stdin": "0\n",
            "expected": "0\n"
          }
        ],
        "timeoutMs": 3500,
        "difficulty": "medium"
      },
      {
        "id": "cpp-code-palindrome",
        "prompt": "Read one word and print true if palindrome else false.",
        "starterCode": "#include <algorithm>\n#include <iostream>\n#include <sstream>\n#include <stack>\n#include <string>\n#include <unordered_map>\n#include <vector>\n\nint main() {\n  std::string text((std::istreambuf_iterator<char>(std::cin)), std::istreambuf_iterator<char>());\n  // TODO: solve palindrome\n  std::cout << \"false\" << std::endl;\n  return 0;\n}\n",
        "tests": [
          {
            "stdin": "racecar\n",
            "expected": "true\n"
          },
          {
            "stdin": "pebble\n",
            "expected": "false\n"
          }
        ],
        "timeoutMs": 3500,
        "difficulty": "easy"
      },
      {
        "id": "cpp-code-sort-numbers",
        "prompt": "Read space-separated integers and print sorted ascending.",
        "starterCode": "#include <algorithm>\n#include <iostream>\n#include <sstream>\n#include <stack>\n#include <string>\n#include <unordered_map>\n#include <vector>\n\nint main() {\n  std::string text((std::istreambuf_iterator<char>(std::cin)), std::istreambuf_iterator<char>());\n  // TODO: solve sort-numbers\n  std::cout << 0 << std::endl;\n  return 0;\n}\n",
        "tests": [
          {
            "stdin": "4 1 3 2\n",
            "expected": "1 2 3 4\n"
          },
          {
            "stdin": "9 -1 5\n",
            "expected": "-1 5 9\n"
          }
        ],
        "timeoutMs": 3500,
        "difficulty": "medium"
      },
      {
        "id": "cpp-code-two-sum",
        "prompt": "Line1 nums, line2 target. Print indices i j of first valid pair.",
        "starterCode": "#include <algorithm>\n#include <iostream>\n#include <sstream>\n#include <stack>\n#include <string>\n#include <unordered_map>\n#include <vector>\n\nint main() {\n  std::string text((std::istreambuf_iterator<char>(std::cin)), std::istreambuf_iterator<char>());\n  // TODO: solve two-sum\n  std::cout << 0 << std::endl;\n  return 0;\n}\n",
        "tests": [
          {
            "stdin": "2 7 11 15\n9\n",
            "expected": "0 1\n"
          },
          {
            "stdin": "3 2 4\n6\n",
            "expected": "1 2\n"
          }
        ],
        "timeoutMs": 4000,
        "difficulty": "medium"
      },
      {
        "id": "cpp-code-first-unique",
        "prompt": "Read string and print first non-repeating char index, else -1.",
        "starterCode": "#include <algorithm>\n#include <iostream>\n#include <sstream>\n#include <stack>\n#include <string>\n#include <unordered_map>\n#include <vector>\n\nint main() {\n  std::string text((std::istreambuf_iterator<char>(std::cin)), std::istreambuf_iterator<char>());\n  // TODO: solve first-unique\n  std::cout << 0 << std::endl;\n  return 0;\n}\n",
        "tests": [
          {
            "stdin": "leetcode\n",
            "expected": "0\n"
          },
          {
            "stdin": "aabb\n",
            "expected": "-1\n"
          }
        ],
        "timeoutMs": 4000,
        "difficulty": "medium"
      },
      {
        "id": "cpp-code-word-count",
        "prompt": "Read one line and print count of words.",
        "starterCode": "#include <algorithm>\n#include <iostream>\n#include <sstream>\n#include <stack>\n#include <string>\n#include <unordered_map>\n#include <vector>\n\nint main() {\n  std::string text((std::istreambuf_iterator<char>(std::cin)), std::istreambuf_iterator<char>());\n  // TODO: solve word-count\n  std::cout << 0 << std::endl;\n  return 0;\n}\n",
        "tests": [
          {
            "stdin": "hello pebble world\n",
            "expected": "3\n"
          },
          {
            "stdin": "one\n",
            "expected": "1\n"
          }
        ],
        "timeoutMs": 3500,
        "difficulty": "easy"
      },
      {
        "id": "cpp-code-rotate-right",
        "prompt": "Line1 nums, line2 k. Rotate right by k and print result.",
        "starterCode": "#include <algorithm>\n#include <iostream>\n#include <sstream>\n#include <stack>\n#include <string>\n#include <unordered_map>\n#include <vector>\n\nint main() {\n  std::string text((std::istreambuf_iterator<char>(std::cin)), std::istreambuf_iterator<char>());\n  // TODO: solve rotate-right\n  std::cout << 0 << std::endl;\n  return 0;\n}\n",
        "tests": [
          {
            "stdin": "1 2 3 4 5\n2\n",
            "expected": "4 5 1 2 3\n"
          },
          {
            "stdin": "7 8 9\n1\n",
            "expected": "9 7 8\n"
          }
        ],
        "timeoutMs": 4000,
        "difficulty": "medium"
      },
      {
        "id": "cpp-code-merge-sorted",
        "prompt": "Line1 sorted A, line2 sorted B. Merge and print sorted.",
        "starterCode": "#include <algorithm>\n#include <iostream>\n#include <sstream>\n#include <stack>\n#include <string>\n#include <unordered_map>\n#include <vector>\n\nint main() {\n  std::string text((std::istreambuf_iterator<char>(std::cin)), std::istreambuf_iterator<char>());\n  // TODO: solve merge-sorted\n  std::cout << 0 << std::endl;\n  return 0;\n}\n",
        "tests": [
          {
            "stdin": "1 3 5\n2 4 6\n",
            "expected": "1 2 3 4 5 6\n"
          },
          {
            "stdin": "1 2\n3 4 5\n",
            "expected": "1 2 3 4 5\n"
          }
        ],
        "timeoutMs": 4000,
        "difficulty": "medium"
      },
      {
        "id": "cpp-code-valid-parentheses",
        "prompt": "Read parentheses string and print true if valid else false.",
        "starterCode": "#include <algorithm>\n#include <iostream>\n#include <sstream>\n#include <stack>\n#include <string>\n#include <unordered_map>\n#include <vector>\n\nint main() {\n  std::string text((std::istreambuf_iterator<char>(std::cin)), std::istreambuf_iterator<char>());\n  // TODO: solve valid-parentheses\n  std::cout << \"false\" << std::endl;\n  return 0;\n}\n",
        "tests": [
          {
            "stdin": "()[]{}\n",
            "expected": "true\n"
          },
          {
            "stdin": "([)]\n",
            "expected": "false\n"
          }
        ],
        "timeoutMs": 4000,
        "difficulty": "medium"
      },
      {
        "id": "cpp-code-gcd",
        "prompt": "Read two integers and print their GCD.",
        "starterCode": "#include <algorithm>\n#include <iostream>\n#include <sstream>\n#include <stack>\n#include <string>\n#include <unordered_map>\n#include <vector>\n\nint main() {\n  std::string text((std::istreambuf_iterator<char>(std::cin)), std::istreambuf_iterator<char>());\n  // TODO: solve gcd\n  std::cout << 0 << std::endl;\n  return 0;\n}\n",
        "tests": [
          {
            "stdin": "48 18\n",
            "expected": "6\n"
          },
          {
            "stdin": "17 13\n",
            "expected": "1\n"
          }
        ],
        "timeoutMs": 3500,
        "difficulty": "easy"
      },
      {
        "id": "cpp-code-range-sum",
        "prompt": "Line1 nums, line2 l r. Print sum nums[l..r].",
        "starterCode": "#include <algorithm>\n#include <iostream>\n#include <sstream>\n#include <stack>\n#include <string>\n#include <unordered_map>\n#include <vector>\n\nint main() {\n  std::string text((std::istreambuf_iterator<char>(std::cin)), std::istreambuf_iterator<char>());\n  // TODO: solve range-sum\n  std::cout << 0 << std::endl;\n  return 0;\n}\n",
        "tests": [
          {
            "stdin": "1 2 3 4 5\n1 3\n",
            "expected": "9\n"
          },
          {
            "stdin": "5 5 5\n0 2\n",
            "expected": "15\n"
          }
        ],
        "timeoutMs": 4000,
        "difficulty": "medium"
      },
      {
        "id": "cpp-code-diagonal-sum",
        "prompt": "Read 4 ints for 2x2 matrix row-wise. Print diagonal sum.",
        "starterCode": "#include <algorithm>\n#include <iostream>\n#include <sstream>\n#include <stack>\n#include <string>\n#include <unordered_map>\n#include <vector>\n\nint main() {\n  std::string text((std::istreambuf_iterator<char>(std::cin)), std::istreambuf_iterator<char>());\n  // TODO: solve diagonal-sum\n  std::cout << 0 << std::endl;\n  return 0;\n}\n",
        "tests": [
          {
            "stdin": "1 2 3 4\n",
            "expected": "5\n"
          },
          {
            "stdin": "5 1 1 5\n",
            "expected": "10\n"
          }
        ],
        "timeoutMs": 3500,
        "difficulty": "easy"
      },
      {
        "id": "cpp-code-dedupe-sorted",
        "prompt": "Read sorted integers and print unique values.",
        "starterCode": "#include <algorithm>\n#include <iostream>\n#include <sstream>\n#include <stack>\n#include <string>\n#include <unordered_map>\n#include <vector>\n\nint main() {\n  std::string text((std::istreambuf_iterator<char>(std::cin)), std::istreambuf_iterator<char>());\n  // TODO: solve dedupe-sorted\n  std::cout << 0 << std::endl;\n  return 0;\n}\n",
        "tests": [
          {
            "stdin": "1 1 2 2 3\n",
            "expected": "1 2 3\n"
          },
          {
            "stdin": "4 4 4\n",
            "expected": "4\n"
          }
        ],
        "timeoutMs": 3500,
        "difficulty": "medium"
      },
      {
        "id": "cpp-code-anagram",
        "prompt": "Line1 s, line2 t. Print true if anagrams else false.",
        "starterCode": "#include <algorithm>\n#include <iostream>\n#include <sstream>\n#include <stack>\n#include <string>\n#include <unordered_map>\n#include <vector>\n\nint main() {\n  std::string text((std::istreambuf_iterator<char>(std::cin)), std::istreambuf_iterator<char>());\n  // TODO: solve anagram\n  std::cout << \"false\" << std::endl;\n  return 0;\n}\n",
        "tests": [
          {
            "stdin": "listen\nsilent\n",
            "expected": "true\n"
          },
          {
            "stdin": "rat\ncar\n",
            "expected": "false\n"
          }
        ],
        "timeoutMs": 4000,
        "difficulty": "medium"
      },
      {
        "id": "cpp-code-longest-word-len",
        "prompt": "Read one line and print length of longest word.",
        "starterCode": "#include <algorithm>\n#include <iostream>\n#include <sstream>\n#include <stack>\n#include <string>\n#include <unordered_map>\n#include <vector>\n\nint main() {\n  std::string text((std::istreambuf_iterator<char>(std::cin)), std::istreambuf_iterator<char>());\n  // TODO: solve longest-word-len\n  std::cout << 0 << std::endl;\n  return 0;\n}\n",
        "tests": [
          {
            "stdin": "pebble builds confidence\n",
            "expected": "10\n"
          },
          {
            "stdin": "a bb ccc\n",
            "expected": "3\n"
          }
        ],
        "timeoutMs": 3500,
        "difficulty": "easy"
      }
    ]
  },
  "java": {
    "mcq": [
      {
        "id": "java-mcq-1",
        "prompt": "JVM entry point signature?",
        "options": [
          "void start()",
          "main(String[] args)",
          "run()",
          "init()"
        ],
        "correctIndex": 1,
        "difficulty": "easy"
      },
      {
        "id": "java-mcq-2",
        "prompt": "Java compiles to?",
        "options": [
          "Machine code directly",
          "Bytecode",
          "Python code",
          "Assembly only"
        ],
        "correctIndex": 1,
        "difficulty": "easy"
      },
      {
        "id": "java-mcq-3",
        "prompt": "Collection for key-value pairs?",
        "options": [
          "List",
          "Set",
          "Map",
          "Queue"
        ],
        "correctIndex": 2,
        "difficulty": "easy"
      },
      {
        "id": "java-mcq-4",
        "prompt": "Which modifier means visible everywhere?",
        "options": [
          "private",
          "protected",
          "public",
          "default"
        ],
        "correctIndex": 2,
        "difficulty": "easy"
      },
      {
        "id": "java-mcq-5",
        "prompt": "Which class commonly reads stdin?",
        "options": [
          "Printer",
          "Scanner",
          "ReaderX",
          "ConsoleIn"
        ],
        "correctIndex": 1,
        "difficulty": "easy"
      },
      {
        "id": "java-mcq-6",
        "prompt": "String in Java is?",
        "options": [
          "mutable",
          "immutable",
          "numeric",
          "pointer"
        ],
        "correctIndex": 1,
        "difficulty": "easy"
      },
      {
        "id": "java-mcq-7",
        "prompt": "What does 7/2 evaluate to with ints?",
        "options": [
          "3.5",
          "3",
          "4",
          "Error"
        ],
        "correctIndex": 1,
        "difficulty": "easy"
      },
      {
        "id": "java-mcq-8",
        "prompt": "ArrayList index access complexity?",
        "options": [
          "O(1)",
          "O(log n)",
          "O(n)",
          "O(n log n)"
        ],
        "correctIndex": 0,
        "difficulty": "medium"
      },
      {
        "id": "java-mcq-9",
        "prompt": "HashMap average lookup?",
        "options": [
          "O(1)",
          "O(log n)",
          "O(n)",
          "O(n^2)"
        ],
        "correctIndex": 0,
        "difficulty": "medium"
      },
      {
        "id": "java-mcq-10",
        "prompt": "Map preserving insertion order?",
        "options": [
          "HashMap",
          "TreeMap",
          "LinkedHashMap",
          "Hashtable"
        ],
        "correctIndex": 2,
        "difficulty": "hard"
      },
      {
        "id": "java-mcq-11",
        "prompt": "What prints? Math.max(3,9)",
        "options": [
          "3",
          "9",
          "12",
          "Error"
        ],
        "correctIndex": 1,
        "difficulty": "easy"
      },
      {
        "id": "java-mcq-12",
        "prompt": "String length method?",
        "options": [
          "size()",
          "len()",
          "length()",
          "count()"
        ],
        "correctIndex": 2,
        "difficulty": "easy"
      },
      {
        "id": "java-mcq-13",
        "prompt": "Check key in map?",
        "options": [
          "contains()",
          "hasKey()",
          "containsKey()",
          "keyIn()"
        ],
        "correctIndex": 2,
        "difficulty": "easy"
      },
      {
        "id": "java-mcq-14",
        "prompt": "List append method?",
        "options": [
          "push",
          "add",
          "append",
          "insertLast"
        ],
        "correctIndex": 1,
        "difficulty": "easy"
      },
      {
        "id": "java-mcq-15",
        "prompt": "Two Sum optimal DS?",
        "options": [
          "ArrayList",
          "HashMap",
          "Stack",
          "Queue"
        ],
        "correctIndex": 1,
        "difficulty": "medium"
      },
      {
        "id": "java-mcq-16",
        "prompt": "Collections.sort(list) does?",
        "options": [
          "Reverse",
          "Sort ascending",
          "Shuffle",
          "Deduplicate"
        ],
        "correctIndex": 1,
        "difficulty": "easy"
      },
      {
        "id": "java-mcq-17",
        "prompt": "== for String compares?",
        "options": [
          "content",
          "references",
          "always true",
          "compile error"
        ],
        "correctIndex": 1,
        "difficulty": "hard"
      },
      {
        "id": "java-mcq-18",
        "prompt": ".equals is for?",
        "options": [
          "primitive compare only",
          "object content equality",
          "casting",
          "looping"
        ],
        "correctIndex": 1,
        "difficulty": "medium"
      },
      {
        "id": "java-mcq-19",
        "prompt": "What prints? \"ab\" + \"c\"",
        "options": [
          "ab",
          "abc",
          "c",
          "Error"
        ],
        "correctIndex": 1,
        "difficulty": "easy"
      },
      {
        "id": "java-mcq-20",
        "prompt": "Boolean.parseBoolean(\"true\") returns?",
        "options": [
          "1",
          "true",
          "True",
          "error"
        ],
        "correctIndex": 1,
        "difficulty": "easy"
      },
      {
        "id": "java-mcq-21",
        "prompt": "Which data structure for FIFO?",
        "options": [
          "Stack",
          "Queue",
          "Set",
          "Map"
        ],
        "correctIndex": 1,
        "difficulty": "easy"
      },
      {
        "id": "java-mcq-22",
        "prompt": "TreeMap key order?",
        "options": [
          "Insertion",
          "Random",
          "Sorted",
          "Reverse insertion"
        ],
        "correctIndex": 2,
        "difficulty": "medium"
      },
      {
        "id": "java-mcq-23",
        "prompt": "Binary search on sorted array complexity?",
        "options": [
          "O(n)",
          "O(log n)",
          "O(1)",
          "O(n log n)"
        ],
        "correctIndex": 1,
        "difficulty": "medium"
      },
      {
        "id": "java-mcq-24",
        "prompt": "Which must be declared or caught?",
        "options": [
          "RuntimeException",
          "Checked exception",
          "Error",
          "NullPointerException"
        ],
        "correctIndex": 1,
        "difficulty": "hard"
      },
      {
        "id": "java-mcq-25",
        "prompt": "StringBuilder helps with?",
        "options": [
          "Math ops",
          "Efficient concat",
          "I/O only",
          "Sorting"
        ],
        "correctIndex": 1,
        "difficulty": "medium"
      },
      {
        "id": "java-mcq-26",
        "prompt": "What prints? 5 % 2",
        "options": [
          "2",
          "2.5",
          "1",
          "0"
        ],
        "correctIndex": 2,
        "difficulty": "easy"
      },
      {
        "id": "java-mcq-27",
        "prompt": "For-each works with?",
        "options": [
          "Arrays/Iterables",
          "Only arrays",
          "Only maps",
          "Only lists"
        ],
        "correctIndex": 0,
        "difficulty": "easy"
      },
      {
        "id": "java-mcq-28",
        "prompt": "Recursion requires?",
        "options": [
          "Template",
          "Base case",
          "Interface",
          "Annotation"
        ],
        "correctIndex": 1,
        "difficulty": "hard"
      },
      {
        "id": "java-mcq-29",
        "prompt": "ArrayList package?",
        "options": [
          "java.io",
          "java.util",
          "java.lang",
          "java.net"
        ],
        "correctIndex": 1,
        "difficulty": "easy"
      },
      {
        "id": "java-mcq-30",
        "prompt": "Which is primitive?",
        "options": [
          "String",
          "Integer",
          "int",
          "ArrayList"
        ],
        "correctIndex": 2,
        "difficulty": "easy"
      }
    ],
    "coding": [
      {
        "id": "java-code-sum-two",
        "prompt": "Read two integers and print their sum.",
        "starterCode": "import java.io.*;\nimport java.util.*;\n\npublic class Main {\n  public static void main(String[] args) throws Exception {\n    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));\n    StringBuilder sb = new StringBuilder();\n    String line;\n    while ((line = br.readLine()) != null) {\n      sb.append(line).append(\"\\n\");\n    }\n    String text = sb.toString();\n    // TODO: solve sum-two\n    System.out.println(0);\n  }\n}\n",
        "tests": [
          {
            "stdin": "4 8\n",
            "expected": "12\n"
          },
          {
            "stdin": "10 -3\n",
            "expected": "7\n"
          }
        ],
        "timeoutMs": 3500,
        "difficulty": "easy"
      },
      {
        "id": "java-code-max-three",
        "prompt": "Read three integers and print the maximum.",
        "starterCode": "import java.io.*;\nimport java.util.*;\n\npublic class Main {\n  public static void main(String[] args) throws Exception {\n    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));\n    StringBuilder sb = new StringBuilder();\n    String line;\n    while ((line = br.readLine()) != null) {\n      sb.append(line).append(\"\\n\");\n    }\n    String text = sb.toString();\n    // TODO: solve max-three\n    System.out.println(0);\n  }\n}\n",
        "tests": [
          {
            "stdin": "3 9 2\n",
            "expected": "9\n"
          },
          {
            "stdin": "-5 -2 -9\n",
            "expected": "-2\n"
          }
        ],
        "timeoutMs": 3500,
        "difficulty": "easy"
      },
      {
        "id": "java-code-reverse-string",
        "prompt": "Read one line and print the reversed string.",
        "starterCode": "import java.io.*;\nimport java.util.*;\n\npublic class Main {\n  public static void main(String[] args) throws Exception {\n    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));\n    StringBuilder sb = new StringBuilder();\n    String line;\n    while ((line = br.readLine()) != null) {\n      sb.append(line).append(\"\\n\");\n    }\n    String text = sb.toString();\n    // TODO: solve reverse-string\n    System.out.println(0);\n  }\n}\n",
        "tests": [
          {
            "stdin": "pebble\n",
            "expected": "elbbep\n"
          },
          {
            "stdin": "code\n",
            "expected": "edoc\n"
          }
        ],
        "timeoutMs": 3500,
        "difficulty": "easy"
      },
      {
        "id": "java-code-count-vowels",
        "prompt": "Read one line and print number of vowels (a,e,i,o,u).",
        "starterCode": "import java.io.*;\nimport java.util.*;\n\npublic class Main {\n  public static void main(String[] args) throws Exception {\n    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));\n    StringBuilder sb = new StringBuilder();\n    String line;\n    while ((line = br.readLine()) != null) {\n      sb.append(line).append(\"\\n\");\n    }\n    String text = sb.toString();\n    // TODO: solve count-vowels\n    System.out.println(0);\n  }\n}\n",
        "tests": [
          {
            "stdin": "pebble\n",
            "expected": "2\n"
          },
          {
            "stdin": "education\n",
            "expected": "5\n"
          }
        ],
        "timeoutMs": 3500,
        "difficulty": "easy"
      },
      {
        "id": "java-code-factorial",
        "prompt": "Read n and print n! for 0 <= n <= 12.",
        "starterCode": "import java.io.*;\nimport java.util.*;\n\npublic class Main {\n  public static void main(String[] args) throws Exception {\n    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));\n    StringBuilder sb = new StringBuilder();\n    String line;\n    while ((line = br.readLine()) != null) {\n      sb.append(line).append(\"\\n\");\n    }\n    String text = sb.toString();\n    // TODO: solve factorial\n    System.out.println(0);\n  }\n}\n",
        "tests": [
          {
            "stdin": "5\n",
            "expected": "120\n"
          },
          {
            "stdin": "0\n",
            "expected": "1\n"
          }
        ],
        "timeoutMs": 3500,
        "difficulty": "easy"
      },
      {
        "id": "java-code-fibonacci",
        "prompt": "Read n and print nth Fibonacci number (0-indexed).",
        "starterCode": "import java.io.*;\nimport java.util.*;\n\npublic class Main {\n  public static void main(String[] args) throws Exception {\n    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));\n    StringBuilder sb = new StringBuilder();\n    String line;\n    while ((line = br.readLine()) != null) {\n      sb.append(line).append(\"\\n\");\n    }\n    String text = sb.toString();\n    // TODO: solve fibonacci\n    System.out.println(0);\n  }\n}\n",
        "tests": [
          {
            "stdin": "7\n",
            "expected": "13\n"
          },
          {
            "stdin": "0\n",
            "expected": "0\n"
          }
        ],
        "timeoutMs": 3500,
        "difficulty": "medium"
      },
      {
        "id": "java-code-palindrome",
        "prompt": "Read one word and print true if palindrome else false.",
        "starterCode": "import java.io.*;\nimport java.util.*;\n\npublic class Main {\n  public static void main(String[] args) throws Exception {\n    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));\n    StringBuilder sb = new StringBuilder();\n    String line;\n    while ((line = br.readLine()) != null) {\n      sb.append(line).append(\"\\n\");\n    }\n    String text = sb.toString();\n    // TODO: solve palindrome\n    System.out.println(\"false\");\n  }\n}\n",
        "tests": [
          {
            "stdin": "racecar\n",
            "expected": "true\n"
          },
          {
            "stdin": "pebble\n",
            "expected": "false\n"
          }
        ],
        "timeoutMs": 3500,
        "difficulty": "easy"
      },
      {
        "id": "java-code-sort-numbers",
        "prompt": "Read space-separated integers and print sorted ascending.",
        "starterCode": "import java.io.*;\nimport java.util.*;\n\npublic class Main {\n  public static void main(String[] args) throws Exception {\n    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));\n    StringBuilder sb = new StringBuilder();\n    String line;\n    while ((line = br.readLine()) != null) {\n      sb.append(line).append(\"\\n\");\n    }\n    String text = sb.toString();\n    // TODO: solve sort-numbers\n    System.out.println(0);\n  }\n}\n",
        "tests": [
          {
            "stdin": "4 1 3 2\n",
            "expected": "1 2 3 4\n"
          },
          {
            "stdin": "9 -1 5\n",
            "expected": "-1 5 9\n"
          }
        ],
        "timeoutMs": 3500,
        "difficulty": "medium"
      },
      {
        "id": "java-code-two-sum",
        "prompt": "Line1 nums, line2 target. Print indices i j of first valid pair.",
        "starterCode": "import java.io.*;\nimport java.util.*;\n\npublic class Main {\n  public static void main(String[] args) throws Exception {\n    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));\n    StringBuilder sb = new StringBuilder();\n    String line;\n    while ((line = br.readLine()) != null) {\n      sb.append(line).append(\"\\n\");\n    }\n    String text = sb.toString();\n    // TODO: solve two-sum\n    System.out.println(0);\n  }\n}\n",
        "tests": [
          {
            "stdin": "2 7 11 15\n9\n",
            "expected": "0 1\n"
          },
          {
            "stdin": "3 2 4\n6\n",
            "expected": "1 2\n"
          }
        ],
        "timeoutMs": 4000,
        "difficulty": "medium"
      },
      {
        "id": "java-code-first-unique",
        "prompt": "Read string and print first non-repeating char index, else -1.",
        "starterCode": "import java.io.*;\nimport java.util.*;\n\npublic class Main {\n  public static void main(String[] args) throws Exception {\n    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));\n    StringBuilder sb = new StringBuilder();\n    String line;\n    while ((line = br.readLine()) != null) {\n      sb.append(line).append(\"\\n\");\n    }\n    String text = sb.toString();\n    // TODO: solve first-unique\n    System.out.println(0);\n  }\n}\n",
        "tests": [
          {
            "stdin": "leetcode\n",
            "expected": "0\n"
          },
          {
            "stdin": "aabb\n",
            "expected": "-1\n"
          }
        ],
        "timeoutMs": 4000,
        "difficulty": "medium"
      },
      {
        "id": "java-code-word-count",
        "prompt": "Read one line and print count of words.",
        "starterCode": "import java.io.*;\nimport java.util.*;\n\npublic class Main {\n  public static void main(String[] args) throws Exception {\n    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));\n    StringBuilder sb = new StringBuilder();\n    String line;\n    while ((line = br.readLine()) != null) {\n      sb.append(line).append(\"\\n\");\n    }\n    String text = sb.toString();\n    // TODO: solve word-count\n    System.out.println(0);\n  }\n}\n",
        "tests": [
          {
            "stdin": "hello pebble world\n",
            "expected": "3\n"
          },
          {
            "stdin": "one\n",
            "expected": "1\n"
          }
        ],
        "timeoutMs": 3500,
        "difficulty": "easy"
      },
      {
        "id": "java-code-rotate-right",
        "prompt": "Line1 nums, line2 k. Rotate right by k and print result.",
        "starterCode": "import java.io.*;\nimport java.util.*;\n\npublic class Main {\n  public static void main(String[] args) throws Exception {\n    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));\n    StringBuilder sb = new StringBuilder();\n    String line;\n    while ((line = br.readLine()) != null) {\n      sb.append(line).append(\"\\n\");\n    }\n    String text = sb.toString();\n    // TODO: solve rotate-right\n    System.out.println(0);\n  }\n}\n",
        "tests": [
          {
            "stdin": "1 2 3 4 5\n2\n",
            "expected": "4 5 1 2 3\n"
          },
          {
            "stdin": "7 8 9\n1\n",
            "expected": "9 7 8\n"
          }
        ],
        "timeoutMs": 4000,
        "difficulty": "medium"
      },
      {
        "id": "java-code-merge-sorted",
        "prompt": "Line1 sorted A, line2 sorted B. Merge and print sorted.",
        "starterCode": "import java.io.*;\nimport java.util.*;\n\npublic class Main {\n  public static void main(String[] args) throws Exception {\n    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));\n    StringBuilder sb = new StringBuilder();\n    String line;\n    while ((line = br.readLine()) != null) {\n      sb.append(line).append(\"\\n\");\n    }\n    String text = sb.toString();\n    // TODO: solve merge-sorted\n    System.out.println(0);\n  }\n}\n",
        "tests": [
          {
            "stdin": "1 3 5\n2 4 6\n",
            "expected": "1 2 3 4 5 6\n"
          },
          {
            "stdin": "1 2\n3 4 5\n",
            "expected": "1 2 3 4 5\n"
          }
        ],
        "timeoutMs": 4000,
        "difficulty": "medium"
      },
      {
        "id": "java-code-valid-parentheses",
        "prompt": "Read parentheses string and print true if valid else false.",
        "starterCode": "import java.io.*;\nimport java.util.*;\n\npublic class Main {\n  public static void main(String[] args) throws Exception {\n    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));\n    StringBuilder sb = new StringBuilder();\n    String line;\n    while ((line = br.readLine()) != null) {\n      sb.append(line).append(\"\\n\");\n    }\n    String text = sb.toString();\n    // TODO: solve valid-parentheses\n    System.out.println(\"false\");\n  }\n}\n",
        "tests": [
          {
            "stdin": "()[]{}\n",
            "expected": "true\n"
          },
          {
            "stdin": "([)]\n",
            "expected": "false\n"
          }
        ],
        "timeoutMs": 4000,
        "difficulty": "medium"
      },
      {
        "id": "java-code-gcd",
        "prompt": "Read two integers and print their GCD.",
        "starterCode": "import java.io.*;\nimport java.util.*;\n\npublic class Main {\n  public static void main(String[] args) throws Exception {\n    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));\n    StringBuilder sb = new StringBuilder();\n    String line;\n    while ((line = br.readLine()) != null) {\n      sb.append(line).append(\"\\n\");\n    }\n    String text = sb.toString();\n    // TODO: solve gcd\n    System.out.println(0);\n  }\n}\n",
        "tests": [
          {
            "stdin": "48 18\n",
            "expected": "6\n"
          },
          {
            "stdin": "17 13\n",
            "expected": "1\n"
          }
        ],
        "timeoutMs": 3500,
        "difficulty": "easy"
      },
      {
        "id": "java-code-range-sum",
        "prompt": "Line1 nums, line2 l r. Print sum nums[l..r].",
        "starterCode": "import java.io.*;\nimport java.util.*;\n\npublic class Main {\n  public static void main(String[] args) throws Exception {\n    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));\n    StringBuilder sb = new StringBuilder();\n    String line;\n    while ((line = br.readLine()) != null) {\n      sb.append(line).append(\"\\n\");\n    }\n    String text = sb.toString();\n    // TODO: solve range-sum\n    System.out.println(0);\n  }\n}\n",
        "tests": [
          {
            "stdin": "1 2 3 4 5\n1 3\n",
            "expected": "9\n"
          },
          {
            "stdin": "5 5 5\n0 2\n",
            "expected": "15\n"
          }
        ],
        "timeoutMs": 4000,
        "difficulty": "medium"
      },
      {
        "id": "java-code-diagonal-sum",
        "prompt": "Read 4 ints for 2x2 matrix row-wise. Print diagonal sum.",
        "starterCode": "import java.io.*;\nimport java.util.*;\n\npublic class Main {\n  public static void main(String[] args) throws Exception {\n    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));\n    StringBuilder sb = new StringBuilder();\n    String line;\n    while ((line = br.readLine()) != null) {\n      sb.append(line).append(\"\\n\");\n    }\n    String text = sb.toString();\n    // TODO: solve diagonal-sum\n    System.out.println(0);\n  }\n}\n",
        "tests": [
          {
            "stdin": "1 2 3 4\n",
            "expected": "5\n"
          },
          {
            "stdin": "5 1 1 5\n",
            "expected": "10\n"
          }
        ],
        "timeoutMs": 3500,
        "difficulty": "easy"
      },
      {
        "id": "java-code-dedupe-sorted",
        "prompt": "Read sorted integers and print unique values.",
        "starterCode": "import java.io.*;\nimport java.util.*;\n\npublic class Main {\n  public static void main(String[] args) throws Exception {\n    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));\n    StringBuilder sb = new StringBuilder();\n    String line;\n    while ((line = br.readLine()) != null) {\n      sb.append(line).append(\"\\n\");\n    }\n    String text = sb.toString();\n    // TODO: solve dedupe-sorted\n    System.out.println(0);\n  }\n}\n",
        "tests": [
          {
            "stdin": "1 1 2 2 3\n",
            "expected": "1 2 3\n"
          },
          {
            "stdin": "4 4 4\n",
            "expected": "4\n"
          }
        ],
        "timeoutMs": 3500,
        "difficulty": "medium"
      },
      {
        "id": "java-code-anagram",
        "prompt": "Line1 s, line2 t. Print true if anagrams else false.",
        "starterCode": "import java.io.*;\nimport java.util.*;\n\npublic class Main {\n  public static void main(String[] args) throws Exception {\n    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));\n    StringBuilder sb = new StringBuilder();\n    String line;\n    while ((line = br.readLine()) != null) {\n      sb.append(line).append(\"\\n\");\n    }\n    String text = sb.toString();\n    // TODO: solve anagram\n    System.out.println(\"false\");\n  }\n}\n",
        "tests": [
          {
            "stdin": "listen\nsilent\n",
            "expected": "true\n"
          },
          {
            "stdin": "rat\ncar\n",
            "expected": "false\n"
          }
        ],
        "timeoutMs": 4000,
        "difficulty": "medium"
      },
      {
        "id": "java-code-longest-word-len",
        "prompt": "Read one line and print length of longest word.",
        "starterCode": "import java.io.*;\nimport java.util.*;\n\npublic class Main {\n  public static void main(String[] args) throws Exception {\n    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));\n    StringBuilder sb = new StringBuilder();\n    String line;\n    while ((line = br.readLine()) != null) {\n      sb.append(line).append(\"\\n\");\n    }\n    String text = sb.toString();\n    // TODO: solve longest-word-len\n    System.out.println(0);\n  }\n}\n",
        "tests": [
          {
            "stdin": "pebble builds confidence\n",
            "expected": "10\n"
          },
          {
            "stdin": "a bb ccc\n",
            "expected": "3\n"
          }
        ],
        "timeoutMs": 3500,
        "difficulty": "easy"
      }
    ]
  }
}

const placementBank: Record<PlacementLanguage, { mcq: PlacementMcqQuestion[]; coding: PlacementCodingQuestion[] }> =
  Object.fromEntries(
    (Object.keys(rawPlacementBank) as PlacementLanguage[]).map((language) => [
      language,
      {
        mcq: rawPlacementBank[language].mcq.map((item) => ({ ...item, type: 'mcq' })),
        coding: rawPlacementBank[language].coding.map((item) => ({ ...item, type: 'coding' })),
      },
    ]),
  ) as Record<PlacementLanguage, { mcq: PlacementMcqQuestion[]; coding: PlacementCodingQuestion[] }>

function hashString(value: string) {
  let hash = 2166136261
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function compatibilityScore(level: PlacementLevel, difficulty: DifficultyTag) {
  if (level === 'beginner') {
    return difficulty === 'easy' ? 3 : difficulty === 'medium' ? 2 : 0
  }
  if (level === 'intermediate') {
    return difficulty === 'easy' ? 2 : difficulty === 'medium' ? 3 : 2
  }
  return difficulty === 'easy' ? 1 : difficulty === 'medium' ? 3 : 4
}

function pickStable<T extends { difficulty: DifficultyTag }>(items: T[], count: number, rng: () => number, level: PlacementLevel) {
  const ranked = [...items]
    .map((item, idx) => ({
      item,
      rank: compatibilityScore(level, item.difficulty) + rng() + idx * 1e-6,
    }))
    .sort((a, b) => b.rank - a.rank)

  return ranked.slice(0, count).map((entry) => entry.item)
}

function getWeekBucket(now = Date.now()) {
  return Math.floor(now / (7 * 24 * 60 * 60 * 1000))
}

export function getPlacementBank(language: PlacementLanguage) {
  return placementBank[language]
}

export function buildWeeklyPlacementSet(language: PlacementLanguage, level: PlacementLevel, now = Date.now()): PlacementQuestionSet {
  const weekBucket = getWeekBucket(now)
  const seedBase = hashString(`${language}:${level}:${weekBucket}`)
  const mcqRng = mulberry32(seedBase ^ 0xa5a5a5a5)
  const codingRng = mulberry32(seedBase ^ 0x5f5f5f5f)

  const bank = placementBank[language]
  const mcq = pickStable(bank.mcq, 4, mcqRng, level)
  const coding = pickStable(bank.coding, 3, codingRng, level)

  return {
    mcq,
    coding,
    weekBucket,
  }
}
