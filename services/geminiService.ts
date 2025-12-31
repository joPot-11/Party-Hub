import { GoogleGenAI, Type } from "@google/genai";
import { UndercoverWordPair } from "../types";

// Fallback data in case API is not available or fails
const FALLBACK_PAIRS: UndercoverWordPair[] = [
  { civilian: "Chien", undercover: "Loup" },
  { civilian: "Café", undercover: "Thé" },
  { civilian: "Facebook", undercover: "Twitter" },
  { civilian: "Piano", undercover: "Guitare" },
  { civilian: "Plage", undercover: "Piscine" },
  { civilian: "Paris", undercover: "Londres" },
];

// Expanded banned list to force originality
const BANNED_WORDS = [
  "Chien", "Loup", "Chat", "Tigre", "Lion", "Ours",
  "Café", "Thé", "Bière", "Vin", "Champagne", "Eau", "Soda", "Jus", "Coca", "Whisky", "Vodka",
  "Facebook", "Twitter", "Instagram", "Tiktok", "Snapchat", "Linkedin",
  "Piano", "Guitare", "Violon", "Trompette", "Batterie",
  "Plage", "Piscine", "Montagne", "Mer", "Océan", "Lac", "Rivière",
  "Paris", "Londres", "New York", "Madrid", "Rome", "Tokyo",
  "Banane", "Pomme", "Fraise", "Orange", "Citron", "Poire",
  "Foot", "Rugby", "Tennis", "Basket", "Handball",
  "Voiture", "Camion", "Moto", "Vélo",
  "Stylo", "Crayon", "Feutre",
  "Chaise", "Fauteuil", "Canapé", "Table"
];

// Invisible sub-themes to force the AI into different latent spaces
const SUB_THEMES = [
  "Un objet technique ou mécanique",
  "Un élément naturel spécifique",
  "Un concept abstrait",
  "Un objet de la cuisine",
  "Un vêtement ou accessoire",
  "Un métier",
  "Un lieu historique",
  "Une émotion",
  "Un outil de bricolage",
  "Un instrument scientifique"
];

const getAIClient = () => {
    if (!process.env.API_KEY) return null;
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const generateUndercoverWords = async (category: string): Promise<UndercoverWordPair> => {
  const ai = getAIClient();
  if (!ai) {
    console.warn("No API Key found. Using fallback.");
    return FALLBACK_PAIRS[Math.floor(Math.random() * FALLBACK_PAIRS.length)];
  }

  try {
    // Pick a random sub-theme to force variety
    const randomSubTheme = SUB_THEMES[Math.floor(Math.random() * SUB_THEMES.length)];
    
    let promptContext = "";
    if (category === "Adultes (18+)") {
      promptContext = `
        THÈME OBLIGATOIRE : Sexe, Spicy, Hot, Coquin, Érotisme, Anatomie intime.
        Tu DOIS générer des mots qui font référence explicitement à la sexualité, aux fantasmes, au corps nu ou à l'intimité.
        
        INTERDICTIONS STRICTES : 
        - ABSOLUMENT AUCUN ALCOOL (Pas de Champagne, Vin, Bière, Cocktail).
        - Pas de drogues.
        - Pas d'insultes vulgaires gratuites.
        
        Le but est d'être coquin/sexy ou lié à l'acte sexuel.
        Exemples valides : 'Menottes / Corde', 'Gode / Vibromasseur', 'Fellation / Cunnilingus', 'Strip-tease / Lap dance', 'Lingerie / Nudité', 'Sodomie / Levrette'.
      `;
    } else {
      promptContext = `
        Catégorie du jeu : ${category}.
        
        POUR VARIER, APPLIQUE CE SOUS-CONTEXTE (si applicable) : "${randomSubTheme}".
        
        Sois créatif, surprenant et difficile. Évite les évidences.
        Cherche des nuances culturelles ou des objets précis.
      `;
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `
        Agis comme un générateur de mots pour le jeu de soirée 'Undercover'.
        LANGUE DE SORTIE : FRANÇAIS (FRENCH) UNIQUEMENT.

        Tâche: Génère UNE paire de mots (Civilian vs Undercover).

        Règles :
        1. LANGUE : Tous les mots DOIVENT être en FRANÇAIS.
        2. Les mots doivent être sémantiquement proches (confusion possible) mais distincts.
        3. ${promptContext}
        4. LISTE NOIRE (Ne JAMAIS utiliser ces mots ou leurs synonymes directs) : ${BANNED_WORDS.join(", ")}.
        5. Le mot 'civilian' est le mot majoritaire.
        6. Le mot 'undercover' est l'intrus.

        Format JSON uniquement.
      `,
      config: {
        temperature: 1.2, // Increased temperature for maximum randomness
        topK: 40,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            civilian: { type: Type.STRING },
            undercover: { type: Type.STRING }
          },
          required: ["civilian", "undercover"]
        }
      }
    });

    if (response.text) {
        return JSON.parse(response.text) as UndercoverWordPair;
    }
    throw new Error("No response text");

  } catch (error) {
    console.error("Gemini API Error:", error);
    return FALLBACK_PAIRS[Math.floor(Math.random() * FALLBACK_PAIRS.length)];
  }
};

export const generatePasswordWords = async (category: string, count: number): Promise<string[]> => {
    const ai = getAIClient();
    if (!ai) return [];

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `
              Agis comme un générateur de mots pour le jeu "Mot de Passe" (faire deviner un mot).
              LANGUE DE SORTIE : FRANÇAIS UNIQUEMENT.
              
              CONTEXTE : Jeu de soirée rapide. Les mots doivent être devinables mais variés.
              CATÉGORIE : ${category}.
              QUANTITÉ : ${count} mots.

              Règles :
              1. Fournis UNIQUEMENT un tableau JSON de chaînes de caractères (string[]).
              2. Pas de doublons.
              3. Des mots simples, composés ou des expressions culturelles connues.
              4. Si la catégorie est "Tout mélangé", sois très éclectique (objets, lieux, concepts, stars).
            `,
            config: {
                temperature: 1.0,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                }
            }
        });

        if (response.text) {
            return JSON.parse(response.text) as string[];
        }
        return [];
    } catch (e) {
        console.error("Gemini Password Generation Error", e);
        return [];
    }
};