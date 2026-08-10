export interface LyricLinePreset {
  id: string;
  text: string;                  // Native script
  transliteration: string;       // ISO Romanized
  syllables: number;
  isAgentAssisted?: boolean;
  flaggedMeter?: boolean;
}

export interface LyricSectionPreset {
  id: string;
  name: string;
  lines: LyricLinePreset[];
}

export interface CoWriterSuggestionPreset {
  id: string;
  sectionIndex: number;
  lineIndex: number;
  originalText: string;
  suggestedText: string;          // Native script
  suggestedTransliteration: string;
  type: 'dialect_nuance' | 'meter_fix' | 'rhyme' | 'alternative';
  explanation: string;
  syllableCount: number;
  meterNote?: string;
}

export interface LanguagePreset {
  language: string;
  script: string;
  dialects: string[];
  defaultDialect: string;
  sections: LyricSectionPreset[];
  suggestions: CoWriterSuggestionPreset[];
  notes: string;
}

export const INDIC_LYRIC_PRESETS: Record<string, LanguagePreset> = {
  Telugu: {
    language: 'Telugu',
    script: 'తెలుగు (Telugu Script)',
    dialects: [
      'Telangana (North Deccan)',
      'Coastal Andhra (Kosta)',
      'Rayalaseema',
      'Urban Hyderabad Slang'
    ],
    defaultDialect: 'Telangana (North Deccan)',
    sections: [
      {
        id: 'sec-v1',
        name: 'Verse 1 (చరణం 1)',
        lines: [
          {
            id: 'line-1',
            text: 'మేఘాల సీమలో మెరిసేటి తారవు నీవే',
            transliteration: 'mēghāla sīmalō merisēṭi tāravu nīvē',
            syllables: 12,
            isAgentAssisted: false
          },
          {
            id: 'line-2',
            text: 'రేపటి వెలుగుల దారి చూపే దారి చూపించే దీపానివి నీవే',
            transliteration: 'rēpaṭi velugula dāri cūpē dāri cūpiñcē dīpānivi nīvē',
            syllables: 16,
            isAgentAssisted: false,
            flaggedMeter: true
          },
          {
            id: 'line-3',
            text: 'మౌనంలో దాగున్న మధుర గానానివి',
            transliteration: 'maunaṁlō dāgunna madhura gānānivi',
            syllables: 12,
            isAgentAssisted: false
          }
        ]
      },
      {
        id: 'sec-chorus',
        name: 'Chorus (పల్లవి)',
        lines: [
          {
            id: 'line-4',
            text: 'వాన తుంపరలై రాలే నా జ్ఞాపకాలు',
            transliteration: 'vānam tumparalai rālē nā jñāpakālu',
            syllables: 11,
            isAgentAssisted: false
          },
          {
            id: 'line-5',
            text: 'నీ కంటి పాపలో తొంగి చూసే ఆశలు',
            transliteration: 'nī kaṇṭi pāpalō toṅgi cūsē āśalu',
            syllables: 11,
            isAgentAssisted: false
          },
          {
            id: 'line-6',
            text: 'సుడిగాలై సాగే వయసు ప్రవాహము',
            transliteration: 'suḍigālai sāgē vayasu pravāhamu',
            syllables: 11,
            isAgentAssisted: false
          }
        ]
      },
      {
        id: 'sec-bridge',
        name: 'Bridge (అనుపల్లవి)',
        lines: [
          {
            id: 'line-7',
            text: 'కాలిబాటల వెంటే కదిలే కాలం',
            transliteration: 'kālibāṭala veṇṭē kadilē kālaṁ',
            syllables: 10,
            isAgentAssisted: false
          },
          {
            id: 'line-8',
            text: 'చీకటి గుండెల్లో చిగురించే స్నేహం',
            transliteration: 'cīkaṭi guṇḍellō ciguriñcē snēhaṁ',
            syllables: 10,
            isAgentAssisted: false
          }
        ]
      }
    ],
    suggestions: [
      {
        id: 'sug-1',
        sectionIndex: 0,
        lineIndex: 1,
        originalText: 'రేపటి వెలుగుల దారి చూపే దారి చూపించే దీపానివి నీవే',
        suggestedText: 'రేపటి దారి కాచే దీపానివి నీవే',
        suggestedTransliteration: 'rēpaṭi dāri kācē dīpānivi nīvē',
        type: 'meter_fix',
        explanation: 'Trims 16 syllables to 12 syllables to maintain the 12-syllable prosody meter established in Line 1.',
        syllableCount: 12,
        meterNote: 'Restores section symmetry (12 - 12 - 12)'
      },
      {
        id: 'sug-2',
        sectionIndex: 0,
        lineIndex: 0,
        originalText: 'మేఘాల సీమలో మెరిసేటి తారవు నీవే',
        suggestedText: 'చుక్కల బాట పొంటి సాగేటి పోరగాడా',
        suggestedTransliteration: 'cukkala bāṭa poṇṭi sāgēṭi pōragāḍā',
        type: 'dialect_nuance',
        explanation: 'Infuses authentic Telangana Deccan folk idiom ("బాట పొంటి", "పోరగాడు") for heightened regional resonance.',
        syllableCount: 12,
        meterNote: 'Telangana folk idiom resonance'
      },
      {
        id: 'sug-3',
        sectionIndex: 1,
        lineIndex: 2,
        originalText: 'సుడిగాలై సాగే వయసు ప్రవాహము',
        suggestedText: 'తుఫానునై పొంగే ఆవేశ బంధము',
        suggestedTransliteration: 'tufānunai poṅgē āvēśa bandhamu',
        type: 'rhyme',
        explanation: 'Provides an internal rhyme pair for Line 1 ("తుంపరలై" / "తుఫానునై") with rich vocalic resonance.',
        syllableCount: 11,
        meterNote: 'Enhances chorus vocal punch'
      }
    ],
    notes: 'Telangana dialect prefers colloquial verb endings (-తాడు, -పోరగాడు, -బాట పొంటి) over formal coastal forms.'
  },
  Hindi: {
    language: 'Hindi',
    script: 'देवनागरी (Devanagari Script)',
    dialects: [
      'Delhi Urban',
      'Awadhi (Folk/Classical)',
      'Braj Bhasha',
      'Mumbai Tapori / Bambaiya'
    ],
    defaultDialect: 'Delhi Urban',
    sections: [
      {
        id: 'sec-h1',
        name: 'Verse 1 (अंतरा 1)',
        lines: [
          {
            id: 'hline-1',
            text: 'काली रातों में जलती एक मद्धम लौ',
            transliteration: 'kālī rātōṁ mēṁ jaltī ēk maddham lau',
            syllables: 12,
            isAgentAssisted: false
          },
          {
            id: 'hline-2',
            text: 'सुरमई हवाओं में बहती ये ख़ामोश सदाएँ गूँजती रहती हैं',
            transliteration: 'surmaī havāōṁ mēṁ bahtī yē xāmōś sadāēṁ gūñjtī rahtī haiṁ',
            syllables: 18,
            isAgentAssisted: false,
            flaggedMeter: true
          },
          {
            id: 'hline-3',
            text: 'तेरी यादों का कोई किनारा नहीं मिलता',
            transliteration: 'tērī yādōṁ kā kōī kinārā nahīṁ miltā',
            syllables: 12,
            isAgentAssisted: false
          }
        ]
      },
      {
        id: 'sec-h2',
        name: 'Chorus (स्थायी)',
        lines: [
          {
            id: 'hline-4',
            text: 'मेघ मलहार की पहली वो बूँदें',
            transliteration: 'mēgh malhār kī pahlī vō būṁdēṁ',
            syllables: 10,
            isAgentAssisted: false
          },
          {
            id: 'hline-5',
            text: 'रूह को छू जाए तेरी वो बातें',
            transliteration: 'rūh kō chū jāē tērī vō bātēṁ',
            syllables: 10,
            isAgentAssisted: false
          }
        ]
      }
    ],
    suggestions: [
      {
        id: 'hsug-1',
        sectionIndex: 0,
        lineIndex: 1,
        originalText: 'सुरमई हवाओं में बहती ये ख़ामोश सदाएँ गूँजती रहती हैं',
        suggestedText: 'सुरमई हवा में बहती ख़ामोशी',
        suggestedTransliteration: 'surmaī havā mēṁ bahtī xāmōśī',
        type: 'meter_fix',
        explanation: 'Trims 18-syllable overflow to 12 syllables matching Matra prosody.',
        syllableCount: 12,
        meterNote: 'Syllabic weight aligned with Ghazal / Geet meter'
      },
      {
        id: 'hsug-2',
        sectionIndex: 0,
        lineIndex: 0,
        originalText: 'काली रातों में जलती एक मद्धम लौ',
        suggestedText: 'काली रतिया म जलती एक दिया बाती',
        suggestedTransliteration: 'kālī ratiyā ma jaltī ēk diyā bātī',
        type: 'dialect_nuance',
        explanation: 'Transforms urban Hindi into Awadhi folk imagery ("रतिया म", "दिया बाती").',
        syllableCount: 12,
        meterNote: 'Awadhi acoustic warmth'
      }
    ],
    notes: 'Awadhi and Braj dialects introduce rich open-vowel rhymes and traditional folk matra structures.'
  },
  Tamil: {
    language: 'Tamil',
    script: 'தமிழ் (Tamil Script)',
    dialects: [
      'Chennai Gaana',
      'Madurai Slang',
      'Kongu Tamil (Coimbatore)',
      'Tirunelveli Dialect'
    ],
    defaultDialect: 'Chennai Gaana',
    sections: [
      {
        id: 'sec-t1',
        name: 'Verse 1 (சரணம் 1)',
        lines: [
          {
            id: 'tline-1',
            text: 'இரவின் மடியில் மலரும் புதுக் கவிதை',
            transliteration: 'iravin maḍiyil malarum puduk kavidai',
            syllables: 12,
            isAgentAssisted: false
          },
          {
            id: 'tline-2',
            text: 'உன் கண்கள் பேசும் மொழியில் என்ன மயக்கம் இந்த வழியில்',
            transliteration: 'un kaṇgaḷ pēsum moḻiyil enna mayakkam inda vaḻiyil',
            syllables: 17,
            isAgentAssisted: false,
            flaggedMeter: true
          },
          {
            id: 'tline-3',
            text: 'காற்றினில் மிதக்கும் உனது இனிய குரல்',
            transliteration: 'kāṟṟinil midakkum unadu iniya kural',
            syllables: 12,
            isAgentAssisted: false
          }
        ]
      },
      {
        id: 'sec-t2',
        name: 'Chorus (பல்லவி)',
        lines: [
          {
            id: 'tline-4',
            text: 'மழைத்துளி விழும் ஓசை நெஞ்சில் ஒலிக்குதே',
            transliteration: 'maḻaittuḷi viḻum ōsai neñjil olikkudē',
            syllables: 11,
            isAgentAssisted: false
          },
          {
            id: 'tline-5',
            text: 'உன் நினைவுகள் எந்தன் கனவில் வாழுதே',
            transliteration: 'un ninaivugaḷ endan kanavil vāḻudē',
            syllables: 11,
            isAgentAssisted: false
          }
        ]
      }
    ],
    suggestions: [
      {
        id: 'tsug-1',
        sectionIndex: 0,
        lineIndex: 1,
        originalText: 'உன் கண்கள் பேசும் மொழியில் என்ன மயக்கம் இந்த வழியில்',
        suggestedText: 'உன் கண்கள் பேசும் மௌன மயக்கம்',
        suggestedTransliteration: 'un kaṇgaḷ pēsum mauna mayakkam',
        type: 'meter_fix',
        explanation: 'Adjusts line length to 12 syllables matching Tamil Venba/Ganam meter.',
        syllableCount: 12,
        meterNote: 'Venba prosody alignment'
      },
      {
        id: 'tsug-2',
        sectionIndex: 0,
        lineIndex: 0,
        originalText: 'இரவின் மடியில் மலரும் புதுக் கவிதை',
        suggestedText: 'மச்சி உன்னோட நெனப்பு நெஞ்சுக்குள்ளே',
        suggestedTransliteration: 'macci unnōḍa nenappu neñjukkuḷḷē',
        type: 'dialect_nuance',
        explanation: 'Applies authentic North Chennai Gaana rhythmic slang ("மச்சி", "நெனப்பு").',
        syllableCount: 12,
        meterNote: 'Gaana urban beat synergy'
      }
    ],
    notes: 'Chennai Gaana uses punchy rhythmic consonants and conversational urban slang.'
  },
  Punjabi: {
    language: 'Punjabi',
    script: 'ਗੁਰਮੁਖੀ (Gurmukhi Script)',
    dialects: [
      'Majhi (Central Punjab)',
      'Doabi',
      'Malwai',
      'Pothohari / Pahari'
    ],
    defaultDialect: 'Majhi (Central Punjab)',
    sections: [
      {
        id: 'sec-p1',
        name: 'Verse 1 (ਅੰਤਰਾ 1)',
        lines: [
          {
            id: 'pline-1',
            text: 'ਰਾਤਾਂ ਦੀ ਖਾਮੋਸ਼ੀ ਵਿੱਚ ਤੇਰੀ ਆਵਾਜ਼',
            transliteration: 'rātāṁ dī xāmōśī vicc tērī āvāz',
            syllables: 12,
            isAgentAssisted: false
          },
          {
            id: 'pline-2',
            text: 'ਰੂਹ ਨੂੰ ਛੂਹ ਜਾਵੇ ਤੇਰਾ ਮਿੱਠਾ ਅਹਿਸਾਸ ਤੇਰੀਆਂ ਯਾਦਾਂ ਦਾ ਸਿਲਸਿਲਾ',
            transliteration: 'rūh nūṁ chūh jāvē tērā miṭṭhā ahisās tērīāṁ yādāṁ dā silasilā',
            syllables: 18,
            isAgentAssisted: false,
            flaggedMeter: true
          }
        ]
      },
      {
        id: 'sec-p2',
        name: 'Chorus (ਸਥਾਈ)',
        lines: [
          {
            id: 'pline-3',
            text: 'ਚੰਨ ਜਿਹੇ ਮੁੱਖੜੇ ਦਾ ਮਿੱਠਾ ਹਾਸਾ',
            transliteration: 'cann jihē mukkhaṛē dā miṭṭhā hāsā',
            syllables: 11,
            isAgentAssisted: false
          },
          {
            id: 'pline-4',
            text: 'ਦਿਲ ਵਿੱਚ ਵਸ ਗਿਆ ਤੇਰਾ ਦਿਲਾਸਾ',
            transliteration: 'dil vicc vas giā tērā dilāsā',
            syllables: 11,
            isAgentAssisted: false
          }
        ]
      }
    ],
    suggestions: [
      {
        id: 'psug-1',
        sectionIndex: 0,
        lineIndex: 1,
        originalText: 'ਰੂਹ ਨੂੰ ਛੂਹ ਜਾਵੇ ਤੇਰਾ ਮਿੱਠਾ ਅਹਿਸਾਸ ਤੇਰੀਆਂ ਯਾਦਾਂ ਦਾ ਸਿਲਸਿਲਾ',
        suggestedText: 'ਰੂਹ ਨੂੰ ਛੂਹ ਜਾਵੇ ਮਿੱਠਾ ਅਹਿਸਾਸ',
        suggestedTransliteration: 'rūh nūṁ chūh jāvē miṭṭhā ahisās',
        type: 'meter_fix',
        explanation: 'Shortens over-long line to 12 syllables to match Punjabi Tappa / Boliyan meter.',
        syllableCount: 12,
        meterNote: 'Tappa rhythm cadence'
      }
    ],
    notes: 'Gurmukhi prosody emphasizes strong stress accents and open vowel rhymes.'
  },
  Bengali: {
    language: 'Bengali',
    script: 'বাংলা (Bengali Script)',
    dialects: [
      'Kolkata Standard (Chalit)',
      'Dhakai Dialect (Bangal)',
      'Rarhi (West Bengal)',
      'Sylheti / Chittagonian'
    ],
    defaultDialect: 'Kolkata Standard (Chalit)',
    sections: [
      {
        id: 'sec-b1',
        name: 'Verse 1 (স্তবক ১)',
        lines: [
          {
            id: 'bline-1',
            text: 'শ্রাবণ মেঘের ছায়ায় আঁকা আলো',
            transliteration: 'śrābaṇ mēghēr chāyāy ām̐kā ālō',
            syllables: 12,
            isAgentAssisted: false
          },
          {
            id: 'bline-2',
            text: 'তোর চোখের নীলে সুর বাঁধে গান আর বাতাসের বাঁশি বাজায় তোকে',
            transliteration: 'tōr cōkhēr nīlē sur bām̐dhē gān ār bātāsēr bām̐śi bājāy tōkē',
            syllables: 18,
            isAgentAssisted: false,
            flaggedMeter: true
          }
        ]
      },
      {
        id: 'sec-b2',
        name: 'Chorus (স্থায়ী)',
        lines: [
          {
            id: 'bline-3',
            text: 'নদীর তীরের শিশির ভেজা সবুজ ঘাস',
            transliteration: 'nadīr tīrēr śiśir bhējā sabuj ghās',
            syllables: 11,
            isAgentAssisted: false
          },
          {
            id: 'bline-4',
            text: 'মনের মাঝে জমে থাকে এক বিশ্বাস',
            transliteration: 'manēr mājhē jamē thākē ēk biśbās',
            syllables: 11,
            isAgentAssisted: false
          }
        ]
      }
    ],
    suggestions: [
      {
        id: 'bsug-1',
        sectionIndex: 0,
        lineIndex: 1,
        originalText: 'তোর চোখের নীলে সুর বাঁধে গান আর বাতাসের বাঁশি বাজায় তোকে',
        suggestedText: 'তোর চোখের নীলে সুর বাঁধে গান',
        suggestedTransliteration: 'tōr cōkhēr nīlē sur bām̐dhē gān',
        type: 'meter_fix',
        explanation: 'Trims line to 12 Matras aligned with Rabindra Sangeet / Baul meter.',
        syllableCount: 12,
        meterNote: 'Baul/Bhatiali rhythmic flow'
      }
    ],
    notes: 'Bengali lyrics benefit from soft liquid consonants and emotive seasonal metaphors.'
  }
};
