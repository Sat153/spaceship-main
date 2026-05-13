-- Seed Caption & Messaging Bank with pre-approved templates
-- Categories: kisan, women, development, general, crisis, event

INSERT INTO message_templates (title, body_english, body_hindi, category, tags) VALUES

-- ============ KISAN ============
(
  'Kisan Samman - Irrigation Achievement',
  'Under the leadership of Ganesh Ji, over 500 farmers in our constituency now have access to reliable irrigation facilities. Our commitment to the farming community continues. 🌾 #KisanSamman #Agriculture',
  'गणेश जी के नेतृत्व में हमारे क्षेत्र के 500 से अधिक किसानों को अब सिंचाई की विश्वसनीय सुविधा मिल रही है। किसान समुदाय के प्रति हमारी प्रतिबद्धता जारी है। 🌾 #किसानसम्मान',
  'kisan',
  ARRAY['irrigation', 'farmers', 'achievement', 'constituency']
),
(
  'Crop Insurance Awareness',
  'Protect your harvest — enroll in Pradhan Mantri Fasal Bima Yojana before the deadline. Visit your nearest bank or CSC center for assistance. Your crop, your security. 🌱',
  'अपनी फसल की रक्षा करें — अंतिम तिथि से पहले प्रधानमंत्री फसल बीमा योजना में नामांकन करें। सहायता के लिए अपने नजदीकी बैंक या CSC केंद्र पर जाएं। आपकी फसल, आपकी सुरक्षा। 🌱',
  'kisan',
  ARRAY['crop insurance', 'PMFBY', 'awareness', 'scheme']
),
(
  'MSP Support Message',
  'Every farmer deserves a fair price for their hard work. We stand firm in our support for Minimum Support Price — because when farmers prosper, the nation prospers. 🚜 #FarmersFirst',
  'हर किसान को अपनी मेहनत का उचित मूल्य मिलना चाहिए। हम न्यूनतम समर्थन मूल्य के समर्थन में दृढ़ हैं — क्योंकि जब किसान समृद्ध होता है, देश समृद्ध होता है। 🚜 #किसानपहले',
  'kisan',
  ARRAY['MSP', 'farmer welfare', 'support price']
),

-- ============ WOMEN ============
(
  'Self Help Group Success Story',
  'Proud moment for our constituency! The women of [Village Name] Self Help Group have achieved financial independence through skill training and micro-finance support. Your success is our inspiration. 💪 #MahilaSashaktikaran',
  'हमारे क्षेत्र के लिए गर्व का क्षण! [ग्राम का नाम] स्वयं सहायता समूह की महिलाओं ने कौशल प्रशिक्षण और सूक्ष्म वित्त सहायता से आर्थिक स्वतंत्रता हासिल की है। आपकी सफलता हमारी प्रेरणा है। 💪 #महिलासशक्तिकरण',
  'women',
  ARRAY['SHG', 'women empowerment', 'self help group', 'financial independence']
),
(
  'Beti Bachao Beti Padhao',
  'Every girl deserves an education, a voice, and a future. Together, let us ensure that no girl in our constituency is denied the opportunity to learn and lead. 📚 #BetiBachao #BetiPadhao',
  'हर बेटी को शिक्षा, आवाज़ और भविष्य का अधिकार है। आइए मिलकर सुनिश्चित करें कि हमारे क्षेत्र की कोई भी बेटी सीखने और नेतृत्व करने के अवसर से वंचित न रहे। 📚 #बेटीबचाओ #बेटीपढ़ाओ',
  'women',
  ARRAY['girl education', 'beti bachao', 'women rights', 'education']
),
(
  'Mahila Suraksha Initiative',
  'The safety and dignity of every woman in our constituency is non-negotiable. We are working closely with local administration to ensure safer villages and streets. 🛡️ #MahilaSuraksha',
  'हमारे क्षेत्र की हर महिला की सुरक्षा और गरिमा अनिवार्य है। हम सुरक्षित गांव और सड़कें सुनिश्चित करने के लिए स्थानीय प्रशासन के साथ मिलकर काम कर रहे हैं। 🛡️ #महिलासुरक्षा',
  'women',
  ARRAY['women safety', 'security', 'dignity', 'administration']
),

