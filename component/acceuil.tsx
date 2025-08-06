'use client';

import { Button, Center, Group, Text, Title } from '@mantine/core';
import { jwtDecode } from 'jwt-decode';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import styles from './style/hom.module.css';
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
    <div className={styles.odooHome}>
      <Title className={styles.handwrittenTitle} order={1}>
        Bienvenue {userName} sur la plateforme de gestion CPH IVENTAIRE
      </Title>
      <Text className={styles.subtitle} size="xl" mt="md" mb="xl">
        Compté et gére le stockage des livres et passé des ventes 
        tous gardans un tracabilités fiables et sécurisées 
      </Text>
      <Group className={styles.group}  mt="md" mb="md">
        <Link href="/commande">
        <Center>  
          <Button size="md" color="indigo" radius="xl">
              Vente de livre
          </Button>
          </Center>
        </Link>
        <Link href="/inventaire">
          <Button size="md" variant="outline" color="indigo" radius="xl">
            Accéder à l&apos;inventaire
          </Button>
        </Link>
      </Group>
      <Text className={styles.homText} color="dimmed" size="sm" mt="xs">
        C’est gratuit pour toujours, avec un nombre illimité d’utilisateurs.
      </Text>
      </div>
  );
}