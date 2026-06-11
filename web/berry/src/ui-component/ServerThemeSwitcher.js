import { useState, useEffect } from 'react';
import { Avatar, Box, ButtonBase, Menu, MenuItem, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { IconPalette } from '@tabler/icons-react';
import { API } from 'utils/api';
import { isRoot, showSuccess, showError } from 'utils/common';

const THEMES = [
  { key: 'berry', label: 'Berry' },
  { key: 'default', label: 'Default' },
  { key: 'air', label: 'Air' }
];

export default function ServerThemeSwitcher() {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState(null);
  const [currentTheme, setCurrentTheme] = useState('berry');

  useEffect(() => {
    API.get('/api/option/').then((res) => {
      if (res?.data?.success) {
        const opt = res.data.data?.find?.((o) => o.key === 'Theme');
        if (opt) setCurrentTheme(opt.value);
      }
    }).catch(() => {});
  }, []);

  if (!isRoot()) return null;

  const handleSwitch = async (newTheme) => {
    setAnchorEl(null);
    if (newTheme === currentTheme) return;
    const res = await API.put('/api/option/', { key: 'Theme', value: newTheme });
    if (res?.data?.success) {
      showSuccess(`主题已切换为 ${newTheme}，正在刷新...`);
      setTimeout(() => window.location.reload(), 800);
    } else {
      showError(res?.data?.message || '切换失败');
    }
  };

  return (
    <Box sx={{ ml: 1, mr: 1 }}>
      <ButtonBase sx={{ borderRadius: '12px' }} onClick={(e) => setAnchorEl(e.currentTarget)}>
        <Avatar
          variant="rounded"
          sx={{
            ...theme.typography.commonAvatar,
            ...theme.typography.mediumAvatar,
            transition: 'all .2s ease-in-out',
            borderColor: theme.typography.menuChip.background,
            backgroundColor: theme.typography.menuChip.background,
            '&:hover': { background: theme.palette.secondary.dark, color: theme.palette.secondary.light }
          }}
          color="inherit"
        >
          <IconPalette stroke={1.5} size="1.3rem" />
        </Avatar>
      </ButtonBase>
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
        {THEMES.map((t) => (
          <MenuItem key={t.key} selected={t.key === currentTheme} onClick={() => handleSwitch(t.key)}>
            <Typography variant="body2">{t.label}</Typography>
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
}
