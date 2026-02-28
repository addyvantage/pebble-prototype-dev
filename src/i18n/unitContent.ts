import type { CurriculumUnit } from '../content/pathLoader'
import type { LanguageCode } from './languages'
import { GENERATED_UNIT_CONTENT } from './generatedUnitContent'

export type LocalizedUnitText = {
  title?: string
  concept?: string
  prompt?: string
  description?: string
}

const HI_UNIT_COPY: Record<string, LocalizedUnitText> = {
  'hello-world': {
    title: 'हेलो वर्ल्ड',
    concept: 'stdout की बुनियाद',
    prompt: 'बिल्कुल यही लौटाएँ: Hello, Pebble!',
    description: 'यह एक वॉर्म-अप प्रश्न है। आउटपुट बिल्कुल सही होना चाहिए, अतिरिक्त स्पेस या लाइन ब्रेक न जोड़ें।',
  },
  'variables-sum': {
    title: 'वेरिएबल्स और इनपुट',
    concept: 'पार्स + जोड़',
    prompt: 'दो पूर्णांक a और b दिए हैं, उनका योग लौटाएँ।',
    description: 'इनपुट से दो संख्याएँ लेकर सीधे उनका जोड़ लौटाएँ।',
  },
  'conditional-max': {
    title: 'कंडीशनल्स - दो में अधिकतम',
    concept: 'ब्रांचिंग',
    prompt: 'दो पूर्णांक a और b में से बड़ा मान लौटाएँ।',
    description: 'केवल एक तुलना काफी है। a और b में से जो बड़ा हो, वही लौटाएँ।',
  },
  'loops-sum-n': {
    title: 'लूप्स - 1 से N तक योग',
    concept: 'संचय',
    prompt: 'n दिया है, 1 से n तक का योग लौटाएँ।',
    description: '1 से n तक लूप चलाकर एक रनिंग टोटल में जोड़ते जाएँ और अंत में परिणाम लौटाएँ।',
  },
  'arrays-max': {
    title: 'ऐरे - अधिकतम मान',
    concept: 'ऐरे पर इटरेशन',
    prompt: 'पूर्णांकों की ऐरे दी है, उसका अधिकतम मान लौटाएँ।',
    description: 'पूरी ऐरे स्कैन करें और अब तक का सबसे बड़ा मान ट्रैक करें।',
  },
  'strings-reverse': {
    title: 'स्ट्रिंग - रिवर्स',
    concept: 'स्ट्रिंग मैनिपुलेशन',
    prompt: 'दी गई स्ट्रिंग को उल्टा करके लौटाएँ।',
    description: 'स्ट्रिंग के अक्षरों का क्रम उलटकर परिणाम लौटाएँ।',
  },
  'dsa-two-sum': {
    title: 'हैशिंग - टू सम',
    concept: 'हैश मैप लुकअप',
    prompt: 'nums और target दिए हैं; ऐसे i और j इंडेक्स लौटाएँ जहाँ nums[i] + nums[j] = target हो।',
    description: 'हैश मैप का उपयोग करके एक ही पास में कॉम्प्लिमेंट ढूँढें।',
  },
  'dsa-palindrome': {
    title: 'टू पॉइंटर्स - पैलिन्ड्रोम',
    concept: 'टू पॉइंटर्स',
    prompt: 'स्ट्रिंग दी है, palindrome हो तो true लौटाएँ, अन्यथा false।',
    description: 'दो पॉइंटर्स को दोनों छोर से बीच की ओर बढ़ाएँ और अक्षरों की तुलना करें।',
  },
  'prefix-sum-range': {
    title: 'प्रिफिक्स सम - रेंज क्वेरी',
    concept: 'प्रिफिक्स सम',
    prompt: 'nums और l, r दिए हैं; sum(nums[l..r]) लौटाएँ।',
    description: 'प्रिफिक्स सम बनाकर किसी भी रेंज का योग O(1) में निकाला जा सकता है।',
  },
  'sliding-window-max-sum-k': {
    title: 'स्लाइडिंग विंडो - मैक्स सम K',
    concept: 'फिक्स्ड विंडो',
    prompt: 'nums और k दिए हैं; आकार k की किसी भी सतत उप-ऐरे का अधिकतम योग लौटाएँ।',
    description: 'पहली विंडो का योग निकालें, फिर एक-एक कदम स्लाइड करके योग अपडेट करें और सर्वश्रेष्ठ मान रखें।',
  },
  'recursion-factorial': {
    title: 'रिकर्शन - फैक्टोरियल',
    concept: 'बेस केस + रिकर्शन',
    prompt: 'n दिया है, n का factorial लौटाएँ।',
    description: 'बेस केस तय करें और n > 1 पर recursion से n * factorial(n-1) लौटाएँ।',
  },
  'dp-climb-stairs': {
    title: 'डीपी 1D - क्लाइंब स्टेयर्स',
    concept: 'बॉटम-अप DP',
    prompt: 'आप 1 या 2 स्टेप चढ़ सकते हैं। n तक पहुँचने के तरीकों की संख्या लौटाएँ।',
    description: 'DP रिलेशन f(n) = f(n-1) + f(n-2) का उपयोग करें और रोलिंग वैरिएबल्स से हल करें।',
  },
}

const LOCALIZED_UNIT_COPY: Partial<Record<LanguageCode, Record<string, LocalizedUnitText>>> = {
  hi: HI_UNIT_COPY,
  ...GENERATED_UNIT_CONTENT,
}

const warnedMissingUnitContent = new Set<string>()

export type ResolvedUnitCopy = {
  title: string
  concept: string
  prompt: string
  description: string
}

export function getLocalizedUnitCopy(unit: CurriculumUnit, lang: LanguageCode): ResolvedUnitCopy {
  const inlineLocalized = unit.localized?.[lang] ?? unit.localized?.en
  const mappedLocalized = LOCALIZED_UNIT_COPY[lang]?.[unit.id]

  if (import.meta.env.DEV && lang !== 'en' && !inlineLocalized && !mappedLocalized) {
    const warningId = `${lang}:${unit.id}`
    if (!warnedMissingUnitContent.has(warningId)) {
      warnedMissingUnitContent.add(warningId)
      console.warn(`[i18n] Missing unit content for "${unit.id}" in "${lang}". Falling back to English.`)
    }
  }

  const descriptionFallback = `Solve the task for every testcase. Keep output exact and avoid extra logs.`

  return {
    title:
      inlineLocalized?.title ??
      unit.title_i18n?.[lang] ??
      unit.title_i18n?.en ??
      mappedLocalized?.title ??
      unit.title,
    concept: inlineLocalized?.concept ?? mappedLocalized?.concept ?? unit.concept,
    prompt:
      inlineLocalized?.prompt ??
      unit.statement_i18n?.[lang] ??
      unit.statement_i18n?.en ??
      mappedLocalized?.prompt ??
      unit.prompt,
    description: inlineLocalized?.description ?? mappedLocalized?.description ?? descriptionFallback,
  }
}
