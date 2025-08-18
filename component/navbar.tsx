"use client";
import { Group, Stack, Text } from "@mantine/core";
import { IconHome2, IconSettings, IconWallet, IconChartBar } from "@tabler/icons-react";
import { jwtDecode } from "jwt-decode";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export function BottomNavBar() {
  const pathname = usePathname();
  const [userPhoto, setUserPhoto] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('jwt');
    if (token) {
      try {
        const decoded = jwtDecode<{ id: string; name: string; photo?: string }>(token);
        setUserPhoto(decoded.photo || null);
      } catch {
        setUserPhoto(null);
      }
    }
  }, []);

  const tabs = [
    { label: "Home", icon: IconHome2, href: "/acceuil" },
    { label: "commande", icon: IconWallet, href: "/commande" },
    { label: "monCompte", href: "/compte", isUser: true },
    { label: "inventaire", icon: IconSettings, href: "/inventaire" },
    { label: "statistique", icon: IconChartBar, href: "/statistique" }
  ];
  return (
    <div style={{ 
      /*navbar fixe en haut*/
      position: 'fixed', 
      top: 0, 
      left: 0, 
      right: 0, 
      background: "rgba(255, 255, 255, 0.0)", 
      padding: "12px 0",
      zIndex: 1000,
    }}>
             <Group grow>
         {tabs.map(({ label, icon: Icon, href, isUser }) => {
           const active = pathname === href;
           return (
             <Link key={label} href={href} style={{ textDecoration: "none" }}>
               <Stack align="center" justify="center" gap={0} style={{ color: active ? "#a259ff" : "#999", padding: "6px 0" }}>
                 {isUser ? (
                   <Image src={userPhoto || '/img/avatar.png'} alt="avatar" width={28}
                     height={28}
                     style={{ 
                       borderRadius: '50%',
                       border: active ? '2px solid #a259ff' : '2px solid transparent'
                     }}
                   />
                                   ) : Icon ? (
                    <Icon size={28} color={active ? "#a259ff" : "#999"} />
                  ) : null}
                 <Text size="xs" fw={active ? 700 : 400}>{label}</Text>
               </Stack>
             </Link>
           );
         })}
       </Group>
    </div>
  );
}
