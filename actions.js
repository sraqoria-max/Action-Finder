// ============================================================================
// Exactly 28 Registered Hand Actions (Exact Names & Malayalam Metadata)
// Hand Actions Only - Powered by MediaPipe 21 Hand Landmarks
// Strictly deterministic recognition: 28 Actions + "No Action"
// ============================================================================

const ACTION_CATEGORIES = {
    elevation: { name: 'Hand Elevations', nameML: 'കൈ ഉയർത്തലുകൾ', color: '#6C63FF' },
    dynamic: { name: 'Dynamic Movements', nameML: 'ചലനാത്മക ആംഗ്യങ്ങൾ', color: '#FF6B9D' },
    sign: { name: 'Hand & Finger Signs', nameML: 'കൈ മുദ്രകൾ', color: '#4ADE80' },
    daily: { name: 'Functional Gestures', nameML: 'ദൈനംദിന ആംഗ്യങ്ങൾ', color: '#FBBF24' },
    comm: { name: 'Communication Words', nameML: 'ആശയവിനിമയ ആംഗ്യങ്ങൾ', color: '#60A5FA' }
};

const NO_ACTION = {
    id: 0,
    name: 'No Action',
    en: 'No Action',
    ml: 'ആക്ഷൻ ഇല്ല',
    meaning: 'കൈ ആംഗ്യങ്ങളൊന്നും നിർവ്വചിച്ച നിബന്ധനകൾ പാലിച്ചിട്ടില്ല',
    emoji: '⏸️',
    category: 'none',
    confidence: 0
};

