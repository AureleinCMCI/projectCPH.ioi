import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'Clé manquante' }, { status: 500 });

    // --- CODE DE DÉBOGAGE : LISTER LES MODÈLES ---
    // On demande à Google la liste exacte des modèles autorisés pour votre clé
    const listResp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const listData = await listResp.json();
    
    // On affiche la liste dans le terminal (regardez votre console VS Code !)
    console.log("------------------------------------------------");
    console.log("🔍 MODÈLES DISPONIBLES POUR VOTRE CLÉ :");
    if (listData.models) {
        listData.models.forEach((m: any) => {
            if (m.supportedGenerationMethods.includes("generateContent")) {
                console.log(`👉 ${m.name.replace('models/', '')}`);
            }
        });
    } else {
        console.log("❌ Erreur liste modèles:", listData);
    }
    console.log("------------------------------------------------");
    // ---------------------------------------------

    const genAI = new GoogleGenerativeAI(apiKey);
    const { image } = await req.json();

    if (!image) return NextResponse.json({ error: 'Image manquante' }, { status: 400 });
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");

    // TENTATIVE AVEC LE MODÈLE LE PLUS STANDARD
    // Si celui-ci échoue, regardez la liste dans le terminal pour choisir le bon nom
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const result = await model.generateContent([
      "Tu es un expert OCR. Extrais le texte du résumé au dos de ce livre. Corrige les fautes. Ne réponds QUE le texte.",
      { inlineData: { data: base64Data, mimeType: "image/jpeg" } },
    ]);

    const response = await result.response;
    return NextResponse.json({ text: response.text() });

  } catch (error: any) {
    console.error('❌ Erreur Google Gemini:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}