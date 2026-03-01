import type { LanguageCode } from './languages'
import { applyPhraseDictionary, detectLatinWords } from './noMixText'
import { getProblemPhraseDict } from './problemPhraseDict'

// Basic Latin to Indic script fallback transliteration for demo purposes.
// This preserves the exact input shape but swaps alphabets deterministically.
const TRANSLITERATION_MAPS: Record<LanguageCode, Record<string, string>> = {
    en: {},
    hi: { a: 'अ', b: 'ब', c: 'क', d: 'ड', e: 'ए', f: 'फ', g: 'ग', h: 'ह', i: 'इ', j: 'ज', k: 'क', l: 'ल', m: 'म', n: 'न', o: 'ओ', p: 'प', q: 'क्', r: 'र', s: 'स', t: 'ट', u: 'उ', v: 'व', w: 'व', x: 'क्स', y: 'य', z: 'ज़' },
    bn: { a: 'অ', b: 'ব', c: 'ক', d: 'ড', e: 'এ', f: 'ফ', g: 'গ', h: 'হ', i: 'ই', j: 'জ', k: 'ক', l: 'ল', m: 'ম', n: 'ন', o: 'ও', p: 'প', q: 'ক', r: 'র', s: 'স', t: 'ট', u: 'উ', v: 'ভ', w: 'ভ', x: 'ক্স', y: 'য', z: 'জ' },
    te: { a: 'అ', b: 'బ', c: 'క', d: 'డ', e: 'ఎ', f: 'ఫ', g: 'గ', h: 'హ', i: 'ఇ', j: 'జ', k: 'క', l: 'ల', m: 'మ', n: 'న', o: 'ఒ', p: 'ప', q: 'క్', r: 'ర', s: 'స', t: 'ట', u: 'ఉ', v: 'వ', w: 'వ', x: 'క్స్', y: 'య', z: 'జ' },
    mr: { a: 'अ', b: 'ब', c: 'क', d: 'ड', e: 'ए', f: 'फ', g: 'ग', h: 'ह', i: 'इ', j: 'ज', k: 'क', l: 'ल', m: 'म', n: 'न', o: 'ओ', p: 'प', q: 'क्', r: 'र', s: 'स', t: 'ट', u: 'उ', v: 'व', w: 'व', x: 'क्स', y: 'य', z: 'ज़' },
    ta: { a: 'அ', b: 'ப', c: 'க', d: 'ட', e: 'எ', f: 'ப', g: 'க', h: 'ஹ', i: 'இ', j: 'ஜ', k: 'க', l: 'ல', m: 'ம', n: 'ன', o: 'ஒ', p: 'ப', q: 'க்', r: 'ர', s: 'ச', t: 'ட', u: 'உ', v: 'வ', w: 'வ', x: 'க்ஸ்', y: 'ய', z: 'ஜ' },
    ur: { a: 'ا', b: 'ب', c: 'ک', d: 'ڈ', e: 'ے', f: 'ف', g: 'گ', h: 'ہ', i: 'ی', j: 'ج', k: 'ک', l: 'ل', m: 'م', n: 'ن', o: 'و', p: 'پ', q: 'ق', r: 'ر', s: 'س', t: 'ٹ', u: 'و', v: 'و', w: 'و', x: 'کس', y: 'ی', z: 'ز' },
    gu: { a: 'અ', b: 'બ', c: 'ક', d: 'ડ', e: 'એ', f: 'ફ', g: 'ગ', h: 'હ', i: 'ઇ', j: 'જ', k: 'ક', l: 'લ', m: 'મ', n: 'ન', o: 'ઓ', p: 'પ', q: 'ક્', r: 'ર', s: 'સ', t: 'ટ', u: 'ઉ', v: 'વ', w: 'વ', x: 'ક્સ', y: 'ય', z: 'ઝ' },
    kn: { a: 'ಅ', b: 'ಬ', c: 'ಕ', d: 'ಡ', e: 'ಎ', f: 'ಫ', g: 'ಗ', h: 'ಹ', i: 'ಇ', j: 'ಜ', k: 'ಕ', l: 'ಲ', m: 'ಮ', n: 'ನ', o: 'ಒ', p: 'ಪ', q: 'ಕ್', r: 'ರ', s: 'ಸ', t: 'ಟ', u: 'ಉ', v: 'ವ', w: 'ವ', x: 'ಕ್ಸ್', y: 'ಯ', z: 'ಝ' },
    ml: { a: 'അ', b: 'ബ', c: 'ക', d: 'ഡ', e: 'എ', f: 'ഫ', g: 'ഗ', h: 'ഹ', i: 'ഇ', j: 'ജ', k: 'ക', l: 'ല', m: 'മ', n: 'ന', o: 'ഒ', p: 'പ', q: 'ക്', r: 'ര', s: 'സ', t: 'ട', u: 'ഉ', v: 'വ', w: 'വ', x: 'ക്സ്', y: 'യ', z: 'സ' },
    or: { a: 'ଅ', b: 'ବ', c: 'କ', d: 'ଡ', e: 'ଏ', f: 'ଫ', g: 'ଗ', h: 'ହ', i: 'ଇ', j: 'ଜ', k: 'କ', l: 'ଲ', m: 'ମ', n: 'ନ', o: 'ଓ', p: 'ପ', q: 'କ୍', r: 'ର', s: 'ସ', t: 'ଟ', u: 'ଉ', v: 'ଵ', w: 'ଵ', x: 'କ୍ସ', y: 'ଯ', z: 'ଜ' },
    pa: { a: 'ਅ', b: 'ਬ', c: 'ਕ', d: 'ਡ', e: 'ਏ', f: 'ਫ', g: 'ਗ', h: 'ਹ', i: 'ਇ', j: 'ਜ', k: 'ਕ', l: 'ਲ', m: 'ਮ', n: 'ਨ', o: 'ਓ', p: 'ਪ', q: 'ਕ', r: 'ਰ', s: 'ਸ', t: 'ਟ', u: 'ਉ', v: 'ਵ', w: 'ਵ', x: 'ਕਸ', y: 'ਯ', z: 'ਜ਼' },
    as: { a: 'অ', b: 'ব', c: 'ক', d: 'ড', e: 'এ', f: 'ফ', g: 'গ', h: 'হ', i: 'ই', j: 'জ', k: 'ক', l: 'ল', m: 'ম', n: 'ন', o: 'ও', p: 'প', q: 'ক', r: 'ৰ', s: 'স', t: 'ট', u: 'উ', v: 'ভ', w: 'ভ', x: 'ক্স', y: 'য', z: 'জ' }
}

