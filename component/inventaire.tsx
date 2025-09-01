'use client';

import { Button, Center, Modal, Table } from '@mantine/core';
import Link from 'next/link';
import { useEffect, useState } from 'react';
// @ts-expect-error: Importation du module CSS sans types déclarés
import styles from './style/inventaire.module.css';

type InventaireItem = {
  id: number;
  title: string;
  author: string;
  quantite: number;
  price: number;
  isbn: number;
};
type HistoriqueItem = {
  id: number;
  date_reception: string;
  quantite: number;
  livre_id: {
    title: string;
  };
  name_user: string;
  livre_title: string;
};

export default function Inventaire() {

  const [opened, setOpened] = useState(false);
  const [historique, setHistorique] = useState<HistoriqueItem[]>([]);
  const [user, setUser] = useState<{ admin?: boolean } | null>(null);
  /*Si l'utilisateur n'est pas connecté, il est redirigé vers la page de connexion*/
  useEffect(() => {
    const token = localStorage.getItem('jwt');
    if (!token) {
      window.location.href = '/';
      return;
    }
    try {
      JSON.parse(atob(token.split('.')[1]));
    } catch {
      window.location.href = '/';
    }
  }, []);
  /*Récupération des informations de l'utilisateur*/
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('jwt') : null;
    if (token) {
      try {
        const decoded = JSON.parse(atob(token.split('.')[1]));
        setUser(decoded);
      } catch {
        setUser(null);
      }
    }
  }, []);
  /*Récupération des informations de l'utilisateur*/
  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem('jwt');
      if (!token) return;
      const decoded = JSON.parse(atob(token.split('.')[1]));
      const response = await fetch(`/api/acount?id=${decoded.id}`, { method: 'GET' });
      const result = await response.json();
      setUser(result.data);
    };
    fetchUser();
  }, []);

  /*Récupération des livres en stock*/
  useEffect(() => {
    async function fetchInventaire() {
      const response = await fetch('/api/inventaire');
      const result = await response.json();
      setInventaire(result.data || []);
      setLoading(false);
    }
    fetchInventaire();
  }, []);

  /*Récupération de l'historique des réceptions*/
  useEffect(() => {
    async function RecupereHistorique() {
      const response = await fetch('/api/historiqueResception');
      const result = await response.json();
      console.log('Réponse API historique:', result);
      setHistorique(result.user || []);
    }
    RecupereHistorique();
  }, []);

  /*Téléchargement du fichier CSV*/
  const downloadCSV = () => {
    const header = ["Date", "Utilisateur", "Titre", "Quantité"];
    const rows = historique.map(item => [
      item.date_reception,
      item.name_user,
      item.livre_title,
      item.quantite
    ]);
    const csvContent = [header, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "resception.csv";
    link.click();
    setTimeout(() => window.URL.revokeObjectURL(url), 100);
  };



  return (
    <div className={styles.StyleInventaireGenerale}>
      {/* Section orange en haut - exactement comme l'image */}
      <div className={styles.revolutAmount}>
        <div className={styles.inventaireTitle}>
          <div className={styles.titleLine} style={{position: 'fixed', top: '100px', left: '0', right: '0' , bottom: '400px'}}>INVENTAIRE</div>
        </div>
      </div>

      {/* Section blanche en bas - exactement comme l'image */}
      <div className={styles.productCard} style={{ position: 'fixed', bottom: '0', left: '0', right: '0' ,top: '370px'  }}>
        <div className={styles.productHeader}>
          <div className={styles.productTitle}>Livres en stock</div>
          <div className={styles.productHeart}>📖</div>
        </div>
        
        <div className={styles.productDescription}>
          Gérez votre inventaire de livres, consultez les stocks et l&apos;historique des réceptions
        </div>

        {/* Boutons d'action dans la partie blanche */}
        <Center>
          <div className={styles.featureIcons}>
            {user?.admin === true && (
              <div className={styles.featureIcon}>
                <Link href="/inventaire/ScannerResception" passHref legacyBehavior>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}>
                    <span>➕</span>
                    <div className={styles.featureIconLabel}>Ajouter</div>
                  </div>
                </Link>
              </div>
            )}

            <div className={styles.featureIcon} onClick={() => setOpened(true)}>
              <span>📋</span>
              <div className={styles.featureIconLabel}>Historique</div>
            </div>
          </div>
        </Center>
        {/* Liste des livres */}        
      </div>

      {/* Modal Historique */}
      <Modal opened={opened} onClose={() => setOpened(false)} title="Historique des réceptions" centered size="xxl">
        <Button onClick={downloadCSV} mb="md">Télécharger en CSV</Button>
        <div style={{ overflow: 'auto' }}>
          <Table.ScrollContainer minWidth={900} type="native">
            <Table striped highlightOnHover withColumnBorders>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Date</Table.Th>
                  <Table.Th>Quantité</Table.Th>
                  <Table.Th>Livre</Table.Th>
                  <Table.Th>Utilisateur</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {historique.map((item) => (
                  <Table.Tr key={item.id}>
                    <Table.Td>{item.date_reception}</Table.Td>
                    <Table.Td>{item.quantite}</Table.Td>
                    <Table.Td>{item.livre_title}</Table.Td>
                    <Table.Td>{item.name_user}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </div>
      </Modal>
    </div>
  );
}
