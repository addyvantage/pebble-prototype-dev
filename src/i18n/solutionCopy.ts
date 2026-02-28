import type { LanguageCode } from './languages'
import { GENERATED_SOLUTION_COPY } from './generatedSolutionCopy'

export type LocalizedSolutionCopy = {
  title?: string
  intuition?: string
  approach?: string[]
}

const HI_SOLUTIONS: Record<string, LocalizedSolutionCopy> = {
  'hello-world': {
    title: 'कैसे हल करें',
    intuition: 'यह वार्म-अप प्रश्न है: एक तय स्ट्रिंग बिल्कुल वैसी ही लौटानी है।',
    approach: [
      '`solve` को बिना इनपुट के लागू करें।',
      'ठीक वही लक्षित टेक्स्ट लौटाएँ।',
      'अतिरिक्त स्पेस या लाइन ब्रेक न जोड़ें।',
    ],
  },
  'variables-sum': {
    title: 'कैसे हल करें',
    intuition: 'दो संख्याओं का सीधा जोड़ लौटाना है।',
    approach: ['`a` और `b` पूर्णांक लें।', '`a + b` निकालें।', 'योग लौटाएँ।'],
  },
  'conditional-max': {
    title: 'कैसे हल करें',
    intuition: 'दो मानों की एक तुलना से उत्तर मिल जाता है।',
    approach: ['जाँचें `a > b` है या नहीं।', 'सही होने पर `a`, अन्यथा `b` लौटाएँ।', 'चाहें तो `max` का उपयोग करें।'],
  },
  'loops-sum-n': {
    title: 'कैसे हल करें',
    intuition: '1 से n तक सभी मान जोड़ने के लिए रनिंग टोटल रखें।',
    approach: ['`total = 0` से शुरू करें।', '1 से `n` तक लूप चलाएँ।', 'हर मान `total` में जोड़कर अंत में लौटाएँ।'],
  },
  'arrays-max': {
    title: 'कैसे हल करें',
    intuition: 'ऐरे स्कैन करते हुए अब तक का सबसे बड़ा मान ट्रैक करें।',
    approach: ['पहले एलिमेंट को प्रारंभिक अधिकतम मान लें।', 'सभी मानों पर इटरेट करें।', 'बड़ा मान मिले तो अपडेट करें और अंत में लौटाएँ।'],
  },
  'strings-reverse': {
    title: 'कैसे हल करें',
    intuition: 'स्ट्रिंग को उल्टा करने के लिए सीधा ऑपरेशन पर्याप्त है।',
    approach: ['इनपुट स्ट्रिंग प्राप्त करें।', 'रिवर्स करने का तरीका लागू करें।', 'रिवर्स स्ट्रिंग लौटाएँ।'],
  },
  'dsa-two-sum': {
    title: 'कैसे हल करें',
    intuition: 'हैश मैप की मदद से कॉम्प्लिमेंट एक ही पास में मिल सकता है।',
    approach: [
      'ऐरे पर एक बार इटरेट करें।',
      'हर मान के लिए `target - value` निकालें।',
      'कॉम्प्लिमेंट मैप में हो तो उसके इंडेक्स और वर्तमान इंडेक्स लौटाएँ।',
      'अन्यथा वर्तमान मान और इंडेक्स मैप में रखें।',
    ],
  },
  'dsa-palindrome': {
    title: 'कैसे हल करें',
    intuition: 'दोनों सिरों से अक्षर मिलाते हुए बीच की ओर बढ़ें।',
    approach: [
      '`left = 0` और `right = len(text)-1` रखें।',
      '`left < right` तक अक्षर तुलना करें।',
      'मिसमैच पर false लौटाएँ, वरना पॉइंटर्स अंदर बढ़ाएँ।',
      'लूप पूरा हो जाए तो true लौटाएँ।',
    ],
  },
  'prefix-sum-range': {
    title: 'कैसे हल करें',
    intuition: 'प्रिफिक्स सम से हर रेंज क्वेरी O(1) में हो जाती है।',
    approach: ['प्रिफिक्स ऐरे बनाएं जहाँ `prefix[i+1] = prefix[i] + nums[i]`।', 'रेंज `l..r` का योग `prefix[r+1] - prefix[l]` होगा।', 'वही मान लौटाएँ।'],
  },
  'sliding-window-max-sum-k': {
    title: 'कैसे हल करें',
    intuition: 'हर विंडो का योग फिर से नहीं निकालना, पिछले योग को अपडेट करना है।',
    approach: ['पहले `k` एलिमेंट्स का योग निकालें।', 'विंडो को एक-एक स्टेप स्लाइड करें।', 'नया आने वाला जोड़ें और बाहर जाने वाला घटाएँ।', 'अधिकतम विंडो योग ट्रैक करें।'],
  },
  'recursion-factorial': {
    title: 'कैसे हल करें',
    intuition: 'factorial का प्राकृतिक संबंध n * factorial(n-1) है।',
    approach: ['बेस केस रखें: factorial(0)=1 और factorial(1)=1।', '`n > 1` पर `n * factorial(n-1)` लौटाएँ।', 'निकला हुआ मान लौटाएँ।'],
  },
  'dp-climb-stairs': {
    title: 'कैसे हल करें',
    intuition: 'स्टेप i तक पहुँचने के तरीके i-1 और i-2 से आते हैं।',
    approach: ['छोटे `n` को सीधे हैंडल करें।', 'पिछली दो अवस्थाओं के लिए दो वैरिएबल रखें।', '3 से n तक इटरेट करके वर्तमान तरीके अपडेट करें।', 'अंतिम गिनती लौटाएँ।'],
  },
}

export const SOLUTION_COPY: Partial<Record<LanguageCode, Record<string, LocalizedSolutionCopy>>> = {
  hi: HI_SOLUTIONS,
  ...GENERATED_SOLUTION_COPY,
}