const COMMON_TITLE_WORDS: Record<LanguageCode, Record<string, string>> = {
    en: {},
    hi: { Two: 'दो', Sum: 'योग', Valid: 'मान्य', Anagram: 'एनाग्राम', Combine: 'जोड़ें', Tables: 'टेबल्स', Second: 'दूसरा', Highest: 'उच्चतम', Salary: 'वेतन', Daily: 'दैनिक', Revenue: 'राजस्व', Growth: 'वृद्धि', Report: 'रिपोर्ट', Customers: 'ग्राहक', Manager: 'प्रबंधक', Hierarchy: 'पदानुक्रम', Depth: 'गहराई', Top: 'शीर्ष', Performers: 'प्रदर्शनकारी', Monthly: 'मासिक', Subscription: 'सदस्यता', Churn: 'चर्न', Frequent: 'लगातार', Shoppers: 'खरीदार', Inventory: 'इन्वेंटरी', Stockout: 'स्टॉकआउट', Prediction: 'भविष्यवाणी', Overlapping: 'अतिव्यापी', Meeting: 'बैठक', Rooms: 'कमरे' },
    bn: { Two: 'দুই', Sum: 'যোগ', Valid: 'বৈধ', Anagram: 'অ্যানাগ্রাম', Combine: 'যুক্ত', Tables: 'টেবিল', Second: 'দ্বিতীয়', Highest: 'সর্বোচ্চ', Salary: 'বেতন', Daily: 'দৈনিক', Revenue: 'রাজস্ব', Growth: 'বৃদ্ধি', Report: 'প্রতিবেদন', Customers: 'গ্রাহক', Manager: 'ম্যানেজার', Hierarchy: 'শ্রেণীবিন্যাস', Depth: 'গভীরতা', Top: 'শীর্ষ', Performers: 'পারফর্মার', Monthly: 'মাসিক', Subscription: 'সাবস্ক্রিপশন', Churn: 'মন্থন', Frequent: 'ঘনঘন', Shoppers: 'ক্রেতা', Inventory: 'মজুদ', Stockout: 'স্টকআউট', Prediction: 'ভবিষ্যদ্বাণী', Overlapping: 'ওভারল্যাপিং', Meeting: 'মিটিং', Rooms: 'কক্ষ' },
    te: { Two: 'రెండు', Sum: 'మొత్తం', Valid: 'చెల్లుబాటు', Anagram: 'అనాగ్రామ్', Combine: 'కలపండి', Tables: 'పట్టికలు', Second: 'రెండవ', Highest: 'అత్యధిక', Salary: 'జీతం', Daily: 'రోజువారీ', Revenue: 'ఆదాయం', Growth: 'వృద్ధి', Report: 'నివేదిక', Customers: 'కస్టమర్లు', Manager: 'మేనేజర్', Hierarchy: 'క్రమానుగత', Depth: 'లోతు', Top: 'టాప్', Performers: 'పనితీరుతులు', Monthly: 'నెలవారీ', Subscription: 'సభ్యత్వం', Churn: 'మథనం', Frequent: 'తరచుగా', Shoppers: 'కొనుగోలుదారులు', Inventory: 'జాబితా', Stockout: 'స్టాక్అవుట్', Prediction: 'అంచనా', Overlapping: 'అతివ్యాప్తి', Meeting: 'సమావేశం', Rooms: 'గదులు' },
    mr: { Two: 'दोन', Sum: 'बेरीज', Valid: 'वैध', Anagram: 'अनाग्राम', Combine: 'एकत्र', Tables: 'टेबल', Second: 'दुसरा', Highest: 'सर्वोच्च', Salary: 'पगार', Daily: 'दैनिक', Revenue: 'महसूल', Growth: 'वाढ', Report: 'अहवाल', Customers: 'ग्राहक', Manager: 'व्यवस्थापक', Hierarchy: 'पदानुक्रम', Depth: 'खोली', Top: 'शीर्ष', Performers: 'कामगिरी करणारे', Monthly: 'मासिक', Subscription: 'सदस्यता', Churn: 'मंथन', Frequent: 'वारंवार', Shoppers: 'खरेदीदार', Inventory: 'वस्तुसुची', Stockout: 'स्टॉकआउट', Prediction: 'भविष्यवाणी', Overlapping: 'ओव्हरलॅपिंग', Meeting: 'बैठक', Rooms: 'खोल्या' },
    ta: { Two: 'இரண்டு', Sum: 'தொகை', Valid: 'செல்லுபடியாகும்', Anagram: 'அனகிராம்', Combine: 'இணைக்க', Tables: 'அட்டவணைகள்', Second: 'இரண்டாவது', Highest: 'அதிகபட்ச', Salary: 'சம்பளம்', Daily: 'தினசரி', Revenue: 'வருவாய்', Growth: 'வளர்ச்சி', Report: 'அறிக்கை', Customers: 'வாடிக்கையாளர்கள்', Manager: 'மேலாளர்', Hierarchy: 'படிநிலை', Depth: 'ஆழம்', Top: 'தலைசிறந்த', Performers: 'செயல்புரிபவர்கள்', Monthly: 'மாதாந்திர', Subscription: 'சந்தா', Churn: 'வெளியேற்றம்', Frequent: 'அடிக்கடி', Shoppers: 'வாங்குபவர்கள்', Inventory: 'சரக்கு', Stockout: 'ஸ்டாக்அவுட்', Prediction: 'கணிப்பு', Overlapping: 'ஒன்றுடன் ஒன்று', Meeting: 'சந்திப்பு', Rooms: 'அறைகள்' },
    ur: { Two: 'دو', Sum: 'مجموعہ', Valid: 'درست', Anagram: 'ایناگرام', Combine: 'ملاپ', Tables: 'ٹیبلز', Second: 'دوسرا', Highest: 'سب سے زیادہ', Salary: 'تنخواہ', Daily: 'روزانہ', Revenue: 'آمدنی', Growth: 'ترقی', Report: 'رپورٹ', Customers: 'صارفین', Manager: 'مینیجر', Hierarchy: 'درجہ بندی', Depth: 'گہرائی', Top: 'ٹاپ', Performers: 'کارکردگی دکھانے والے', Monthly: 'ماہانہ', Subscription: 'سبسکرپشن', Churn: 'متروک', Frequent: 'بار بار', Shoppers: 'خریدار', Inventory: 'انوینٹری', Stockout: 'اسٹاک آؤٹ', Prediction: 'پیش گوئی', Overlapping: 'اوورلیپنگ', Meeting: 'میٹنگ', Rooms: 'کمرے' },
    gu: { Two: 'બે', Sum: 'સરવાળો', Valid: 'માન્ય', Anagram: 'એનાગ્રામ', Combine: 'જોડો', Tables: 'કોષ્ટકો', Second: 'બીજો', Highest: 'સૌથી વધુ', Salary: 'પગાર', Daily: 'દૈનિક', Revenue: 'આવક', Growth: 'વૃદ્ધિ', Report: 'અહેવાલ', Customers: 'ગ્રાહકો', Manager: 'મેનેજર', Hierarchy: 'પદાનુક્રમ', Depth: 'ઊંડાઈ', Top: 'ટોચ', Performers: 'પ્રદર્શનકારો', Monthly: 'માસિક', Subscription: 'સબ્સ્ક્રિપ્શન', Churn: 'ચર્ન', Frequent: 'વારંવાર', Shoppers: 'ખરીદદારો', Inventory: 'ઇન્વેન્ટરી', Stockout: 'સ્ટોકઆઉટ', Prediction: 'આગાહી', Overlapping: 'ઓવરલેપિંગ', Meeting: 'મીટિંગ', Rooms: 'રૂમ' },
    kn: { Two: 'ಎರಡು', Sum: 'ಮೊತ್ತ', Valid: 'ಮಾನ್ಯ', Anagram: 'ಅನಗ್ರಾಮ್', Combine: 'ಸೇರಿಸಿ', Tables: 'ಕೋಷ್ಟಕಗಳು', Second: 'ಎರಡನೇ', Highest: 'ಅತ್ಯಧಿಕ', Salary: 'ಸಂಬಳ', Daily: 'ದೈನಂದಿನ', Revenue: 'ಆದಾಯ', Growth: 'ಬೆಳವಣಿಗೆ', Report: 'ವರದಿ', Customers: 'ಗ್ರಾಹಕರು', Manager: 'ವ್ಯವಸ್ಥಾಪಕ', Hierarchy: 'ಶ್ರೇಣಿ', Depth: 'ಆಳ', Top: 'ಉನ್ನತ', Performers: 'ಕಾರ್ಯನಿರ್ವಾಹಕರು', Monthly: 'ಮಾಸಿಕ', Subscription: 'ಚಂದಾದಾರಿಕೆ', Churn: 'ಚರ್ನ್', Frequent: 'ಆಗಾಗ್ಗೆ', Shoppers: 'ಖರೀದಿದಾರರು', Inventory: 'ದಾಸ್ತಾನು', Stockout: 'ಸ್ಟಾಕ್ಔಟ್', Prediction: 'ಭವಿಷ್ಯವಾಣಿ', Overlapping: 'ಅತಿಕ್ರಮಣ', Meeting: 'ಸಭೆ', Rooms: 'ಕೊಠಡಿಗಳು' },
    ml: { Two: 'രണ്ട്', Sum: 'തുക', Valid: 'സാധുവായ', Anagram: 'അനാഗ്രാം', Combine: 'ചേർക്കുക', Tables: 'പട്ടികകൾ', Second: 'രണ്ടാമത്തെ', Highest: 'ഏറ്റവും ഉയർന്ന', Salary: 'ശമ്പളം', Daily: 'പ്രതിദിന', Revenue: 'വരുമാനം', Growth: 'വളർച്ച', Report: 'റിപ്പോർട്ട്', Customers: 'ഉപഭോക്താക്കൾ', Manager: 'മാനേജർ', Hierarchy: 'ശ്രേണി', Depth: 'ആഴം', Top: 'മുകളിലുള്ള', Performers: 'പ്രവർത്തിക്കുന്നവർ', Monthly: 'പ്രതിമാസ', Subscription: 'സബ്സ്ക്രിപ്ഷൻ', Churn: 'കൊഴിഞ്ഞുപോക്ക്', Frequent: 'ഇടവേളകളില്ലാത്ത', Shoppers: 'ഷോപ്പർമാർ', Inventory: 'ഇൻവെന്ററി', Stockout: 'സ്റ്റോക്ക്ഔട്ട്', Prediction: 'പ്രവചനം', Overlapping: 'ഒന്നിലൊന്ന്', Meeting: 'യോഗം', Rooms: 'മുറികൾ' },
    or: { Two: 'ଦୁଇଟି', Sum: 'ସମଷ୍ଟି', Valid: 'ବୈଧ', Anagram: 'ଆନାଗ୍ରାମ୍', Combine: 'ମିଶାନ୍ତୁ', Tables: 'ଟେବୁଲ୍', Second: 'ଦ୍ୱିତୀୟ', Highest: 'ସର୍ବାଧିକ', Salary: 'ଦରମା', Daily: 'ଦୈନିକ', Revenue: 'ରାଜସ୍ୱ', Growth: 'ବୃଦ୍ଧି', Report: 'ରିପୋର୍ଟ', Customers: 'ଗ୍ରାହକ', Manager: 'ପରିଚାଳକ', Hierarchy: 'ପଦାନୁକ୍ରମ', Depth: 'ଗଭୀରତା', Top: 'ଶୀର୍ଷ', Performers: 'ପ୍ରଦର୍ଶନକାରୀ', Monthly: 'ମାସିକ', Subscription: 'ସଦସ୍ୟତା', Churn: 'ଚର୍ନ', Frequent: 'ବାରମ୍ବାର', Shoppers: 'କିଣାଳି', Inventory: 'ଇନଭେଣ୍ଟୋରୀ', Stockout: 'ଷ୍ଟକଆଉଟ୍', Prediction: 'ପୂର୍ବାନୁମାନ', Overlapping: 'ଓଭରଲ୍ୟାପିଂ', Meeting: 'ମିଟିଂ', Rooms: 'ରୁମଗୁଡିକ' },
    pa: { Two: 'ਦੋ', Sum: 'ਜੋੜ', Valid: 'ਜਾਇਜ਼', Anagram: 'ਐਨਾਗ੍ਰਾਮ', Combine: 'ਮਿਲਾਓ', Tables: 'ਟੇਬਲ', Second: 'ਦੂਜਾ', Highest: 'ਸਭ ਤੋਂ ਵੱਧ', Salary: 'ਤਨਖਾਹ', Daily: 'ਰੋਜ਼ਾਨਾ', Revenue: 'ਆਮਦਨ', Growth: 'ਵਾਧਾ', Report: 'ਰਿਪੋਰਟ', Customers: 'ਗਾਹਕ', Manager: 'ਮੈਨੇਜਰ', Hierarchy: 'ਪਦਵੀ', Depth: 'ਗਹਿਰਾਈ', Top: 'ਚੋਟੀ ਦੇ', Performers: 'ਪ੍ਰਦਰਸ਼ਨਕਾਰੀ', Monthly: 'ਮਾਸਿਕ', Subscription: 'ਗਾਹਕੀ', Churn: 'ਛੱਡਣਾ', Frequent: 'ਅਕਸਰ', Shoppers: 'ਖਰੀਦਦਾਰ', Inventory: 'ਇਨਵੈਂਟਰੀ', Stockout: 'ਸਟਾਕਆਊਟ', Prediction: 'ਭਵਿੱਖਬਾਣੀ', Overlapping: 'ਓਵਰਲੈਪਿੰਗ', Meeting: 'ਮੀਟਿੰਗ', Rooms: 'ਕਮਰੇ' },
    as: { Two: 'দুটা', Sum: 'যোগফল', Valid: 'বৈধ', Anagram: 'এনাগ্ৰাম', Combine: 'লগ', Tables: 'টেবুল', Second: 'দ্বিতীয়', Highest: 'সৰ্বোচ্চ', Salary: 'দৰমহা', Daily: 'দৈনিক', Revenue: 'ৰাজহ', Growth: 'বৃদ্ধি', Report: 'প্ৰতিবেদন', Customers: 'গ্ৰাহক', Manager: 'পৰিচালক', Hierarchy: 'শ্ৰেণীবিন্যাস', Depth: 'গভীৰতা', Top: 'শীৰ্ষ', Performers: 'প্ৰদৰ্শনকাৰী', Monthly: 'মাহিলী', Subscription: 'গ্ৰাহকত্ব', Churn: 'পৰিত্যাগ', Frequent: 'ঘনাই', Shoppers: 'ক্ৰেতা', Inventory: 'মজুত', Stockout: 'ষ্টকআউট', Prediction: 'ভৱিষ্যতবাণী', Overlapping: 'ওভাৰলেপিং', Meeting: 'সভা', Rooms: 'কোঠা' }
}

