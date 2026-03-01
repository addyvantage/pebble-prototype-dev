import { toTopicId } from '../data/problemsBank'
import type { LanguageCode } from './languages'
import { applyPhraseDictionary, detectLatinWords, type PhraseEntry } from './noMixText'
import { getProblemPhraseDict } from './problemPhraseDict'
import { localizeProblemTitle } from './problemLocalize'

type TopicLabels = {
  en: string
} & Partial<Record<LanguageCode, string>>

const TOPIC_LABELS_BY_ID: Record<string, TopicLabels> = {
  array: { en: 'Array' },
  string: { en: 'String' },
  hash_table: { en: 'Hash Table' },
  sorting: { en: 'Sorting' },
  greedy: { en: 'Greedy' },
  dynamic_programming: { en: 'Dynamic Programming' },
  graph: { en: 'Graph' },
  tree: { en: 'Tree' },
  bfs: { en: 'BFS' },
  dfs: { en: 'DFS' },
  binary_search: { en: 'Binary Search' },
  two_pointers: { en: 'Two Pointers' },
  sliding_window: { en: 'Sliding Window' },
  prefix_sum: { en: 'Prefix Sum' },
  bit_manipulation: { en: 'Bit Manipulation' },
  math: { en: 'Math' },
  stack: { en: 'Stack' },
  queue: { en: 'Queue' },
  heap: { en: 'Heap' },
  recursion: { en: 'Recursion' },
  backtracking: { en: 'Backtracking' },
  union_find: { en: 'Union-Find' },
  trie: { en: 'Trie' },
  segment_tree: { en: 'Segment Tree' },
  monotonic_stack: { en: 'Monotonic Stack' },
  eulerian_circuit: { en: 'Eulerian Circuit' },
  radix_sort: { en: 'Radix Sort' },
  suffix_array: { en: 'Suffix Array' },
  sql: { en: 'SQL', hi: 'एसक्यूएल', bn: 'এসকিউএল', te: 'ఎస్‌క్యూఎల్', mr: 'एसक्यूएल', ta: 'எஸ் க்யூ எல்', ur: 'ایس کیو ایل', gu: 'એસક્યુએલ', kn: 'ಎಸ್‌ಕ್ಯೂಎಲ್', ml: 'എസ്‌ക്യുഎൽ', or: 'ଏସ୍‌କ୍ୟୁଏଲ୍', pa: 'ਐਸਕਿਊਐਲ', as: 'এছ কিউ এল' },
  join: { en: 'Join', hi: 'जॉइन', bn: 'জয়েন', te: 'జాయిన్', mr: 'जॉईन', ta: 'ஜோயின்', ur: 'جوائن', gu: 'જોઇન', kn: 'ಜೋಯಿನ್', ml: 'ജോയിൻ', or: 'ଜୋଇନ୍', pa: 'ਜੋਇਨ', as: 'জইন' },
  subquery: { en: 'Subquery', hi: 'सबक्वेरी', bn: 'সাবকোয়ারি', te: 'సబ్‌క్వెరీ', mr: 'सबक्वेरी', ta: 'உபவினா', ur: 'سب کویری', gu: 'સબક્વેરી', kn: 'ಉಪಪ್ರಶ್ನೆ', ml: 'സബ്‌ക്വറി', or: 'ସବକ୍ୱେରି', pa: 'ਸਬਕੁਏਰੀ', as: 'সাবকুৱেৰী' },
  aggregation: { en: 'Aggregation', hi: 'एग्रीगेशन', bn: 'অ্যাগ্রিগেশন', te: 'ఏగ్రిగేషన్', mr: 'अॅग्रिगेशन', ta: 'ஒருமைப்படுத்தல்', ur: 'ایگریگیشن', gu: 'એગ્રીગેશન', kn: 'ಏಗ್ರಿಗೇಶನ್', ml: 'അഗ്രിഗേഷൻ', or: 'ଏଗ୍ରିଗେସନ୍', pa: 'ਐਗ੍ਰਿਗੇਸ਼ਨ', as: 'এগ্ৰিগেশ্যন' },
  window_function: { en: 'Window Function', hi: 'विंडो फंक्शन', bn: 'উইন্ডো ফাংশন', te: 'విండో ఫంక్షన్', mr: 'विंडो फंक्शन', ta: 'விண்டோ செயல்பாடு', ur: 'ونڈو فنکشن', gu: 'વિન્ડો ફંક્શન', kn: 'ವಿಂಡೋ ಫಂಕ್ಷನ್', ml: 'വിൻഡോ ഫങ്ഷൻ', or: 'ୱିଣ୍ଡୋ ଫଙ୍କସନ୍', pa: 'ਵਿੰਡੋ ਫੰਕਸ਼ਨ', as: 'উইণ্ডো ফাংশ্যন' },
  filtering: { en: 'Filtering', hi: 'फ़िल्टरिंग', bn: 'ফিল্টারিং', te: 'ఫిల్టరింగ్', mr: 'फिल्टरिंग', ta: 'வடிகட்டல்', ur: 'فلٹرنگ', gu: 'ફિલ્ટરિંગ', kn: 'ಫಿಲ್ಟರಿಂಗ್', ml: 'ഫിൽറ്ററിംഗ്', or: 'ଫିଲ୍ଟରିଂ', pa: 'ਫਿਲਟਰਿੰਗ', as: 'ফিল্টাৰিং' },
  date_math: { en: 'Date Math', hi: 'डेट मैथ', bn: 'ডেট ম্যাথ', te: 'డేట్ మ్యాథ్', mr: 'डेट मॅथ', ta: 'தேதி கணிதம்', ur: 'ڈیٹ میتھ', gu: 'ડેટ મેથ', kn: 'ಡೇಟ್ ಮ್ಯಾಥ್', ml: 'ഡേറ്റ് മാത്ത്', or: 'ଡେଟ୍ ମ୍ୟାଥ୍', pa: 'ਡੇਟ ਮੈਥ', as: 'ডেট ম্যাথ' },
  recursive_cte: { en: 'Recursive CTE', hi: 'रिकर्सिव CTE', bn: 'রিকার্সিভ CTE', te: 'రికర్సివ్ CTE', mr: 'रिकर्सिव CTE', ta: 'ரிகர்சிவ் CTE', ur: 'ریکرسِو CTE', gu: 'રીકર્સિવ CTE', kn: 'ರಿಕರ್ಸಿವ್ CTE', ml: 'റികേഴ്സീവ് CTE', or: 'ରିକର୍ସିଭ୍ CTE', pa: 'ਰਿਕਰਸਿਵ CTE', as: 'ৰিকাৰ্সিভ CTE' },
  pivot: { en: 'Pivot', hi: 'पिवट', bn: 'পিভট', te: 'పివట్', mr: 'पिव्हट', ta: 'பிவோட்', ur: 'پیووٹ', gu: 'પિવટ', kn: 'ಪಿವಟ್', ml: 'പിവോട്ട്', or: 'ପିଭଟ୍', pa: 'ਪਿਵਟ', as: 'পিভট' },
  group_by: { en: 'Group By', hi: 'ग्रुप बाय', bn: 'গ্রুপ বাই', te: 'గ్రూప్ బై', mr: 'ग्रुप बाय', ta: 'குழுவாக்கம்', ur: 'گروپ بائی', gu: 'ગ્રુપ બાય', kn: 'ಗ್ರೂಪ್ ಬೈ', ml: 'ഗ്രൂപ്പ് ബൈ', or: 'ଗ୍ରୁପ୍ ବାଇ', pa: 'ਗਰੁੱਪ ਬਾਈ', as: 'গ্ৰুপ বাই' },
  having: { en: 'Having', hi: 'हैविंग', bn: 'হ্যাভিং', te: 'హావింగ్', mr: 'हॅविंग', ta: 'ஹாவிங்', ur: 'ہیونگ', gu: 'હેવિંગ', kn: 'ಹಾವಿಂಗ್', ml: 'ഹാവിംഗ്', or: 'ହାଭିଂ', pa: 'ਹੇਵਿੰਗ', as: 'হেভিং' },
  date: { en: 'Date', hi: 'तारीख', bn: 'তারিখ', te: 'తేదీ', mr: 'दिनांक', ta: 'தேதி', ur: 'تاریخ', gu: 'તારીખ', kn: 'ದಿನಾಂಕ', ml: 'തീയതി', or: 'ତାରିଖ', pa: 'ਤਾਰੀਖ', as: 'তাৰিখ' },
  distinct: { en: 'Distinct', hi: 'डिस्टिंक्ट', bn: 'ডিস্টিংক্ট', te: 'డిస్టింక్ట్', mr: 'डिस्टिंक्ट', ta: 'தனித்த', ur: 'ڈسٹنکٹ', gu: 'ડિસ્ટિન્ક્ટ', kn: 'ಡಿಸ್ಟಿಂಕ್ಟ್', ml: 'ഡിസ്റ്റിങ്ക്റ്റ്', or: 'ଡିସ୍ଟିଙ୍କ୍ଟ', pa: 'ਡਿਸਟਿੰਕਟ', as: 'ডিষ্টিঙ্ক্ট' },
  case: { en: 'Case', hi: 'केस', bn: 'কেস', te: 'కేస్', mr: 'केस', ta: 'கேஸ்', ur: 'کیس', gu: 'કેસ', kn: 'ಕೇಸ್', ml: 'കേസ്', or: 'କେସ୍', pa: 'ਕੇਸ', as: 'কেছ' },
  logic: { en: 'Logic', hi: 'तर्क', bn: 'যুক্তি', te: 'తర్కం', mr: 'तर्क', ta: 'தர்க்கம்', ur: 'منطق', gu: 'તર્ક', kn: 'ತರ್ಕ', ml: 'തർക്കം', or: 'ତର୍କ', pa: 'ਤਰਕ', as: 'যুক্তি' },
}

