import { createClient } from '@/lib/supabase/clients';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import type { NextRequest } from 'next/server';

// À remplacer par une vraie clé secrète, idéalement dans une variable d'environnement
const JWT_SECRET: string = process.env.JWT_SECRET || 'votre_cle_secrete_ultra_longue';

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const supabase = createClient();
    const { name, password }: { name: string; password: string } = await request.json();
    console.log('Tentative de connexion avec :', name, password);

    // Recherche de l'utilisateur par nom uniquement
    const { data, error } = await supabase.from('USER').select('*').eq('name', name).maybeSingle();

    console.log('Résultat Supabase :', data, error);

    if (error) {
      console.error('Erreur Supabase :', error);
      return new Response(JSON.stringify({ error: error.message }), { status: 400 });
    }
    if (!data) {
      return new Response(JSON.stringify({ error: 'Nom ou mot de passe incorrect', success: false }), { status: 401 });
    }

    // Vérification du mot de passe hashé
    console.log('🔒 Mot de passe saisi:', password);
    console.log('🔒 Hash en base:', data.password?.substring(0, 20) + '...');
    
    const passwordMatch = await bcrypt.compare(password, data.password);
    console.log('🔑 Correspondance mot de passe:', passwordMatch);

    if (!passwordMatch) {
      console.log('❌ Hash ne correspond pas, test en clair...');
      // Si le hash ne correspond pas, on tente la comparaison en clair
      if (password === data.password) {
        console.log('✅ Mot de passe en clair correspond, migration du hash...');
        // Si c'est bon, on migre le mot de passe en base
        const hashedPassword = await bcrypt.hash(password, 10);
        await supabase
          .from('USER')
          .update({ password: hashedPassword })
          .eq('id', data.id);
      } else {
        console.log('❌ Mot de passe incorrect (ni hash ni clair)');
        return new Response(JSON.stringify({ error: 'Nom ou mot de passe incorrect', success: false }), { status: 401 });
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...userWithoutPassword } = data;
    const token = jwt.sign(
      {
        id: userWithoutPassword.id,
        name: userWithoutPassword.name,
        // Ajoute d'autres infos si besoin
      },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    return new Response(JSON.stringify({
      message: 'Connexion réussie !',
      user: userWithoutPassword,
      token, // Le jeton JWT est renvoyé ici
      success: true
    }), { status: 200 });
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error('Erreur serveur :', err.message);
      return new Response(JSON.stringify({ error: 'Erreur serveur', details: err.message }), { status: 500 });
    }
    console.error('Erreur serveur :', err);
    return new Response(JSON.stringify({ error: 'Erreur serveur', details: err instanceof Error ? err.message : 'Erreur inconnue' }), { status: 500 });
  }
}