const SKIP_TRANSLITERATION = new Set(['SQL', 'BFS', 'DFS', 'CTE'])

function transliterateStrict(word: string, lang: LanguageCode): string {
    const map = TRANSLITERATION_MAPS[lang]
    if (!map) return word
    let result = ''
    for (const char of word) {
        const lower = char.toLowerCase()
        if (map[lower]) {
            result += map[lower]
        } else {
            result += char
        }
    }
    return result
}

export function localizeProblemTitle(title: string, lang: LanguageCode): string {
    if (lang === 'en') return title

    // 1) Test basic dictionary substitution
    const words = title.split(' ')
    const dict = COMMON_TITLE_WORDS[lang] ?? {}

    const mapped = words.map(w => {
        // Exact dict match
        if (dict[w]) return dict[w]
        // Strip trailing punctuation for dict match
        const cleanW = w.replace(/[.,:;()]/g, '')
        if (dict[cleanW]) return w.replace(cleanW, dict[cleanW])
        // If acronym, leave alone
        if (SKIP_TRANSLITERATION.has(cleanW)) return w

        // Check if it's already translated/non-latin
        if (/[^\x00-\x7F]/.test(w)) return w // has non-ascii

        // Transliterate approximate
        return transliterateStrict(w, lang)
    })

    return mapped.join(' ')
}

