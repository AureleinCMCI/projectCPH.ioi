'use client';

import { Text } from '@mantine/core';
import { jwtDecode } from 'jwt-decode';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import styles from './style/monCompte.module.css';

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
    <div className={styles.revolutStyle}>
      {/* Section montant principal */}
      <div className={styles.revolutAmount}>
        <div className={styles.revolutLabel}>Bienvenue {userName}</div>
        <div className={styles.revolutValue}>CPH INVENTAIRE</div>
        <div className={styles.revolutQuickActions}>
          <div className={styles.quickAction}>
            <Link href="/commande" style={{ textDecoration: 'none' }}>
              <div className={styles.revolutdiv}>
                <span>📚</span>
                <div className={styles.quickActionLabel}>Vente de livre</div>
              </div>
            </Link>
          </div>

          <div className={styles.quickAction}>
            <Link href="/inventaire" style={{ textDecoration: 'none' }}>
              <div className={styles.revolutdiv}>
                <span>📋</span>
                <div className={styles.quickActionLabel}>Inventaire</div>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Section description */}
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <Text size="lg" color="dimmed" mb="md">
          Comptez et gérez le stockage des livres et passez des ventes 
          tout en gardant une traçabilité fiable et sécurisée
        </Text>
        <Text size="sm" color="dimmed">
          C&apos;est gratuit pour toujours, avec un nombre illimité d&apos;utilisateurs.
        </Text>
      </div>
    </div>
  );
}