const ACTIONS = [
    // =========================================================================
    // Basic Hand Actions (1 - 10)
    // =========================================================================
    {
        id: 1,
        name: 'Raise Right Hand',
        en: 'Raise Right Hand',
        ml: 'വലത് കൈ ഉയർത്തുക',
        meaning: 'ശരീരത്തിന്റെ വലതു കൈ തോളിന് അല്ലെങ്കിൽ തലയ്ക്ക് മുകളിലേക്ക് ഉയർത്തുക',
        emoji: '✋',
        category: 'elevation',
        howTo: 'Raise your anatomical right hand clearly above shoulder or head level and hold it steady.',
        howToML: 'നിങ്ങളുടെ ശരീരത്തിന്റെ വലതു കൈ തോളിന് അല്ലെങ്കിൽ തലയ്ക്ക് മുകളിലേക്ക് ഉയർത്തിപ്പിടിക്കുക.',
        posture: 'Right hand elevated (wrist y < 0.40), Left hand resting/down',
        postureML: 'വലതു കൈത്തണ്ട ഉയർന്നു നിൽക്കുക (y < 0.40), ഇടതുകൈ താഴ്ത്തി വെയ്ക്കുക'
    },
    {
        id: 2,
        name: 'Raise Left Hand',
        en: 'Raise Left Hand',
        ml: 'ഇടത് കൈ ഉയർത്തുക',
        meaning: 'ശരീരത്തിന്റെ ഇടതു കൈ തോളിന് അല്ലെങ്കിൽ തലയ്ക്ക് മുകളിലേക്ക് ഉയർത്തുക',
        emoji: '🤚',
        category: 'elevation',
        howTo: 'Raise your anatomical left hand clearly above shoulder or head level and hold it steady.',
        howToML: 'നിങ്ങളുടെ ശരീരത്തിന്റെ ഇടതു കൈ തോളിന് അല്ലെങ്കിൽ തലയ്ക്ക് മുകളിലേക്ക് ഉയർത്തിപ്പിടിക്കുക.',
        posture: 'Left hand elevated (wrist y < 0.40), Right hand resting/down',
        postureML: 'ഇടതു കൈത്തണ്ട ഉയർന്നു നിൽക്കുക (y < 0.40), വലതുകൈ താഴ്ത്തി വെയ്ക്കുക'
    },
    {
        id: 3,
        name: 'Raise Both Hands',
        en: 'Raise Both Hands',
        ml: 'രണ്ട് കൈയും ഉയർത്തുക',
        meaning: 'രണ്ട് കൈകളും ഒരേ സമയം തോളിനോ തലയ്ക്കോ മുകളിലേക്ക് ഉയർത്തുക',
        emoji: '🙌',
        category: 'elevation',
        howTo: 'Simultaneously raise both your left and right hands above shoulder level.',
        howToML: 'രണ്ട് കൈകളും ഒരേ സമയം മുകളിലേക്ക് ഉയർത്തിപ്പിടിക്കുക.',
        posture: 'Both wrists elevated simultaneously (wrist y < 0.42 for both hands)',
        postureML: 'രണ്ട് കൈത്തണ്ടകളും ഒരേസമയം മുകളിലേക്ക് ഉയർന്നു നിൽക്കുക'
    },
    {
        id: 4,
        name: 'Waving Right Hand',
        en: 'Waving Right Hand',
        ml: 'വലത് കൈ വീശുക',
        meaning: 'വലതു കൈ ഉയർത്തി തുറന്ന കൈപ്പത്തിയോടെ വശങ്ങളിലേക്ക് ആവർത്തിച്ച് വീശുക',
        emoji: '👋',
        category: 'dynamic',
        howTo: 'Raise your right hand wide to the side and wave back and forth horizontally.',
        howToML: 'വലതു കൈ വശത്തേക്ക് ഉയർത്തി കൈപ്പത്തി ഇടത്തോട്ടും വലത്തോട്ടും വീശുക.',
        posture: 'Elevated right hand with repeated left-right horizontal oscillations across multiple frames',
        postureML: 'വലതുകൈ വശങ്ങളിലേക്ക് ആവർത്തിച്ച് വീശുന്ന ചലനം'
    },
    {
        id: 5,
        name: 'Waving Left Hand',
        en: 'Waving Left Hand',
        ml: 'ഇടത് കൈ വീശുക',
        meaning: 'ഇടതു കൈ ഉയർത്തി തുറന്ന കൈപ്പത്തിയോടെ വശങ്ങളിലേക്ക് ആവർത്തിച്ച് വീശുക',
        emoji: '👋',
        category: 'dynamic',
        howTo: 'Raise your left hand wide to the side and wave back and forth horizontally.',
        howToML: 'ഇടതു കൈ വശത്തേക്ക് ഉയർത്തി കൈപ്പത്തി ഇടത്തോട്ടും വലത്തോട്ടും വീശുക.',
        posture: 'Elevated left hand with repeated left-right horizontal oscillations across multiple frames',
        postureML: 'ഇടതുകൈ വശങ്ങളിലേക്ക് ആവർത്തിച്ച് വീശുന്ന ചലനം'
    },
    {
        id: 6,
        name: 'Clapping',
        en: 'Clapping',
        ml: 'കൈയടിക്കുക',
        meaning: 'രണ്ട് കൈപ്പത്തികളും പരസ്പരം അഭിമുഖമായി വന്ന് ആവർത്തിച്ച് അടുക്കുകയും അകലുകയും ചെയ്യുക',
        emoji: '👏',
        category: 'dynamic',
        howTo: 'Bring both hands together in front of your chest and clap rhythmically.',
        howToML: 'നെഞ്ചിന് മുന്നിൽ രണ്ട് കൈപ്പത്തികളും അടുപ്പിച്ചും അകറ്റിയും താളത്തിൽ കൈയടിക്കുക.',
        posture: 'Two hands detected with oscillating inter-wrist distance (< 0.28 scale approaching and separating)',
        postureML: 'രണ്ട് കൈപ്പത്തികളും അടുക്കുകയും അകലുകയും ചെയ്യുന്ന ആവർത്തന താളം'
    },
    {
        id: 7,
        name: 'Success',
        en: 'Success',
        ml: 'വിജയം (Success)',
        meaning: 'തള്ളവിരൽ മുകളിലേക്ക് നിവർത്തി മറ്റ് നാല് വിരലുകളും മടക്കി വിജയം സൂചിപ്പിക്കുന്ന നിശ്ചലമായ തംബ്‌സ് അപ്പ് ആംഗ്യം',
        emoji: '👍',
        category: 'sign',
        howTo: 'Extend your thumb straight upward while keeping all four other fingers tightly folded and stationary to signal Success.',
        howToML: 'നാല് വിരലുകളും ഉള്ളിലേക്ക് മടക്കി തള്ളവിരൽ മാത്രം മുകളിലേക്ക് നിവർത്തി നിശ്ചലമായി വിജയം (Success) ആംഗ്യം കാണിക്കുക.',
        posture: 'Thumb extended upward (dy < -0.15), Index-Pinky folded, held stationary (Success / Thumbs Up)',
        postureML: 'തള്ളവിരൽ മുകളിലേക്ക്, മറ്റ് നാല് വിരലുകൾ മടക്കി നിശ്ചലമായി വെയ്ക്കുക (വിജയം / തംബ്‌സ് അപ്പ്)'
    },
    {
        id: 8,
        name: 'Negative',
        en: 'Negative',
        ml: 'നെഗറ്റീവ് (Negative)',
        meaning: 'തള്ളവിരൽ താഴേക്ക് തിരിച്ച് മറ്റ് നാല് വിരലുകളും മടക്കി നെഗറ്റീവ് അല്ലെങ്കിൽ വിയോജിപ്പ് സൂചിപ്പിക്കുക',
        emoji: '👎',
        category: 'sign',
        howTo: 'Extend your thumb straight downward while keeping all four other fingers tightly folded to signal Negative.',
        howToML: 'നാല് വിരലുകളും ഉള്ളിലേക്ക് മടക്കി തള്ളവിരൽ മാത്രം താഴേക്ക് തിരിച്ചുപിടിച്ച് നെഗറ്റീവ് (Negative) ആംഗ്യം കാണിക്കുക.',
        posture: 'Thumb extended downward (dy > 0.15), Index-Pinky folded, held stationary (Negative / Thumbs Down)',
        postureML: 'തള്ളവിരൽ താഴേക്ക്, മറ്റ് നാല് വിരലുകൾ മടക്കി വെയ്ക്കുക (നെഗറ്റീവ് / തംബ്‌സ് ഡൗൺ)'
    },
    {
        id: 9,
        name: 'High Five',
        en: 'High Five',
        ml: 'ഹൈ ഫൈവ് (High Five)',
        meaning: 'എല്ലാ വിരലുകളും നിവർത്തി കൈപ്പത്തി തുറന്നുപിടിച്ച് ഹൈ ഫൈവ് കാണിക്കുക',
        emoji: '🖐️',
        category: 'sign',
        howTo: 'Open your hand wide with all 5 fingers fully extended facing forward in a High Five gesture.',
        howToML: 'കൈപ്പത്തി പൂർണ്ണമായി തുറന്ന് അഞ്ച് വിരലുകളും നിവർത്തി മുന്നോട്ട് കാണിച്ച് ഹൈ ഫൈവ് ചെയ്യുക.',
        posture: 'All 5 fingers extended, open palm facing forward (High Five gesture)',
        postureML: 'അഞ്ച് വിരലുകളും പൂർണ്ണമായി നിവർത്തി മുന്നോട്ട് തുറന്നുപിടിക്കുക (ഹൈ ഫൈവ്)'
    },
    {
        id: 10,
        name: 'Fist',
        en: 'Fist',
        ml: 'മുഷ്ടി ചുരുട്ടുക',
        meaning: 'എല്ലാ വിരലുകളും ഉള്ളിലേക്ക് മടക്കി ഉറപ്പുള്ള മുഷ്ടി ചുരുട്ടിപ്പിടിക്കുക',
        emoji: '✊',
        category: 'sign',
        howTo: 'Fold all four fingers tightly into your palm and curl your thumb over them into a solid closed fist.',
        howToML: 'വിരലുകളെല്ലാം ഉള്ളിലേക്ക് മടക്കി തള്ളവിരലും ചേർത്ത് മുറുക്കെ മുഷ്ടി പിടിക്കുക.',
        posture: 'All fingers folded into palm (tips curled close to palm, no extended finger)',
        postureML: 'എല്ലാ വിരലുകളും കൈപ്പത്തിയിലേക്ക് ചേർത്ത് മുഷ്ടി ചുരുട്ടുക'
    },

    // =========================================================================
    // Finger / Hand Gestures (11 - 19)
    // =========================================================================
    {
        id: 11,
        name: 'Pointing',
        en: 'Pointing',
        ml: 'വിരൽ ചൂണ്ടുക',
        meaning: 'ചൂണ്ടുവിരൽ മാത്രം നിവർത്തി ബാക്കി വിരലുകൾ മടക്കി നിശ്ചലമായി ചൂണ്ടുക',
        emoji: '☝️',
        category: 'sign',
        howTo: 'Extend your index finger straight out while keeping the middle, ring, and pinky fingers folded, held stationary.',
        howToML: 'ചൂണ്ടുവിരൽ മാത്രം നിവർത്തിപ്പിടിച്ച് ബാക്കി വിരലുകൾ ഉള്ളിലേക്ക് മടക്കി നിശ്ചലമായി പിടിക്കുക.',
        posture: 'Index extended, Middle/Ring/Pinky folded, stationary (no wagging)',
        postureML: 'ചൂണ്ടുവിരൽ മാത്രം നിവർത്തി ബാക്കി വിരലുകൾ മടക്കി നിശ്ചലമായി വെയ്ക്കുക'
    },
    {
        id: 12,
        name: 'OK Sign',
        en: 'OK Sign',
        ml: 'ഓകെ ചിഹ്നം (OK Sign)',
        meaning: 'തള്ളവിരലിന്റെയും ചൂണ്ടുവിരലിന്റെയും അറ്റങ്ങൾ വട്ടത്തിൽ മുട്ടിച്ചുപിടിച്ച് ബാക്കി മൂന്ന് വിരലുകൾ മുകളിലേക്ക് നിവർത്തുക',
        emoji: '👌',
        category: 'sign',
        howTo: 'Touch the tips of your thumb and index finger to form a circle, with middle, ring, and pinky extended upward.',
        howToML: 'തള്ളവിരലും ചൂണ്ടുവിരലും വൃത്തത്തിൽ മുട്ടിക്കുക, ബാക്കി 3 വിരലുകൾ മുകളിലേക്ക് നിവർത്തിപ്പിടിക്കുക.',
        posture: 'Thumb tip touches Index tip (dist < 0.28 scale), Middle/Ring/Pinky extended vertically upward',
        postureML: 'തള്ളവിരലും ചൂണ്ടുവിരലും വൃത്തത്തിൽ മുട്ടിച്ച് മറ്റ് വിരലുകൾ മുകളിലേക്ക് നിവർത്തുക'
    },
    {
        id: 13,
        name: 'Peace Sign',
        en: 'Peace Sign',
        ml: 'പീസ് ചിഹ്നം (വിക്ടറി)',
        meaning: 'ചൂണ്ടുവിരലും നടുവിരലും V ആകൃതിയിൽ നിവർത്തിപ്പിടിക്കുക',
        emoji: '✌️',
        category: 'sign',
        howTo: 'Extend your index and middle fingers in a "V" shape while holding ring and pinky fingers folded.',
        howToML: 'ചൂണ്ടുവിരലും നടുവിരലും V ആകൃതിയിൽ നിവർത്തുക, മോതിരവിരലും ചെറുവിരലും മടക്കുക.',
        posture: 'Index and Middle extended in V-formation, Ring and Pinky folded',
        postureML: 'ചൂണ്ടുവിരലും നടുവിരലും V രൂപത്തിൽ നിവർത്തിപ്പിടിക്കുക'
    },
    {
        id: 14,
        name: 'Stop Gesture',
        en: 'Stop Gesture',
        ml: 'സ്റ്റോപ്പ് ആംഗ്യം (Stop Gesture)',
        meaning: 'നിവർത്തിയ കൈപ്പത്തി വിരലുകൾ ലംബമായി മുകളിലേക്ക് ഉയർത്തി ക്യാമറയ്ക്ക് നേരെ നിശ്ചലമായി പിടിക്കുക',
        emoji: '🛑',
        category: 'sign',
        howTo: 'Hold an open palm stationary at chest/face height facing directly at the camera with fingers pointing straight up.',
        howToML: 'കൈപ്പത്തി ക്യാമറയ്ക്ക് നേരെ ലംബമായി ഉയർത്തിപ്പിടിച്ച് സ്റ്റോപ്പ് ആംഗ്യം നിശ്ചലമായി കാണിക്കുക.',
        posture: 'All 5 fingers extended upward, palm facing camera directly, held stationary at chest/shoulder level',
        postureML: 'കൈപ്പത്തി മുന്നോട്ട് അഭിമുഖീകരിച്ച് വിരലുകൾ ലംബമായി നിശ്ചലമായി നിർത്തുക'
    },
    {
        id: 15,
        name: 'Saluting',
        en: 'Saluting',
        ml: 'സല്യൂട്ട് ചെയ്യുക',
        meaning: 'കൈപ്പത്തി നിവർത്തി നെറ്റിക്ക് സമീപം പുരികത്തിന് സമാന്തരമായി നിശ്ചലമായി വെയ്ക്കുക',
        emoji: '🫡',
        category: 'daily',
        howTo: 'Place your flat hand with fingers straight horizontally against the side of your forehead or eyebrow.',
        howToML: 'കൈപ്പത്തി നിവർത്തി നെറ്റിക്ക് സമീപം പുരികത്തിന് സമാന്തരമായി സല്യൂട്ട് രൂപത്തിൽ പിടിക്കുക.',
        posture: 'Hand horizontally aligned near brow (wrist y < 0.35, fingertips near forehead, held stable)',
        postureML: 'കൈ നെറ്റിക്ക് സമീപം പുരികത്തിന് സമാന്തരമായി നിശ്ചലമായി വെച്ച് സല്യൂട്ട് ചെയ്യുക'
    },
    {
        id: 16,
        name: 'Eating',
        en: 'Eating',
        ml: 'ഭക്ഷണം കഴിക്കുക (Eating)',
        meaning: 'വിരലുകൾ കൂട്ടിപ്പിടിച്ച് വായുടെ അടുത്തേക്ക് കൊണ്ടുപോയി ആഹാരം കഴിക്കുന്നത് പോലെ ആവർത്തിച്ച് കാണിക്കുക',
        emoji: '🍽️',
        category: 'daily',
        howTo: 'Gather your fingers together and bring your hand repeatedly toward your mouth and back, as if eating.',
        howToML: 'വിരലുകൾ കൂട്ടിപ്പിടിച്ച് വായുടെ സമീപത്തേക്ക് കൊണ്ടുപോയി ആഹാരം കഴിക്കുന്നത് പോലെ കാണിക്കുക.',
        posture: 'Hand/fingertips gathered near mouth region with eating motion or pose',
        postureML: 'കൈ വായുടെ അടുത്തേക്ക് കൊണ്ടുപോയി ഭക്ഷണം കഴിക്കുന്ന ആംഗ്യം കാണിക്കുക'
    },
    {
        id: 17,
        name: 'Using Phone Gesture',
        en: 'Using Phone Gesture',
        ml: 'ഫോൺ വിളിക്കുന്ന ആംഗ്യം',
        meaning: 'കൈ ചെവിയുടെ സമീപം ഫോൺ പിടിക്കുന്നത് പോലെയോ തള്ളവിരലും ചെറുവിരലും നിവർത്തിയോ വെയ്ക്കുക',
        emoji: '📱',
        category: 'daily',
        howTo: 'Position your hand beside your ear as if holding a phone, or make a thumb-and-pinky phone sign held at the ear.',
        howToML: 'ചെവിയുടെ അടുത്ത് ഫോൺ പിടിക്കുന്നത് പോലെയോ തള്ളവിരലും ചെറുവിരലും നിവർത്തിയോ ആംഗ്യം കാണിക്കുക.',
        posture: 'Hand held steadily beside ear/head (x < 0.32 or x > 0.68, y: 0.20-0.48) for several frames',
        postureML: 'ചെവിയുടെ വശത്ത് ഫോൺ ഉപയോഗിക്കുന്ന രീതിയിൽ കൈ നിശ്ചലമായി വെക്കുക'
    },
    {
        id: 18,
        name: 'Typing Gesture',
        en: 'Typing Gesture',
        ml: 'ടൈപ്പിംഗ് ആംഗ്യം',
        meaning: 'കീബോർഡിൽ ടൈപ്പ് ചെയ്യുന്നത് പോലെ രണ്ട് കൈപ്പത്തികളും മുന്നിൽ താഴെ വെച്ച് വിരലുകൾ ചലിപ്പിക്കുക',
        emoji: '⌨️',
        category: 'daily',
        howTo: 'Hold both hands in front of your torso with palms facing downward, moving your fingers as if typing on a keyboard.',
        howToML: 'കീബോർഡിൽ ടൈപ്പ് ചെയ്യുന്നത് പോലെ രണ്ട് കൈപ്പത്തികളും താഴേക്ക് വെച്ച് വിരലുകൾ സൂക്ഷ്മമായി ചലിപ്പിക്കുക.',
        posture: 'Both hands low (y > 0.48), separated, palms down with subtle finger micro-movements',
        postureML: 'രണ്ട് കൈകളും മുന്നിൽ താഴെ വെച്ച് ടൈപ്പ് ചെയ്യുന്ന ആംഗ്യം'
    },
    {
        id: 19,
        name: 'Hand Heart Gesture',
        en: 'Hand Heart Gesture',
        ml: 'കൈകൊണ്ട് ഹൃദയ ചിഹ്നം',
        meaning: 'രണ്ട് കൈകളും ചേർത്ത് ചൂണ്ടുവിരലുകളും തള്ളവിരലുകളും വളച്ച് ഹൃദയത്തിന്റെ ആകൃതി ഉണ്ടാക്കുക',
        emoji: '🫶',
        category: 'sign',
        howTo: 'Bring both hands together, touching index fingertips at the top and thumb tips at the bottom to form a heart.',
        howToML: 'രണ്ട് കൈകളും ഒന്നിച്ച് ചേർത്ത് ചൂണ്ടുവിരലുകളും തള്ളവിരലുകളും വളച്ച് ഹൃദയത്തിന്റെ ആകൃതി ഉണ്ടാക്കുക.',
        posture: 'Both hands close, thumb tips touching, index fingertips touching in curved arc formation',
        postureML: 'രണ്ട് കൈപ്പത്തികളും ചേർത്ത് ഹൃദയാകൃതിയിലുള്ള മുദ്ര ഉണ്ടാക്കുക'
    },

    // =========================================================================
    // Word / Communication Gestures (20 - 29)
    // =========================================================================

    {
        id: 21,
        name: 'NO',
        en: 'NO',
        ml: 'നോ / ഇല്ല (NO)',
        meaning: 'ചൂണ്ടുവിരൽ മാത്രം നിവർത്തി വശങ്ങളിലേക്ക് ഇടത്തുനിന്നും വലത്തോട്ട് ആവർത്തിച്ച് ആട്ടുക (വാഗിംഗ്)',
        emoji: '☝️',
        category: 'comm',
        howTo: 'Extend your index finger and wag it back and forth side-to-side repeatedly to signal "NO".',
        howToML: 'ചൂണ്ടുവിരൽ മാത്രം നിവർത്തി ഇടത്തോട്ടും വലത്തോട്ടും ആവർത്തിച്ച് ആട്ടി ഇല്ല എന്ന് കാണിക്കുക.',
        posture: 'Index extended, middle-pinky folded, with repeated horizontal side-to-side wagging movement',
        postureML: 'ചൂണ്ടുവിരൽ വശങ്ങളിലേക്ക് ആവർത്തിച്ച് ആട്ടുന്ന ചലനം'
    },
    {
        id: 22,
        name: 'OK',
        en: 'OK',
        ml: 'ഓകെ (OK - Communicative)',
        meaning: 'തള്ളവിരലും ചൂണ്ടുവിരലും വൃത്തത്തിൽ ചേർത്ത് നെഞ്ചിന് മുന്നിൽ അഭിമുഖമായി സമ്മതം അറിയിക്കുക',
        emoji: '👌',
        category: 'comm',
        howTo: 'Form a circle with thumb and index finger and hold it forward at chest level as an affirmative communicative gesture.',
        howToML: 'തള്ളവിരലും ചൂണ്ടുവിരലും വൃത്തത്തിൽ ചേർത്ത് നെഞ്ചിന് മുന്നിൽ മുന്നോട്ട് അഭിമുഖീകരിച്ച് ഓകെ പറയുക.',
        posture: 'Thumb-index circle facing camera at mid-chest communication height with affirmative stability',
        postureML: 'നെഞ്ചിന് മുന്നിൽ മുന്നോട്ട് അഭിമുഖീകരിച്ച് ഓകെ മുദ്ര സ്ഥിരതയോടെ കാണിക്കുക'
    },
    {
        id: 23,
        name: 'Hello',
        en: 'Hello',
        ml: 'ഹലോ (Hello)',
        meaning: 'തുറന്ന കൈപ്പത്തി മുഖത്തിന് സമീപം ഉയർത്തി ശാന്തമായി സൗഹൃദപരമായ അഭിവാദ്യ വീശൽ നടത്തുക',
        emoji: '👋',
        category: 'comm',
        howTo: 'Raise your open palm near your head/face and make a deliberate gentle greeting wave.',
        howToML: 'തുറന്ന കൈപ്പത്തി മുഖത്തിന് സമീപം ഉയർത്തി സൗഹൃദത്തോടെ പതിയെ വീശി ഹലോ പറയുക.',
        posture: 'Open palm raised near face/head (x: 0.35-0.65, y < 0.42) with gentle greeting wave cycle',
        postureML: 'മുഖത്തിന് സമീപം കൈപ്പത്തി ഉയർത്തി ശാന്തമായ അഭിവാദ്യ വീശൽ'
    },
    {
        id: 24,
        name: 'Bye',
        en: 'Bye',
        ml: 'ബൈ (Bye)',
        meaning: 'തുറന്ന കൈപ്പത്തി ഉയർത്തി ഒന്നിലധികം തവണ വേഗത്തിൽ വശങ്ങളിലേക്ക് വീശി യാത്രാമൊഴി ചൊല്ലുക',
        emoji: '👋',
        category: 'comm',
        howTo: 'Raise your open palm and wave back and forth continuously across multiple cycles in a goodbye wave.',
        howToML: 'തുറന്ന കൈപ്പത്തി ഉയർത്തി വേഗത്തിൽ പലതവണ വശങ്ങളിലേക്ക് വീശി ബൈ പറയുക.',
        posture: 'Open palm elevated with continuous multi-cycle rapid horizontal oscillations (>= 4 reversals)',
        postureML: 'കൈപ്പത്തി ഉയർത്തി വേഗത്തിൽ പലതവണ ആവർത്തിച്ച് വീശുന്ന വിടപറയൽ ചലനം'
    },
    {
        id: 25,
        name: 'Come Here',
        en: 'Come Here',
        ml: 'ഇങ്ങോട്ട് വരൂ (Come Here)',
        meaning: 'കൈപ്പത്തി ഉള്ളിലേക്ക് തിരിച്ച് വിരലുകൾ ആവർത്തിച്ച് കൈപ്പത്തിയിലേക്ക് ചുരുട്ടി നിവർത്തി അടുത്തേക്ക് വിളിക്കുക',
        emoji: '🫴',
        category: 'comm',
        howTo: 'With palm facing toward yourself, repeatedly curl your fingers inward toward the palm and extend them to beckon.',
        howToML: 'കൈപ്പത്തി ഉള്ളിലേക്ക് തിരിച്ചുപിടിച്ച് വിരലുകൾ ആവർത്തിച്ച് ഉള്ളിലേക്ക് മടക്കി ഇങ്ങോട്ട് വരൂ എന്ന് കാണിക്കുക.',
        posture: 'Palm facing inward/upward with cyclic curling and extending of index/middle fingers (beckoning motion)',
        postureML: 'വിരലുകൾ ആവർത്തിച്ച് ഉള്ളിലേക്ക് മടക്കി അടുത്തേക്ക് വിളിക്കുന്ന ആംഗ്യം'
    },
    {
        id: 26,
        name: 'Go Away',
        en: 'Go Away',
        ml: 'പോകൂ (Go Away)',
        meaning: 'തുറന്ന കൈപ്പത്തി ശരീരത്തിന് മുന്നിൽ നിന്ന് മുന്നിലേക്കും പുറത്തേക്കും തള്ളിമാറ്റി പോകൂ എന്ന് കാണിക്കുക',
        emoji: '👋',
        category: 'comm',
        howTo: 'With open palm facing outward, push your hand forward and away from your body in a sweeping shooing motion.',
        howToML: 'തുറന്ന കൈപ്പത്തി മുന്നോട്ട് തിരിച്ച് ശരീരത്തിൽ നിന്ന് പുറത്തേക്ക് തള്ളിമാറ്റി പോകൂ എന്ന് കാണിക്കുക.',
        posture: 'Open palm moving outward/forward away from body in a distinct shooing trajectory',
        postureML: 'തുറന്ന കൈപ്പത്തി ശരീരത്തിൽ നിന്ന് മുന്നോട്ട് പുറത്തേക്ക് തള്ളിമാറ്റുന്ന ചലനം'
    },
    {
        id: 27,
        name: 'Stop',
        en: 'Stop',
        ml: 'സ്റ്റോപ്പ് (Stop - Word)',
        meaning: 'തുറന്ന കൈപ്പത്തി മുന്നോട്ട് ശക്തമായി തള്ളി നിശ്ചലമായി നിർത്തി നിൽക്കാൻ ആജ്ഞാപിക്കുക',
        emoji: '🛑',
        category: 'comm',
        howTo: 'Assertively push your open palm forward toward the viewer with fingers extended and hold it firmly to command "Stop".',
        howToML: 'കൈപ്പത്തി തുറന്ന് മുന്നോട്ട് ശക്തമായി തള്ളിപ്പിടിച്ച് നിൽക്കൂ / സ്റ്റോപ്പ് എന്ന് ആജ്ഞാപിക്കുക.',
        posture: 'Open palm with assertive forward thrust motion holding firmly stationary toward camera',
        postureML: 'കൈപ്പത്തി മുന്നോട്ട് ശക്തമായി തള്ളിപ്പിടിച്ച് നിശ്ചലമായി നിൽക്കുന്ന കമാൻഡ്'
    },
    {
        id: 28,
        name: 'Namaste',
        en: 'Namaste',
        ml: 'നമസ്തേ / നന്ദി (Namaste)',
        meaning: 'രണ്ട് കൈപ്പത്തികളും നെഞ്ചിന് മുന്നിൽ കൂപ്പിപ്പിടിച്ച് നമസ്തേ പറയുക (പ്രാർത്ഥനാ മുദ്ര)',
        emoji: '🙏',
        category: 'comm',
        howTo: 'Join both palms together in front of your chest with fingers pointing upward in the traditional Namaste greeting, or touch fingertips to chin and move hand forward to signal Thank You.',
        howToML: 'രണ്ട് കൈപ്പത്തികളും നെഞ്ചിന് മുന്നിൽ ഒന്നിച്ച് കൂപ്പിപ്പിടിച്ച് നമസ്തേ പറയുക (അഞ്ജലി മുദ്ര), അല്ലെങ്കിൽ താടിയിൽ നിന്ന് കൈ മുന്നോട്ട് നീട്ടി നന്ദി കാണിക്കുക.',
        posture: 'Both palms pressed together vertically at chest/chin level (Folded Hands / Namaste posture 🙏)',
        postureML: 'നെഞ്ചിന് മുന്നിൽ രണ്ട് കൈപ്പത്തികളും ഒന്നിച്ച് ചേർത്തുപിടിക്കുക (നമസ്തേ / അഞ്ജലി മുദ്ര)'
    },
    {
        id: 29,
        name: 'Love You',
        en: 'Love You',
        ml: 'ലവ് യു (I Love You Sign)',
        meaning: 'തള്ളവിരലും ചൂണ്ടുവിരലും ചെറുവിരലും നിവർത്തി നടുവിരലും മോതിരവിരലും മടക്കി ILY മുദ്ര കാട്ടുക',
        emoji: '🤟',
        category: 'sign',
        howTo: 'Extend your thumb, index finger, and pinky finger simultaneously, while keeping your middle and ring fingers folded down.',
        howToML: 'തള്ളവിരൽ, ചൂണ്ടുവിരൽ, ചെറുവിരൽ എന്നിവ മാത്രം നിവർത്തി ബാക്കി രണ്ട് വിരലുകൾ മടക്കിപ്പിടിക്കുക (ILY മുദ്ര).',
        posture: 'Thumb extended, Index extended, Pinky extended, Middle folded, Ring folded (official ILY sign)',
        postureML: 'തള്ളവിരൽ, ചൂണ്ടുവിരൽ, ചെറുവിരൽ നിവർത്തി, നടുവിരലും മോതിരവിരലും മടക്കുക'
    }
];

