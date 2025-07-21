import { ActionIcon,Avatar, Box, Code,Group, Menu, Text,TextInput,Tooltip, UnstyledButton} from '@mantine/core';
import { IconBulb, IconPlus, IconSearch } from '@tabler/icons-react';
import { jwtDecode } from 'jwt-decode';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import classes from './style/nav.module.css';

// Typage du payload du JWT (adapte selon ta structure réelle)
type JwtPayload = {
  id: string;
  name: string;
  avatar?: string;
  [key: string]: unknown;
};

const links = [
  { icon: IconBulb, label: 'inventaire', href: '/inventaire' },
  { icon: IconBulb, label: 'acceuil', href: '/acceuil' },
  { icon: IconBulb, label: 'commande', href: '/commande' },
];

const mainLinks = links.map((link) => (
  <Link key={link.label} href={link.href} passHref legacyBehavior>
    <UnstyledButton className={classes.mainLink} component="a">
      <div className={classes.mainLinkInner}>
        <link.icon size={20} className={classes.mainLinkIcon} stroke={1.5} />
        <span className={classes.a}>{link.label}</span>
      </div>
    </UnstyledButton>
  </Link>
));


export function UserMenu() {
  const [user, setUser] = useState<JwtPayload | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('jwt') : null;
    if (token) {
      try {
        const decoded = jwtDecode<JwtPayload>(token);
        setUser(decoded);
      } catch {
        setUser(null);
      }
    }
  }, []);

  const userId = user?.id;
  const fetchAvatar = async () => {
    if (!userId) return;
    try {
      const response = await fetch(`/api/acount?id=${userId}`, { method: 'GET' });
      const result = await response.json();
      if (result.data && result.data.photo) {
        setAvatarPreview(result.data.photo);
      }
    } catch {
      console.error('Erreur lors de la récupération de la photo', userId);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchAvatar();
    }
  }, [userId]);

  if (!user) return null;

  return (
    <Menu shadow="md" width={200} position="bottom-end">
      <Menu.Target>
        <UnstyledButton>
          <Group gap="sm">
            <Avatar src={avatarPreview || user?.photo || '/img/avatar.png'} radius="xl" />
            <div style={{ lineHeight: 1 }}>
              <Text size="sm" fw={500}>{user.name}</Text>
            </div>
          </Group>
        </UnstyledButton>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item component="a" href="/compte">Mon compte</Menu.Item>
        <Menu.Item  component="a" href="/" color="red">Déconnexion</Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}

export function NavbarSearch() {
  return (
    <nav className={classes.navbar}>
      <div className={classes.section}>
      </div>
      <Box p="md">
        <UserMenu />
      </Box>
      <TextInput
        placeholder="Search"
        size="xs"
        leftSection={<IconSearch size={12} stroke={1.5} />}
        rightSectionWidth={70}
        rightSection={<Code className={classes.searchCode}>Ctrl + K</Code>}
        styles={{ section: { pointerEvents: 'none' } }}
        mb="sm"
      />

      <div className={classes.section}>
        <div className={classes.mainLinks}>{mainLinks}</div>
      </div>

      <div className={classes.section}>
        <Group className={classes.collectionsHeader} justify="space-between">
          <Text size="xs" fw={500} c="dimmed">
            Collections
          </Text>
          <Tooltip label="Create collection" withArrow position="right">
            <ActionIcon variant="default" size={18}>
              <IconPlus size={12} stroke={1.5} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </div>
    </nav>
  );
}