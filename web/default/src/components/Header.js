import React, { useContext, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserContext } from '../context/User';
import { useTranslation } from 'react-i18next';

import {
  Button,
  Container,
  Dropdown,
  Icon,
  Menu,
  Segment,
} from 'semantic-ui-react';
import {
  API,
  getLogo,
  getSystemName,
  isAdmin,
  isRoot,
  isMobile,
  showSuccess,
  showError,
} from '../helpers';
import '../index.css';

// Header Buttons
let headerButtons = [
  {
    name: 'header.channel',
    to: '/channel',
    icon: 'sitemap',
    admin: true,
  },
  {
    name: 'header.token',
    to: '/token',
    icon: 'key',
  },
  {
    name: 'header.redemption',
    to: '/redemption',
    icon: 'dollar sign',
    admin: true,
  },
  {
    name: 'header.topup',
    to: '/topup',
    icon: 'cart',
  },
  {
    name: 'header.user',
    to: '/user',
    icon: 'user',
    admin: true,
  },
  {
    name: 'header.dashboard',
    to: '/dashboard',
    icon: 'chart bar',
  },
  {
    name: 'header.log',
    to: '/log',
    icon: 'book',
  },
  {
    name: 'header.setting',
    to: '/setting',
    icon: 'setting',
  },
  {
    name: 'header.about',
    to: '/about',
    icon: 'info circle',
  },
];

if (localStorage.getItem('chat_link')) {
  headerButtons.splice(1, 0, {
    name: 'header.chat',
    to: '/chat',
    icon: 'comments',
  });
}

