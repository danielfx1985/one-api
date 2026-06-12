import { useDispatch, useSelector } from 'react-redux';
import { Outlet } from 'react-router-dom';
import AuthGuard from 'utils/route-guard/AuthGuard';
import { useState, useEffect } from 'react';

// material-ui
import { styled, useTheme } from '@mui/material/styles';
import { AppBar, Box, CssBaseline, Toolbar, useMediaQuery, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Typography, Alert } from '@mui/material';
import { LockOutlined } from '@mui/icons-material';
import AdminContainer from 'ui-component/AdminContainer';
import { API } from 'utils/api';

// project imports
import Breadcrumbs from 'ui-component/extended/Breadcrumbs';
import Header from './Header';
import Sidebar from './Sidebar';
import navigation from 'menu-items';
import { drawerWidth } from 'store/constant';
import { SET_MENU } from 'store/actions';

// assets
import { IconChevronRight } from '@tabler/icons-react';

// styles
const Main = styled('main', { shouldForwardProp: (prop) => prop !== 'open' })(({ theme, open }) => ({
  ...theme.typography.mainContent,
  borderBottomLeftRadius: 0,
  borderBottomRightRadius: 0,
  transition: theme.transitions.create(
    'margin',
    open
      ? {
          easing: theme.transitions.easing.easeOut,
          duration: theme.transitions.duration.enteringScreen
        }
      : {
          easing: theme.transitions.easing.sharp,
          duration: theme.transitions.duration.leavingScreen
        }
  ),
  [theme.breakpoints.up('md')]: {
    marginLeft: open ? 0 : -(drawerWidth - 20),
    width: `calc(100% - ${drawerWidth}px)`
  },
  [theme.breakpoints.down('md')]: {
    marginLeft: '20px',
    width: `calc(100% - ${drawerWidth}px)`,
    padding: '16px'
  },
  [theme.breakpoints.down('sm')]: {
    marginLeft: '10px',
    width: `calc(100% - ${drawerWidth}px)`,
    padding: '16px',
    marginRight: '10px'
  }
}));

// ==============================|| MAIN LAYOUT ||============================== //

const MainLayout = () => {
  const theme = useTheme();
  const matchDownMd = useMediaQuery(theme.breakpoints.down('md'));
  const leftDrawerOpened = useSelector((state) => state.customization.opened);
  const account = useSelector((state) => state.account);
  const dispatch = useDispatch();
  const handleLeftDrawerToggle = () => {
    dispatch({ type: SET_MENU, opened: !leftDrawerOpened });
  };

  const [accessCodeOpen, setAccessCodeOpen] = useState(false);
  const [accessCode, setAccessCode] = useState('');
  const [accessCodeError, setAccessCodeError] = useState('');
  const [accessCodeLoading, setAccessCodeLoading] = useState(false);

  useEffect(() => {
    const siteInfo = JSON.parse(localStorage.getItem('siteInfo') || '{}');
    const isAdmin = account.user?.role >= 10;
    const verified = sessionStorage.getItem('access_code_verified');
    if (siteInfo.access_code_enabled && account.user && !isAdmin && !verified) {
      setAccessCodeOpen(true);
    }
  }, [account.user]);

  const handleVerifyAccessCode = async () => {
    if (!accessCode.trim()) { setAccessCodeError('请输入访问码'); return; }
    setAccessCodeLoading(true);
    try {
      const res = await API.post('/api/user/verify_access', { code: accessCode });
      const { success, message } = res.data;
      if (success) {
        sessionStorage.setItem('access_code_verified', '1');
        setAccessCodeOpen(false);
        setAccessCode('');
        setAccessCodeError('');
      } else {
        setAccessCodeError(message || '访问码错误');
      }
    } catch (_) {
      setAccessCodeError('验证失败，请重试');
    }
    setAccessCodeLoading(false);
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      {/* header */}
      <AppBar
        enableColorOnDark
        position="fixed"
        color="inherit"
        elevation={0}
        sx={{
          bgcolor: theme.palette.background.default,
          transition: leftDrawerOpened ? theme.transitions.create('width') : 'none'
        }}
      >
        <Toolbar>
          <Header handleLeftDrawerToggle={handleLeftDrawerToggle} />
        </Toolbar>
      </AppBar>

      {/* drawer */}
      <Sidebar drawerOpen={!matchDownMd ? leftDrawerOpened : !leftDrawerOpened} drawerToggle={handleLeftDrawerToggle} />

      {/* main content */}
      <Main theme={theme} open={leftDrawerOpened}>
        {/* breadcrumb */}
        <Breadcrumbs separator={IconChevronRight} navigation={navigation} icon title rightAlign />
        <AuthGuard>
          <AdminContainer>
            <Outlet />
          </AdminContainer>
        </AuthGuard>
      </Main>

      {/* 访问码验证弹窗 */}
      <Dialog open={accessCodeOpen} disableEscapeKeyDown maxWidth="xs" fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ textAlign: 'center', pt: 3 }}>
          <LockOutlined sx={{ fontSize: 40, color: 'primary.main', mb: 1, display: 'block', mx: 'auto' }} />
          <Typography variant="h3">需要访问码</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            请输入管理员设置的访问码以继续使用
          </Typography>
        </DialogTitle>
        <DialogContent>
          {accessCodeError && <Alert severity="error" sx={{ mb: 2 }}>{accessCodeError}</Alert>}
          <TextField
            fullWidth autoFocus type="password" label="访问码" value={accessCode}
            onChange={(e) => { setAccessCode(e.target.value); setAccessCodeError(''); }}
            onKeyDown={(e) => e.key === 'Enter' && handleVerifyAccessCode()}
            variant="outlined"
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button fullWidth variant="contained" size="large" disabled={accessCodeLoading}
            onClick={handleVerifyAccessCode}>
            {accessCodeLoading ? '验证中…' : '确认'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MainLayout;
