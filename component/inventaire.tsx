'use client';

import { Button, Center, Loader, Modal, Table, TextInput } from '@mantine/core';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import styles from './style/monCompte.module.css';

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

  const [inventaire, setInventaire] = useState<InventaireItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [opened, setOpened] = useState(false);
  const [historique, setHistorique] = useState<HistoriqueItem[]>([]);
  const [user, setUser] = useState<{ admin?: boolean } | null>(null);
  /*Si l'utilisateur n'est pas connecté, il est redirigé vers la page de connexion*/
  const [search, setSearch] = useState('');
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

  const filteredInventaire = inventaire.filter((item) =>
    (item.title ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (item.author ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={styles.revolutStyle}>
      {/* Section montant principal */}
      <div className={styles.revolutAmount}>
        <div className={styles.revolutLabel}>Inventaire</div>
        <div className={styles.revolutValue}>{inventaire.length}</div>
        <div className={styles.revolutQuickActions}>
          {user?.admin === true && (
            <div className={styles.quickAction}>
              <Link href="/inventaire/ScannerResception" passHref legacyBehavior>
                <div className={styles.revolutdiv}>
                  <span>➕</span>
                  <div className={styles.quickActionLabel}>Ajouter</div>
                </div>
              </Link>
            </div>
          )}

          <div className={styles.quickAction}>
            <div onClick={() => setOpened(true)} className={styles.revolutButton}>
              <span>📋</span>
              <div className={styles.quickActionLabel}>Historique</div>
            </div>
          </div>
        </div>
      </div>

      {/* Barre de recherche */}
      <div style={{ padding: '0 20px', marginBottom: '20px' }}>
        <TextInput
          placeholder="Rechercher un livre..."
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          className={styles.searchInput}
        />
      </div>

      {/* Liste des livres */}
      <div className={styles.transactionsList}>
        {loading ? (
          <Center>
            <Loader />
          </Center>
        ) : (
          filteredInventaire.map((item) => (
            <div key={item.id} className={styles.transaction}>
              <div className={styles.transactionIcon}>📚</div>
              <div className={styles.transactionInfo}>
                <div className={styles.transactionTitle}>{item.title}</div>
                <div className={styles.transactionTime}>
                  👤 {item.author} | 📖 ISBN: {item.isbn}
                </div>
              </div>
              <div className={styles.transactionAmount}>
                <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
                  {item.quantite}x
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  {item.price}€
                </div>
              </div>
            </div>
          ))
        )}
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