const Header = () => {
  const { t, i18n } = useTranslation();
  const [userState, userDispatch] = useContext(UserContext);
  let navigate = useNavigate();

  const [showSidebar, setShowSidebar] = useState(false);
  const systemName = getSystemName();
  const logo = getLogo();

  async function logout() {
    setShowSidebar(false);
    await API.get('/api/user/logout');
    showSuccess('注销成功!');
    userDispatch({ type: 'logout' });
    localStorage.removeItem('user');
    sessionStorage.removeItem('access_code_verified');
    navigate('/login');
  }

  const toggleSidebar = () => {
    setShowSidebar(!showSidebar);
  };

  const renderButtons = (isMobile) => {
    const userIsAdmin = isAdmin();
    return headerButtons.map((button) => {
      if (!userIsAdmin) {
        if (button.to !== '/token') return <></>;
      } else {
        if (button.admin && !userIsAdmin) return <></>;
        if (button.root && !isRoot()) return <></>;
      }
      if (isMobile) {
        return (
          <Menu.Item
            key={button.name}
            onClick={() => {
              navigate(button.to);
              setShowSidebar(false);
            }}
            style={{ fontSize: '15px' }}
          >
            {t(button.name)}
          </Menu.Item>
        );
      }
      return (
        <Menu.Item
          key={button.name}
          as={Link}
          to={button.to}
          style={{
            fontSize: '15px',
            fontWeight: '400',
            color: '#666',
          }}
        >
          <Icon name={button.icon} style={{ marginRight: '4px' }} />
          {t(button.name)}
        </Menu.Item>
      );
    });
  };

  // Add language switcher dropdown
  const languageOptions = [
    { key: 'zh', text: '中文', value: 'zh' },
    { key: 'en', text: 'English', value: 'en' },
  ];

  const changeLanguage = (language) => {
    i18n.changeLanguage(language);
  };

  const themeOptions = [
    { key: 'berry', text: 'Berry', value: 'berry', icon: 'star' },
    { key: 'default', text: 'Default', value: 'default', icon: 'theme' },
    { key: 'air', text: 'Air', value: 'air', icon: 'wind' },
  ];

  const switchTheme = async (newTheme) => {
    const res = await API.put('/api/option/', { key: 'Theme', value: newTheme });
    if (res?.data?.success) {
      showSuccess(`主题已切换为 ${newTheme}，正在刷新...`);
      setTimeout(() => window.location.reload(), 800);
    } else {
      showError(res?.data?.message || '切换主题失败');
    }
  };

  if (isMobile()) {
    return (
      <>
        <Menu
          borderless
          size='large'
          style={
            showSidebar
              ? {
                  borderBottom: 'none',
                  marginBottom: '0',
                  borderTop: 'none',
                  height: '51px',
                }
              : { borderTop: 'none', height: '52px' }
          }
        >
          <Container
            style={{
              width: '100%',
              maxWidth: isMobile() ? '100%' : '1200px',
              padding: isMobile() ? '0 10px' : '0 20px',
            }}
          >
            <Menu.Item as={Link} to='/'>
              <img src={logo} alt='logo' style={{ marginRight: '0.75em' }} />
              <div style={{ fontSize: '20px' }}>
                <b>{systemName}</b>
              </div>
            </Menu.Item>
            <Menu.Menu position='right'>
              <Menu.Item onClick={toggleSidebar}>
                <Icon name={showSidebar ? 'close' : 'sidebar'} />
              </Menu.Item>
            </Menu.Menu>
          </Container>
        </Menu>
        {showSidebar ? (
          <Segment style={{ marginTop: 0, borderTop: '0' }}>
            <Menu secondary vertical style={{ width: '100%', margin: 0 }}>
              {renderButtons(true)}
              <Menu.Item>
                <Dropdown
                  selection
                  trigger={
                    <Icon
                      name='language'
                      style={{ margin: 0, fontSize: '18px' }}
                    />
                  }
                  options={languageOptions}
                  value={i18n.language}
                  onChange={(_, { value }) => changeLanguage(value)}
                />
              </Menu.Item>
              {isRoot() && (
                <Menu.Item>
                  <Dropdown
                    selection
                    trigger={<Icon name='paint brush' style={{ margin: 0, fontSize: '18px' }} />}
                    options={themeOptions}
                    onChange={(_, { value }) => switchTheme(value)}
                  />
                </Menu.Item>
              )}
              <Menu.Item>
                {userState.user ? (
                  <Button onClick={logout} style={{ color: '#666666' }}>
                    {t('header.logout')}
                  </Button>
                ) : (
                  <>
                    <Button
                      onClick={() => {
                        setShowSidebar(false);
                        navigate('/login');
                      }}
                    >
                      {t('header.login')}
                    </Button>
                    <Button
                      onClick={() => {
                        setShowSidebar(false);
                        navigate('/register');
                      }}
                    >
                      {t('header.register')}
                    </Button>
                  </>
                )}
              </Menu.Item>
            </Menu>
          </Segment>
        ) : (
          <></>
        )}
      </>
    );
  }

  return (
    <>
      <Menu
        borderless
        style={{
          borderTop: 'none',
          boxShadow: 'rgba(0, 0, 0, 0.04) 0px 2px 12px 0px',
          border: 'none',
        }}
      >
        <Container
          style={{
            width: '100%',
            maxWidth: isMobile() ? '100%' : '1200px',
            padding: isMobile() ? '0 10px' : '0 20px',
          }}
        >
          <Menu.Item as={Link} to='/' className={'hide-on-mobile'}>
            <img src={logo} alt='logo' style={{ marginRight: '0.75em' }} />
            <div
              style={{
                fontSize: '18px',
                fontWeight: '500',
                color: '#333',
              }}
            >
              {systemName}
            </div>
          </Menu.Item>
          {renderButtons(false)}
          <Menu.Menu position='right'>
            <Dropdown
              item
              trigger={
                <Icon name='language' style={{ margin: 0, fontSize: '18px' }} />
              }
              options={languageOptions}
              value={i18n.language}
              onChange={(_, { value }) => changeLanguage(value)}
              style={{
                fontSize: '16px',
                fontWeight: '400',
                color: '#666',
                padding: '0 10px',
              }}
            />
            {isRoot() && (
              <Dropdown
                item
                trigger={<Icon name='paint brush' style={{ margin: 0, fontSize: '18px' }} />}
                options={themeOptions}
                onChange={(_, { value }) => switchTheme(value)}
                style={{ fontSize: '16px', fontWeight: '400', color: '#666', padding: '0 10px' }}
              />
            )}
            {userState.user ? (
              <Dropdown
                text={userState.user.username}
                pointing
                className='link item'
                style={{
                  fontSize: '15px',
                  fontWeight: '400',
                  color: '#666',
                }}
              >
                <Dropdown.Menu>
                  <Dropdown.Item
                    onClick={logout}
                    style={{
                      fontSize: '15px',
                      fontWeight: '400',
                      color: '#666',
                    }}
                  >
                    {t('header.logout')}
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            ) : (
              <Menu.Item
                name={t('header.login')}
                as={Link}
                to='/login'
                className='btn btn-link'
                style={{
                  fontSize: '15px',
                  fontWeight: '400',
                  color: '#666',
                }}
              />
            )}
          </Menu.Menu>
        </Container>
      </Menu>
    </>
  );
};

export default Header;