-- ============ DEVELOPMENT ============
(
  'Road Construction Update',
  'Progress update: The [Road Name] connecting [Village A] to [Village B] is now 70% complete. Better roads mean better access to markets, hospitals, and schools. Development is happening. 🏗️ #VikasKaarya',
  'प्रगति अपडेट: [गांव A] को [गांव B] से जोड़ने वाली [सड़क का नाम] अब 70% पूरी हो गई है। बेहतर सड़कें मतलब बाजार, अस्पताल और स्कूलों तक बेहतर पहुंच। विकास हो रहा है। 🏗️ #विकासकार्य',
  'development',
  ARRAY['road', 'infrastructure', 'construction', 'village connectivity']
),
(
  'Government Scheme Awareness',
  'Are you aware of the government schemes available to you? From PM Awas Yojana to Ayushman Bharat — our office is ready to help you access every benefit you deserve. Contact us today. 📋',
  'क्या आप अपने लिए उपलब्ध सरकारी योजनाओं से परिचित हैं? PM आवास योजना से लेकर आयुष्मान भारत तक — हमारा कार्यालय आपको हर लाभ दिलाने में मदद के लिए तैयार है। आज संपर्क करें। 📋',
  'development',
  ARRAY['schemes', 'PM Awas', 'Ayushman Bharat', 'awareness', 'government']
),
(
  'Village Development Milestone',
  'Another milestone achieved: [Village Name] now has a fully functional [facility — e.g. community center / primary health center / water supply]. This is what committed development looks like. ✅ #VikasBharat',
  'एक और मील का पत्थर: [गांव का नाम] में अब पूरी तरह कार्यात्मक [सुविधा — जैसे सामुदायिक केंद्र / प्राथमिक स्वास्थ्य केंद्र / जल आपूर्ति] है। यही प्रतिबद्ध विकास दिखता है। ✅ #विकासभारत',
  'development',
  ARRAY['milestone', 'village', 'facility', 'infrastructure', 'achievement']
),

-- ============ GENERAL ============
(
  'Festival Greetings',
  'Warm greetings on this auspicious occasion to all residents of our constituency. May this festival bring joy, prosperity, and togetherness to every home. 🙏',
  'हमारे क्षेत्र के सभी निवासियों को इस शुभ अवसर पर हार्दिक शुभकामनाएं। यह त्योहार हर घर में खुशी, समृद्धि और एकजुटता लाए। 🙏',
  'general',
  ARRAY['festival', 'greetings', 'celebration', 'constituency']
),
(
  'Constituency Office Visit',
  'Our constituency office is open for you every [day], [time]. Come and share your concerns, apply for certificates, or get help with government schemes. Your voice matters. 🏢',
  'हमारा क्षेत्र कार्यालय हर [दिन], [समय] आपके लिए खुला है। आएं और अपनी समस्याएं साझा करें, प्रमाण पत्र के लिए आवेदन करें, या सरकारी योजनाओं में मदद लें। आपकी आवाज़ मायने रखती है। 🏢',
  'general',
  ARRAY['office', 'constituency', 'help', 'schemes', 'contact']
),

-- ============ EVENT ============
(
  'Kisan Sammelan Announcement',
  '📢 You are invited! Kisan Sammelan on [Date] at [Venue], [Time]. Topics: MSP, irrigation, crop insurance, and direct support schemes. All farmers are welcome. Spread the word! 🌾',
  '📢 आप आमंत्रित हैं! [तारीख] को [स्थान], [समय] पर किसान सम्मेलन। विषय: MSP, सिंचाई, फसल बीमा और प्रत्यक्ष सहायता योजनाएं। सभी किसान स्वागत हैं। बात फैलाएं! 🌾',
  'event',
  ARRAY['kisan sammelan', 'event', 'farmers', 'meeting', 'invitation']
),
(
  'Jan Sampark Yatra',
  '🚶 Jan Sampark Yatra — Ganesh Ji will be visiting [Village/Area] on [Date] to listen to your concerns and connect with the community. Come, meet, and be heard. 🙏',
  '🚶 जन संपर्क यात्रा — गणेश जी [तारीख] को [गांव/क्षेत्र] का दौरा करेंगे ताकि आपकी समस्याएं सुन सकें और समुदाय से जुड़ सकें। आएं, मिलें और सुने जाएं। 🙏',
  'event',
  ARRAY['jan sampark', 'yatra', 'visit', 'community', 'public meeting']
);