// Helper: Get action by ID
function getActionById(id) {
    if (id === 0) return NO_ACTION;
    return ACTIONS.find(a => a.id === id) || NO_ACTION;
}

// Helper: Get action by exact Name
function getActionByName(name) {
    if (name === 'No Action') return NO_ACTION;
    const lower = name.toLowerCase().trim();
    if (lower === 'thumbs up' || lower === 'thump up') {
        return ACTIONS.find(a => a.id === 7) || NO_ACTION;
    }
    if (lower === 'thumbs down' || lower === 'thumb down') {
        return ACTIONS.find(a => a.id === 8) || NO_ACTION;
    }
    if (lower === 'high five' || lower === 'high-five' || lower === 'highfive' || lower === 'open palm') {
        return ACTIONS.find(a => a.id === 9) || NO_ACTION;
    }
    if (lower === 'eating' || lower === 'eating gesture' || lower === 'eating action') {
        return ACTIONS.find(a => a.id === 16) || NO_ACTION;
    }
    if (lower === 'namaste' || lower === 'namesthe' || lower === 'namaskaram' || lower === 'thank you' || lower === 'thankyou' || lower === 'prayer') {
        return ACTIONS.find(a => a.id === 28) || NO_ACTION;
    }
    return ACTIONS.find(a => a.en.toLowerCase() === lower || a.name.toLowerCase() === lower) || NO_ACTION;
}

