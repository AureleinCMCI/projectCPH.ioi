'use client';
import { Button, Modal, Table, TextInput, Title } from '@mantine/core';
import { jwtDecode } from 'jwt-decode';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import Webcam from 'react-webcam';
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
  avatar?: string;
  photo?: string;
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
  // const [name, setName] = useState<string>(''); // supprimé car non utilisé
  const [userId, setUserId] = useState<string | null>(null);
  const [user, setUser] = useState<JwtPayload | null>(null);
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [commandeOpened, setCommandeOpened] = useState(false);
  const [avatarOpened, setAvatarOpened] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const webcamRef = useRef<Webcam>(null);
  const [showWebcam, setShowWebcam] = useState(false);
  type Profile = {
    id: string;
    name: string;
    password: string;
    updated_at?: string;
    photo?: string;
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
        // setName(decoded.name); // supprimé car non utilisé
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

  // Capture la photo  depuis la webcam
  const capture = () => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      if (imageSrc) {
        setAvatarPreview(imageSrc);
        setShowWebcam(false);
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('jwt');
    window.location.reload();
  };
  /* Récupère la photo de l'utilisateur connecté */
  const fetchAvatar = async () => {
    if (!userId) return;
    try {
      const response = await fetch(`/api/acount?id=${userId}`, { method: 'GET' });
      const result = await response.json();
      if (result.data && result.data.photo && !avatarPreview) {
        setAvatarPreview(result.data.photo);
      }
    } catch {
      console.error('Erreur lors de la récupération de la photo', userId);
      // Optionnel : gestion d'erreur
    }
  };

  useEffect(() => {
    if (userId) {
      fetchAvatar();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

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

  return (
    <div>
      <Title order={2}>Information du compte</Title>
      <div className={stylesCompte.containerCompte}>
        {/* Colonne gauche : menu/avatar */}
        <div className={stylesCompte.menuCompte}>
          <button
            type="button"
            onClick={() => setAvatarOpened(true)}
            className={stylesCompte.avatarButton}
          >
            <Image
              src={avatarPreview || user?.photo || '/img/avatar.png'}
              alt="avatar"
              width={130}
              height={130}
              className={stylesCompte.avatarCompte}
            />
            <div style={{ color: '#868e96', fontSize: 14, marginBottom: 24 }}>
              Cliquez pour changer la photo
            </div>
          </button>
          <div className={stylesCompte.menuLinks}>
            <button className={`${stylesCompte.menuLink} active`}>Détails du compte</button>
            <button className={stylesCompte.menuLink}>Adresse de livraison</button>
            <button className={stylesCompte.menuLink}>Méthodes de paiement</button>
          </div>
        </div>
        {/* Modale pour changer l'avatar */}
        <Modal opened={avatarOpened} onClose={() => setAvatarOpened(false)} title="Changer l'avatar" centered>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            {showWebcam ? (
              <>
                <Webcam
                  audio={false}
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  videoConstraints={{ facingMode: 'user' }}
                  style={{ width: 250, borderRadius: 8 }}
                />
                <Button mt="md" onClick={capture}>Prendre une photo</Button>
                <Button mt="md" variant="outline" color="gray" onClick={() => setShowWebcam(false)}>
                  Annuler
                </Button>
              </>
            ) : (
              <>
                <input
                  type="file"
                  accept="image/*"
                  capture="user"
                  onChange={e => {
                    if (e.target.files && e.target.files[0]) {
                      setAvatarPreview(URL.createObjectURL(e.target.files[0]));
                    }
                  }}
                />
                <Button mt="md" onClick={() => setShowWebcam(true)}>
                  Ouvrir la caméra
                </Button>
              </>
            )}
            {avatarPreview && (
              <Image
                src={avatarPreview}
                alt="Aperçu avatar"
                width={130}
                height={130}
                className={stylesCompte.avatarCompte}
              />
            )}
            {/* Ici tu pourras ajouter le bouton pour sauvegarder l'avatar */}
          </div>
        </Modal>
        {/* Colonne droite : infos */}
        <div className={stylesCompte.containerCompteInfo}>
          <div className={stylesCompte.containerCompteInfoItem}>
            <TextInput label="Name" value={userDetails?.name} readOnly className={stylesCompte.textInput} />
            <TextInput label="Admin" value={userDetails?.admin === true ? 'oui' : 'non'} readOnly className={stylesCompte.textInput} />
          </div>
          <Link href="/">
            <button className={stylesCompte.buttonCommande} onClick={handleLogout} style={{ marginLeft: 8 }}>
              Déconnexion
            </button>
          </Link>
          <button className={stylesCompte.buttonCommande} onClick={() => setCommandeOpened(true)}>
            Voir mes commandes
          </button>
        </div>
        <Modal opened={commandeOpened} onClose={() => setCommandeOpened(false)} title="Commandes" centered size="xxl">
          <div className={styles.tableContainer}>
            <Table.ScrollContainer minWidth={900} type="native">
              <Table striped highlightOnHover withColumnBorders className={styles.tableModern}>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Date</Table.Th>
                    <Table.Th>Utilisateur</Table.Th>
                    <Table.Th>title</Table.Th>
                    <Table.Th>Quantité</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {commandes.map((commande) => (
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
      </div>
    </div>
  );
}