const SQL_SINGLE = [
    'select', 'from', 'where', 'join', 'distinct', 'null',
    'and', 'or', 'not', 'in', 'as', 'on', 'having', 'limit', 'offset', 'with', 'union', 'case', 'when', 'then', 'else', 'end',
]

const SQL_MULTI = [
    'group by',
    'order by',
    'left join',
    'right join',
    'inner join',
    'full join',
    'cross join',
    'union all',
    'with recursive',
]

const SQL_IDENTIFIERS = [
    // table names
    'Person', 'Address', 'Employee', 'Department', 'Users', 'Orders', 'Customers', 'Sales', 'Logins', 'Subscriptions',
    // common columns (preserve exact)
    'firstName', 'lastName', 'personId', 'addressId', 'customerId', 'orderId', 'orderDate',
    'city', 'state', 'salary', 'departmentId', 'managerId', 'loginAt', 'endedAt', 'renewed',
]

function escapeRegex(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const sqlSingleRe = `\\b(?:${SQL_SINGLE.map(escapeRegex).join('|')})\\b`
const sqlMultiRe = `\\b(?:${SQL_MULTI
    .map((p) => escapeRegex(p).replace(/\\ /g, '\\s+'))
    .join('|')})\\b`
const sqlIdentifiersRe = `\\b(?:${SQL_IDENTIFIERS.map(escapeRegex).join('|')})\\b`

// Mask targets:
// - fenced code blocks
// - inline backticks
// - identifiers (camelCase, PascalCase, snake_case, ALL_CAPS)
// - function calls like foo(bar)
// - SQL reserved + schema identifiers
const MATCH_PATTERN = new RegExp(
    [
        '```[\\s\\S]*?```',                 // fenced code
        '`[^`]+`',                          // inline code
        '\\b[A-Za-z_][A-Za-z0-9_]*\\([^\\n\\)]*\\)', // functionCall(args) (no newline)
        '\\b[a-z]+[A-Z][a-zA-Z0-9]*\\b',    // camelCase
        '\\b[A-Z][a-z0-9]+(?:[A-Z][a-zA-Z0-9]*)+\\b', // PascalCase-ish
        '\\b[A-Za-z]+_[A-Za-z0-9_]+\\b',    // snake_case
        '\\b[A-Z]{2,}(?:_[A-Z0-9]+)*\\b',   // ALL_CAPS / CONSTS
        sqlMultiRe,                         // multiword SQL
        sqlSingleRe,                        // singleword SQL
        sqlIdentifiersRe,                   // schema identifiers
    ].join('|'),
    'gi',
)

export function localizeProblemText(text: string, lang: LanguageCode): string {
    if (lang === 'en' || !text) return text

    const tokens: string[] = []
    const masked = text.replace(MATCH_PATTERN, (match) => {
        tokens.push(match)
        return `__TOKEN_${tokens.length - 1}__`
    })

    const translated = applyPhraseDictionary(masked, getProblemPhraseDict(lang))

    return translated.replace(/__TOKEN_(\d+)__/g, (_, idx) => tokens[Number(idx)] ?? '')
}

// dev-only helper; synchronous + deterministic
export function assertNoEnglishLeak(text: string, lang: LanguageCode, context: string) {
    if (lang === 'en' || !text) return
    const justProse = text.replace(MATCH_PATTERN, '')
    if (detectLatinWords(justProse)) {
        // warn only (don’t throw), so demo doesn’t crash
        console.warn(`[Leak Verification] ${context}`, { text })
    }
}
