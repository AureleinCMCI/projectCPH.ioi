'use client';

import { Button, Group, Text, Title } from '@mantine/core';
import Link from 'next/link';
import styles from './style/hom.module.css';


export default function Hom() {
  return (
    <div className={styles.odooHome}>
      <Title className={styles.handwrittenTitle} order={1}>
        Bienvenue sur la plateforme de gestion CPH IVENTAIRE
      </Title>
      <Text className={styles.subtitle} size="xl" mt="md" mb="xl">
        Compté et gére le stockage des livres et passé des ventes 
        tous gardans un tracabilités fiables et sécurisées 
      </Text>
      <Group className={styles.group}  mt="md" mb="md">
        <Link href="/commande">
          <Button size="md" color="indigo" radius="xl">
              Vente de livre
          </Button>
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