function toTitleCase(label: string) {
  return label
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function getEnglishTopicLabel(topicId: string, fallback?: string) {
  const normalizedTopicId = toTopicId(topicId)
  const fromCatalog = TOPIC_LABELS_BY_ID[normalizedTopicId]?.en
  if (fromCatalog) {
    return fromCatalog
  }
  if (fallback && fallback.trim()) {
    return fallback
  }
  return toTitleCase(normalizedTopicId)
}

export function localizeTopicLabel(topicLabelOrId: string, lang: LanguageCode) {
  const normalizedTopicId = toTopicId(topicLabelOrId)
  const english = getEnglishTopicLabel(normalizedTopicId, topicLabelOrId)
  if (lang === 'en') {
    return english
  }

  const translated = TOPIC_LABELS_BY_ID[normalizedTopicId]?.[lang]
  if (translated) {
    return translated
  }

  const fallback = applyPhraseDictionary(english, getProblemPhraseDict(lang))
  return detectLatinWords(fallback) ? localizeProblemTitle(english, lang) : fallback
}

export function localizeTopicLabels(topics: string[], lang: LanguageCode) {
  return topics.map((topic) => localizeTopicLabel(topic, lang))
}

export function getTopicPhraseEntries(lang: LanguageCode): readonly PhraseEntry[] {
  if (lang === 'en') {
    return []
  }

  const entries: PhraseEntry[] = []
  for (const topic of Object.values(TOPIC_LABELS_BY_ID)) {
    const english = topic.en
    const localized = topic[lang]
    if (!localized || localized === english) {
      continue
    }
    entries.push([english, localized])
  }
  return entries.sort((a, b) => b[0].length - a[0].length)
}
