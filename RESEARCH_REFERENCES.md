# Research Paper References — Bharat Yatri (Sahyadri Echoes)

## Project Summary

**Bharat Yatri** is an AI-powered, multilingual, interactive cultural tourism guide for Maharashtra, India. It combines:
- 🗺️ Interactive map (Leaflet) with heritage locations
- 🤖 AI chatbot (Gemini / OpenAI / HuggingFace) for location-specific cultural narration
- 🗣️ Voice interaction — Speech-to-Text (Whisper) & Text-to-Speech (Sarvam AI)
- 🌐 Multilingual support — English, Marathi, Hindi, Gujarati
- 📍 GPS-based nearby places with reverse geocoding
- 🔊 Audio narration of cultural/historical content

---

## Suggested Paper Titles

1. **"Bharat Yatri: An AI-Powered Multilingual Interactive Guide for Cultural Heritage Tourism in Maharashtra"**
2. **"Leveraging Large Language Models and Multilingual TTS for Accessible Cultural Heritage Exploration"**
3. **"Design and Implementation of a Voice-Enabled, Location-Aware Tourist Guide Using Generative AI"**

---

## Reference Papers & Topics to Search

### 1. AI in Cultural Heritage & Tourism

| Search Query | Why It's Relevant |
|---|---|
| `"AI-powered tourism guide" cultural heritage` | Directly related — AI chatbots for tourism |
| `"large language models" cultural heritage preservation` | LLMs for generating cultural narratives |
| `"conversational AI" tourism recommendation system` | AI chatbot architecture for tourist apps |
| `"intelligent tourism system" heritage site` | Broad survey of AI in heritage tourism |

**Key Reference Papers:**
- **Gavalas, D., et al. (2014).** *"Mobile recommender systems in tourism."* Journal of Network and Computer Applications. — Foundational paper on mobile tourism recommendation systems.
- **Ardissono, L., et al. (2012).** *"Context-aware tourist guide systems."* ACM Computing Surveys. — Context-aware tourism systems.
- **Chianese, A., & Piccialli, F. (2014).** *"SmARTweet: A location-based smart application for exhibits and museums."* — AI + location for cultural sites.

---

### 2. Multilingual NLP & Text-to-Speech for Indian Languages

| Search Query | Why It's Relevant |
|---|---|
| `"text-to-speech" Indian languages Indic` | Sarvam TTS for Marathi/Hindi/Gujarati |
| `"multilingual chatbot" low-resource languages India` | Multilingual LLM chat in Indic languages |
| `Sarvam AI Indic language speech synthesis` | Your specific TTS provider |
| `"speech-to-text" Whisper multilingual` | Whisper model for voice input |

**Key Reference Papers:**
- **Radford, A., et al. (2023).** *"Robust Speech Recognition via Large-Scale Weak Supervision"* (OpenAI Whisper paper). — The foundational paper for the STT component.
- **Kakwani, D., et al. (2020).** *"IndicNLPSuite: Monolingual Corpora, Evaluation Benchmarks and Pre-trained Multilingual Language Models for Indian Languages."* — Covers NLP for the exact languages supported.
- **Prakash, A., et al. (2023).** *"AI4Bharat: Accessible AI for Indian languages."* — Directly relevant to Indic language AI.

---

### 3. Location-Based Services & GIS in Tourism

| Search Query | Why It's Relevant |
|---|---|
| `"location-based service" tourism "interactive map"` | Map + GPS-based features |
| `"geolocation" "reverse geocoding" tourism application` | Nominatim reverse geocoding |
| `"GIS" cultural heritage mapping web application` | Interactive heritage mapping |

**Key Reference Papers:**
- **Raper, J., et al. (2007).** *"Applications of Location-Based Services: A Selected Review."* Journal of Location Based Services. — Survey of LBS applications.
- **Steiniger, S., et al. (2006).** *"Foundations of Location Based Services."* CartouCHe Lecture Notes. — Covers geospatial fundamentals.

---

### 4. Generative AI & LLM-Powered Applications

| Search Query | Why It's Relevant |
|---|---|
| `"retrieval augmented generation" domain-specific chatbot` | RAG for cultural knowledge retrieval |
| `"Gemini" OR "GPT" API integration web application` | LLM integration patterns |
| `"prompt engineering" cultural knowledge generation` | How LLMs are prompted for heritage content |

**Key Reference Papers:**
- **Lewis, P., et al. (2020).** *"Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks."* — RAG architecture (relevant to the `searchSangraha` function).
- **Zhao, W.X., et al. (2023).** *"A Survey of Large Language Models."* — Comprehensive LLM survey to cite for the AI backbone.
- **Team Gemini (2024).** *"Gemini: A Family of Highly Capable Multimodal Models."* — The primary LLM used in this project.

---

### 5. Voice-Enabled & Multimodal Interfaces

| Search Query | Why It's Relevant |
|---|---|
| `"voice-enabled" web application "user experience"` | Voice chat UX design |
| `"multimodal interaction" tourism guide speech` | Combining text, voice, map |
| `"silence detection" "voice activity detection" web` | Auto-stop recording feature |

**Key Reference Papers:**
- **McTear, M., et al. (2016).** *"The Conversational Interface: Talking to Smart Devices."* — Covers conversational UI design.
- **Braun, D., et al. (2017).** *"Evaluating Natural Language Understanding Services for Conversational Question Answering Systems."* — Evaluating chatbot quality.

---

### 6. Web Technologies & Real-Time Applications

| Search Query | Why It's Relevant |
|---|---|
| `"Next.js" OR "React" real-time web application architecture` | Tech stack |
| `"progressive web application" tourism offline` | PWA potential for the app |
| `"web-based GIS" Leaflet cultural mapping` | Leaflet map implementation |

---

## Databases to Search

| Database | URL |
|---|---|
| **Google Scholar** | https://scholar.google.com |
| **IEEE Xplore** | https://ieeexplore.ieee.org |
| **ACM Digital Library** | https://dl.acm.org |
| **Springer Link** | https://link.springer.com |
| **arXiv** (preprints) | https://arxiv.org — search `cs.CL`, `cs.AI`, `cs.HC` |
| **Semantic Scholar** | https://www.semanticscholar.org |

---

## Recommended Paper Structure

1. **Introduction** — Digital preservation of cultural heritage, tourism in India
2. **Literature Review** — AI in tourism, multilingual NLP, voice interfaces
3. **System Architecture** — Next.js + Gemini/OpenAI + Sarvam TTS + Whisper STT + Leaflet
4. **Implementation** — API design, prompt engineering, multilingual pipeline
5. **Results & Evaluation** — User study, response quality, TTS accuracy across languages
6. **Conclusion & Future Work** — Expand to more states, offline mode, AR integration
