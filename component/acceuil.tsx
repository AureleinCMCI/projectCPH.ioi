'use client';

import { jwtDecode } from 'jwt-decode';
import { useEffect, useState } from 'react';
import stylesAcceuil from './style/acceuil.module.css';
import Link from 'next/link';
import { Center } from '@mantine/core';

/*Si l'utilisateur est connecté, il peut accéder à la page d'accueil si il n'est 
pas connecté , l'url de la page d'acceuil renvoie vers la page de connexion*/

export default function Hom() {
  const [userName, setUserName] = useState<string>('');

  useEffect(() => {
    const token = localStorage.getItem('jwt');
    if (!token) {
      window.location.href = '/';
      return;
    }
    try {
      const userData = jwtDecode<{ id: string; name: string }>(token);
      setUserName(userData.name);
    } catch {
      window.location.href = '/';
    }
  }, []);

  return (
// ... existing code ...
<div className={stylesAcceuil.AcceuilGeneral}>
<div className={stylesAcceuil.mainTitle}>CPH INVENTAIRE</div>

<div className={stylesAcceuil.iconContainer}>
  <div className={stylesAcceuil.graduationIcon}>��</div>
</div>

<div className={stylesAcceuil.subtitle}>Gestion de Livres</div>

<div className={stylesAcceuil.description}>
  Système complet de gestion d'inventaire, commandes et réceptions de livres avec scanner de codes-barres intégré.
</div>
<Center>
  <Link href="/commande" className={stylesAcceuil.ctaButton}>
    Commande 
  </Link>

  <Link href="/inventaire" className={stylesAcceuil.ctaButton}>
    Inventaire
  </Link>
  </Center>
</div>
  );
}