// Helper: Get actions by category
function getActionsByCategory(category) {
    if (category === 'all') return ACTIONS;
    return ACTIONS.filter(a => a.category === category);
}

// Helper: Search actions
function filterActions(query) {
    const q = query.toLowerCase().trim();
    return ACTIONS.filter(a => {
        const matchesAlias7 = (a.id === 7 && ('thumbs up'.includes(q) || 'thump up'.includes(q)));
        const matchesAlias8 = (a.id === 8 && ('thumbs down'.includes(q) || 'thumb down'.includes(q)));
        const matchesAlias9 = (a.id === 9 && ('high five'.includes(q) || 'highfive'.includes(q) || 'open palm'.includes(q)));
        const matchesAlias16 = (a.id === 16 && ('eating'.includes(q) || 'eating gesture'.includes(q) || 'eating action'.includes(q)));
        const matchesAlias28 = (a.id === 28 && ('namaste'.includes(q) || 'namesthe'.includes(q) || 'namaskaram'.includes(q) || 'thank you'.includes(q) || 'thankyou'.includes(q)));
        return a.en.toLowerCase().includes(q) || 
               a.ml.toLowerCase().includes(q) || 
               (a.meaning && a.meaning.toLowerCase().includes(q)) || 
               a.category.includes(q) ||
               matchesAlias7 ||
               matchesAlias8 ||
               matchesAlias9 ||
               matchesAlias16 ||
               matchesAlias28;
    });
}
