'use client';

import { Center , Image} from '@mantine/core';
import { jwtDecode } from 'jwt-decode';
import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import stylesAcceuil from './style/acceuil.module.css';

export default function Hom() {
  const [, setUserName] = useState<string>('');
  const [showContent, setShowContent] = useState<boolean>(false);
  const [isNavigating, setIsNavigating] = useState<boolean>(false);
  const [targetPath, setTargetPath] = useState<string>(''); // Stocke le chemin de destination
  const rootRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();

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

  // Écoute la fin de l'animation pour naviguer
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const onAnimEnd = (e: AnimationEvent) => {
      if (isNavigating && targetPath) {
        router.push(targetPath); // Utilise le chemin stocké
      }
    };
    el.addEventListener('animationend', onAnimEnd as EventListener);
    return () => el.removeEventListener('animationend', onAnimEnd as EventListener);
  }, [isNavigating, targetPath, router]);

  const handleStart = () => {
    setShowContent(true);
  };

  const handleNavigate = (e: React.MouseEvent, path: string) => {
    e.preventDefault();
    setTargetPath(path); // Stocke le chemin
    setIsNavigating(true);
    
    // Fallback au cas où animationend ne se déclenche pas
    setTimeout(() => {
      if (isNavigating) router.push(path);
    }, 600);
  };

  return (
    <div 
      ref={rootRef}
      className={`${stylesAcceuil.AcceuilGeneral} ${stylesAcceuil.pageEnter} ${isNavigating ? stylesAcceuil.pageExit : ''}`}
    >
      {/* Petites étoiles filantes */}
      <span className={stylesAcceuil.shootingStar1}></span>
      <span className={stylesAcceuil.shootingStar2}></span>
      <span className={stylesAcceuil.shootingStar3}></span>
      <span className={stylesAcceuil.shootingStar4}></span>
      <span className={stylesAcceuil.shootingStar5}></span>
      <span className={stylesAcceuil.shootingStar6}></span>

      {/* Overlay splash screen galaxie avec bouton START */}
      <div className={`${stylesAcceuil.AcceuilStyle} ${showContent ? stylesAcceuil.slideOut : ''}`}>
        <div className={stylesAcceuil.TextAnimation}>
          <p>Bienvenue sur l'application CPH INVENTAIRE</p>
        </div>
               
        <button 
          className={stylesAcceuil.startButton}
          onClick={handleStart}
          type="button"
        >
          START
        </button>
      </div>

      <div className={`${stylesAcceuil.shadowBox} ${showContent ? stylesAcceuil.visible : ''}`}>
        <div className={stylesAcceuil.mainTitle}>CPH INVENTAIRE</div>

        <div className={stylesAcceuil.iconContainer}>
          <div className={stylesAcceuil.imageContainer} aria-hidden="true">
            {[0,1,2,3,4].map((i) => (
              <div
                key={i}
                className={stylesAcceuil.imageWrapper}
                style={{ ['--d' as any]: `${i * 0.14}s` } as React.CSSProperties}
              >
                <Image
                  src="/zacharias-tanee-fomum.jpg"
                  alt="Livre"
                  width={60}
                  height={60}
                  className={stylesAcceuil.shinyImage}
                />
              </div>
            ))}
          </div>
        </div>
        
        <div className={stylesAcceuil.subtitle}>Gestion de Livres</div>
        
        <div className={stylesAcceuil.description}>
          Système complet de gestion d&apos;inventaire, commandes et réceptions de livres avec scanner de codes-barres intégré.
        </div>
        
        <Center>
          <Link 
            href="/commande" 
            className={stylesAcceuil.ctaButton}
            onClick={(e) => handleNavigate(e, '/commande')}
          >
            Scanner
          </Link>
          <Link 
            href="/inventaire" 
            className={stylesAcceuil.ctaButton}
            onClick={(e) => handleNavigate(e, '/inventaire')}
          >
            Inventaire
          </Link>
        </Center>
      </div>
    </div>
  );
}