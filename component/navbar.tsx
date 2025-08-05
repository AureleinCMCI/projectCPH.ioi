"use client";
import { Group, Stack, Text } from "@mantine/core";
import { IconChartPie2, IconHome2, IconSettings, IconWallet } from "@tabler/icons-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { label: "Home", icon: IconHome2, href: "/acceuil" },
  { label: "commande", icon: IconWallet, href: "/commande" },
  { label: "monCompte", icon: IconChartPie2, href: "/compte" },
  { label: "inventaire", icon: IconSettings, href: "/inventaire" }
];

export function BottomNavBar() {
  const pathname = usePathname();
  return (
    <div style={{ 
      position: 'fixed', 
      bottom: 0, 
      left: 0, 
      right: 0, 
      background: "#fff", 
      borderTop: "1px solid #e0e0e0",
      borderTopLeftRadius: 18, 
      borderTopRightRadius: 18,
      padding: "12px 0",
      zIndex: 1000
    }}>
      <Group grow>
        {tabs.map(({ label, icon: Icon, href }) => {
          const active = pathname === href;
          return (
            <Link key={label} href={href} style={{ textDecoration: "none" }}>
              <Stack align="center" justify="center" gap={0} style={{ color: active ? "#a259ff" : "#999", padding: "6px 0" }}>
                <Icon size={28} color={active ? "#a259ff" : "#999"} />
                <Text size="xs" fw={active ? 700 : 400}>{label}</Text>
              </Stack>
            </Link>
          );
        })}
      </Group>
    </div>
  );
}
