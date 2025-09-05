"use client";
import { Text } from "@mantine/core";
import { IconChartBar, IconHome2, IconMenu2, IconSettings, IconWallet, IconX } from "@tabler/icons-react";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useState } from "react";


export function BottomNavBar() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const tabs = [
    { label: "Home", icon: IconHome2, href: "/acceuil" },
    { label: "Commande", icon: IconWallet, href: "/commande" },
    { label: "Mon Compte", href: "/compte", isUser: true },
    { label: "Inventaire", icon: IconSettings, href: "/inventaire" },
    { label: "Statistiques", icon: IconChartBar, href: "/statistique" }
  ];

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };
    return (
    <>
      {/* Burger Button - Fixed en haut à gauche */}
      <div style={{ 
        position: 'fixed', 
        top: '20px', 
        left: '20px', 
        zIndex: 2000,
        background: 'rgba(0, 0, 0, 0.7)',
        borderRadius: '50%',
        padding: '12px',
        cursor: 'pointer',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        transition: 'all 0.3s ease'
      }}
      onClick={toggleMenu}>
        {isMenuOpen ? (
          <IconX size={24} color="white" />
        ) : (
          <IconMenu2 size={24} color="white" />
        )}
      </div>

      {/* Overlay sombre quand le menu est ouvert */}
      {isMenuOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(0, 0, 0, 0.5)',
          zIndex: 1500,
          transition: 'opacity 0.3s ease'
        }}
        onClick={closeMenu} />
      )}

      {/* Menu Burger - Slide depuis la gauche */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: isMenuOpen ? '0' : '-350px',
        width: '320px',
        height: '100vh',
        background: 'linear-gradient(135deg,rgb(0, 1, 4) 0%,rgb(30, 86, 255) 100%)',
        zIndex: 1800,
        transition: 'left 0.3s ease',
        padding: '80px 0 40px 0',
        boxShadow: isMenuOpen ? '5px 0 20px rgba(0, 0, 0, 0.3)' : 'none'
      }}>
        {/* Header du menu avec photo utilisateur */}
        <div style={{
          padding: '0 30px 40px 30px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
          textAlign: 'center'
        }}>
          <Image 
            src="/jeuxdelavie.jpg" 
            alt="avatar" 
            width={60}
            height={60}
            style={{ 
              borderRadius: '50%',
              border: '3px solid rgba(255, 255, 255, 0.3)',
              marginBottom: '15px'
            }}
          />
          <Text size="lg" fw={600} style={{ color: 'white', marginBottom: '5px' }}>
            CPH CMCI
          </Text>
        </div>

        {/* Items du menu */}
        <div style={{ padding: '20px 0' }}>
          {tabs.map(({ label, icon: Icon, href, isUser }) => {
            const active = pathname === href;
            return (
              <Link key={label} href={href} style={{ textDecoration: "none" }} onClick={closeMenu}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '18px 30px',
                  color: active ? '#fff' : 'rgba(255, 255, 255, 0.8)',
                  background: active ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                  borderLeft: active ? '4px solid #fff' : '4px solid transparent',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer'
                }}>
                  {isUser ? (
                    <div style={{ 
                      width: '24px', 
                      height: '24px', 
                      borderRadius: '50%', 
                      background: 'rgba(255, 255, 255, 0.2)',
                      marginRight: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      👤
                    </div>
                  ) : Icon ? (
                    <Icon size={24} style={{ marginRight: '20px' }} />
                  ) : null}
                  <Text size="md" fw={active ? 600 : 400}>
                    {label}
                  </Text>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
