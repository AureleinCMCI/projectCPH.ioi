'use client';
import { Button, Modal, Table } from '@mantine/core';
import { jwtDecode } from 'jwt-decode';
import { useEffect, useState } from 'react';

import styles from './style/hom.module.css';

import stylesCompte from './style/monCompte.module.css';

// Fonction utilitaire pour formater la date à la française (heure de Paris)
function formatDateTimeParis(dateString: string) {
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = {  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',  second: '2-digit', hour12: false,   timeZone: 'Europe/Paris',};
  const parts = new Intl.DateTimeFormat('fr-FR', options).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value || '';
  return `${get('day')}_${get('month')}_${get('year')} ${get('hour')}.${get('minute')}.${get('second')}`;
}

// Typage du payload du JWT (adapte selon ta structure réelle)
type JwtPayload = {
  id: string;
  name: string;
  admin: boolean;
  [key: string]: unknown;
};

type Commande = {
  id: string;
  date_achat: string;
  title: string;
  quantite: number;
  prix?: number;
  vendeur?: string;
};

export default function UpdateProfile() {
  const [userId, setUserId] = useState<string | null>(null);
  const [user, setUser] = useState<JwtPayload | null>(null);
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [commandeOpened, setCommandeOpened] = useState(false);
  const [infoOpened, setInfoOpened] = useState(false);
  const [livresVendus, setLivresVendus] = useState<Commande[]>([]);


   
  type Profile = {
    id: string;
    name: string;
    password: string;
    updated_at?: string;
    admin?: boolean;
  };
  const [userDetails, setUserDetails] = useState<Profile | null>(null);


  // Lire l'utilisateur connecté via le JWT
  useEffect(() => {
    const token = localStorage.getItem('jwt');
    if (token) {
      try {
        const decoded = jwtDecode<JwtPayload>(token);
        setUserId(decoded.id);
        setUser(decoded);
      } catch {
        setUserId(null);
        setUser(null);
      }
    }
  }, []);

  // Charger les commandes de l'utilisateur connecté
  useEffect(() => {
    const fetchCommandes = async () => {
      const response = await fetch('/api/commande', { method: 'GET' });
      const result = await response.json();
      setCommandes(
        (result.data || []).filter(
          (commande: Commande) => commande.vendeur === user?.name
        )
      );
    };
    if (userId) {
      fetchCommandes();
    }
  }, [userId, user?.name]);


  const handleLogout = () => {
    localStorage.removeItem('jwt');
    window.location.reload();
  };

  const infoCompte = async () => {
    if (!userId) return;
    try {
      const response = await fetch(`/api/acount?id=${userId}`, { method: 'GET' });
      const result = await response.json();
      if (result.data) {
        setUserDetails(result.data);
      }
    } catch {
      console.error('Erreur lors de la récupération des informations du compte', userId);
    }
  };

  useEffect(() => {
    if (userId) {
      infoCompte();
    }
  }, [userId]);

/*  Liste des commandes de l'utilisateur connecté */
const listeCommandesUtilisateur = async () => {
  const response = await fetch(`/api/commande`, { method: 'GET' });
  const result = await response.json();
  const commandesUtilisateur = (result.data || []).filter(
    (commande: Commande) => commande.vendeur === user?.name
  );
  setLivresVendus(commandesUtilisateur);
  setCommandeOpened(true);
}

  return (
    <div className={stylesCompte.monCompteStyle}>
      {/* Header avec photo de profil et recherche */}


      {/* Section montant principal */}
      <div className={stylesCompte.revolutAmount}>
        <div style={{ textAlign: 'center'  , color: 'white' , fontSize: '25px' , opacity: '0.7' , marginTop: '10px' }} className={stylesCompte.nameAccout}>{user?.name}</div>
        
        {/* Section des actions avec icônes orange */}
        <div className={stylesCompte.actionsSection}>
          <div className={stylesCompte.actionItem}>
            <div  onClick={() => setInfoOpened(true)} className={stylesCompte.actionIcon}>👤</div>
            <div  className={stylesCompte.actionText}>Mon Profil</div>
          </div>
          <div className={stylesCompte.actionItem}>
          </div>
          <div className={stylesCompte.actionItem}>
            <div onClick={listeCommandesUtilisateur} className={stylesCompte.actionIcon}>🏆</div>
            <div className={stylesCompte.actionText}>Mes Commandes</div>
          </div>
          <div className={stylesCompte.actionItem}>
          </div>
        </div>
      </div>
      {/* Actions rapides */}


      {/* Liste des dernières commandes */}
      
      {/* Navbar en bas */}
      {/* Navbar en haut */}
     


             {/* Modal des commandes */}
       <Modal opened={commandeOpened} onClose={() => setCommandeOpened(false)} title="Mes Commandes" centered size="xl">
         <div className={styles.tableContainer}>
           <Table.ScrollContainer minWidth={900} type="native">
             <Table striped highlightOnHover withColumnBorders className={styles.tableModern}>
               <Table.Thead>
                 <Table.Tr>
                   <Table.Th>Date</Table.Th>
                   <Table.Th>Utilisateur</Table.Th>
                   <Table.Th>Titre</Table.Th>
                   <Table.Th>Quantité</Table.Th>
                 </Table.Tr>
               </Table.Thead>
               <Table.Tbody>
                 {livresVendus.map((commande) => (
                   <Table.Tr key={commande.id + '-' + commande.title}>
                     <Table.Td>
                       {commande.date_achat ? formatDateTimeParis(commande.date_achat) : ''}
                     </Table.Td>
                     <Table.Td>{commande.vendeur}</Table.Td>
                     <Table.Td>{commande.title}</Table.Td>
                     <Table.Td>{commande.quantite}</Table.Td>
                   </Table.Tr>
                 ))}
               </Table.Tbody>
             </Table>
           </Table.ScrollContainer>
         </div>
       </Modal>

       {/* Modal des informations du compte */}
       <Modal style={{ backgroundColor: 'transparent' }} opened={infoOpened} onClose={() => setInfoOpened(false)} title="Informations du Compte" centered>
         <div style={{ padding: '20px' }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '20px' }}>
             <div>
               <h3 style={{ margin: '0 0 10px 0', color: '#333' }}>{user?.name}</h3>
               <p style={{ margin: '0', color: '#666' }}>ID: {user?.id}</p>
               <p style={{ margin: '0', color: '#666' }}>
                 Statut: {user?.admin ? 'Administrateur' : 'Utilisateur'}
               </p>
             </div>
           </div>

           <div className={stylesCompte.moncomptedetail}>
             <h4 className={stylesCompte.moncomptedetailh4}>Détails du compte</h4>
             <div className={stylesCompte.moncomptedetaildiv}>
               <div className={stylesCompte.moncomptedetaildivspan}>
                 <span className={stylesCompte.moncomptedetailspan}>Nom:</span>
                 <span>{userDetails?.name || user?.name}</span>
               </div>
               <div className={stylesCompte.moncomptedetaildivspan}>
                 <span className={stylesCompte.moncomptedetailspan}>Admin:</span>
                 <span>{user?.admin ? 'Oui' : 'Non'}</span>
               </div>
               <div className={stylesCompte.moncomptedetaildivspan}>
                 <span className={stylesCompte.moncomptedetailspan}>Commandes:</span>
                 <span>{commandes.length}</span>
               </div>
               {userDetails?.updated_at && (
                 <div className={stylesCompte.moncomptedetaildivspan}>
                   <span className={stylesCompte.moncomptedetailspan}>Dernière mise à jour:</span>
                   <span>{formatDateTimeParis(userDetails.updated_at)}</span>
                 </div>
               )}
             </div>
           </div>
           
           <div className={stylesCompte.moncomptedetailbutton}>
             <Button 
               onClick={handleLogout} 
               variant="outline" 
               color="red"
               className={stylesCompte.moncomptedetailbutton}
             >
               Déconnexion
             </Button>
           </div>
         </div>
               </Modal>

        
     </div>
   );
 }
