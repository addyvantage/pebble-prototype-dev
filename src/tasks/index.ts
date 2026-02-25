import { task1SumEven } from './task1_sumEven'
import { task2FirstUnique } from './task2_firstUnique'
import { task3ValidAnagram } from './task3_validAnagram'
import { task4LongestSubstring } from './task4_longestSubstring'
import { task5ReverseWords } from './task5_reverseWords'
import { task6Palindrome } from './task6_palindrome'
import type { TaskDefinition } from './types'

export const taskList: TaskDefinition[] = [
  task1SumEven,
  task2FirstUnique,
  task3ValidAnagram,
  task4LongestSubstring,
  task5ReverseWords,
  task6Palindrome,
]

function normalizeId(id: string) {
  return id.trim().toLowerCase()
}

export function getTaskById(id: string | undefined): TaskDefinition {
  if (!id) {
    return task1SumEven
  }

  const normalizedId = normalizeId(id)
  if (normalizedId === '1' || normalizedId === 'task1' || normalizedId === 'task1_sum_even') {
    return task1SumEven
  }
  if (normalizedId === '2' || normalizedId === 'task2' || normalizedId === 'task2_first_unique') {
    return task2FirstUnique
  }
  if (normalizedId === '3' || normalizedId === 'task3' || normalizedId === 'task3_valid_anagram') {
    return task3ValidAnagram
  }
  if (normalizedId === '4' || normalizedId === 'task4' || normalizedId === 'task4_longest_substring') {
    return task4LongestSubstring
  }
  if (normalizedId === '5' || normalizedId === 'task5' || normalizedId === 'task5_reverse_words') {
    return task5ReverseWords
  }
  if (normalizedId === '6' || normalizedId === 'task6' || normalizedId === 'task6_palindrome') {
    return task6Palindrome
  }

  const task = taskList.find((entry) => normalizeId(entry.id) === normalizedId)
  return task ?? task1SumEven
}
