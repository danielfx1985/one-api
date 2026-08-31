import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Divider,
  Form,
  Grid,
  Header,
  Message,
  Modal,
} from 'semantic-ui-react';
import { Link } from 'react-router-dom';
import { API, showError, showSuccess, verifyJSON } from '../helpers';
import { marked } from 'marked';

const OtherSetting = () => {
  const { t } = useTranslation();
  let [inputs, setInputs] = useState({
    Footer: '',
    Notice: '',
    About: '',
    SystemName: '',
    Logo: '',
    HomePageContent: '',
    Theme: '',
  });
  let [loading, setLoading] = useState(false);
  const [broadcast, setBroadcast] = useState({
    subject: '',
    content: '',
    test_email: '',
    id_ranges: '',
    exclude_ids: '',
    audience: 'all',
  });
  const [broadcastMeta, setBroadcastMeta] = useState({
    recipient_count: 0,
    smtp_configured: false,
    sending: false,
  });
  const [broadcastLoading, setBroadcastLoading] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateData, setUpdateData] = useState({
    tag_name: '',
    content: '',
  });

  const getOptions = async () => {
    const res = await API.get('/api/option/');
    const { success, message, data } = res.data;
    if (success) {
      let newInputs = {};
      data.forEach((item) => {
        if (item.key in inputs) {
          newInputs[item.key] = item.value;
        }
      });
      setInputs(newInputs);
    } else {
      showError(message);
    }
  };

  const broadcastFilterParams = () => ({
    id_ranges: broadcast.id_ranges,
    exclude_ids: broadcast.exclude_ids,
    audience: broadcast.audience || 'all',
  });

  const loadBroadcastMeta = async () => {
    const res = await API.get('/api/user/admin/broadcast-email', {
      params: broadcastFilterParams(),
    });
    const { success, message, data } = res.data;
    if (success) {
      setBroadcastMeta({
        recipient_count: data.recipient_count || 0,
        smtp_configured: !!data.smtp_configured,
        sending: !!data.sending,
      });
    } else {
      showError(message);
    }
  };

  useEffect(() => {
    getOptions().then();
    loadBroadcastMeta().then();
  }, []);

  const handleBroadcastChange = (e, { name, value }) => {
    setBroadcast((prev) => ({ ...prev, [name]: value }));
  };

  const submitBroadcast = async (testOnly) => {
    if (!broadcast.subject.trim() || !broadcast.content.trim()) {
      showError(t('setting.other.broadcast.subject_placeholder'));
      return;
    }
    if (testOnly && !broadcast.test_email.trim()) {
      showError(t('setting.other.broadcast.test_email_placeholder'));
      return;
    }
    if (
      !testOnly &&
      !window.confirm(
        t('setting.other.broadcast.confirm', {
          count: broadcastMeta.recipient_count,
        })
      )
    ) {
      return;
    }
    setBroadcastLoading(true);
    try {
      const res = await API.post('/api/user/admin/broadcast-email', {
        subject: broadcast.subject,
        content: broadcast.content,
        test_email: testOnly ? broadcast.test_email : '',
        ...broadcastFilterParams(),
      });
      const { success, message, data } = res.data;
      if (success) {
        if (testOnly) {
          showSuccess(message);
        } else {
          showSuccess(
            t('setting.other.broadcast.started', {
              count: data?.recipient_count ?? broadcastMeta.recipient_count,
            })
          );
          setBroadcastMeta((prev) => ({ ...prev, sending: true }));
        }
      } else {
        showError(message);
      }
    } catch (err) {
      showError(err.message || '请求失败');
    } finally {
      setBroadcastLoading(false);
    }
  };

  const updateOption = async (key, value) => {
    setLoading(true);
    const res = await API.put('/api/option/', {
      key,
      value,
    });
    const { success, message } = res.data;
    if (success) {
      setInputs((inputs) => ({ ...inputs, [key]: value }));
    } else {
      showError(message);
    }
    setLoading(false);
  };

  const handleInputChange = async (e, { name, value }) => {
    setInputs((inputs) => ({ ...inputs, [name]: value }));
  };

  const submitNotice = async () => {
    await updateOption('Notice', inputs.Notice);
  };

  const submitSystemName = async () => {
    await updateOption('SystemName', inputs.SystemName);
  };

  const submitTheme = async () => {
    await updateOption('Theme', inputs.Theme);
  };

  const submitLogo = async () => {
    await updateOption('Logo', inputs.Logo);
  };

  const submitAbout = async () => {
    await updateOption('About', inputs.About);
  };

  const submitOption = async (key) => {
    await updateOption(key, inputs[key]);
  };

  const openGitHubRelease = () => {
    window.location = 'https://github.com/songquanpeng/one-api/releases/latest';
  };

  const checkUpdate = async () => {
    const res = await API.get(
      'https://api.github.com/repos/songquanpeng/one-api/releases/latest'
    );
    const { tag_name, body } = res.data;
    if (tag_name === process.env.REACT_APP_VERSION) {
      showSuccess(`已是最新版本：${tag_name}`);
    } else {
      setUpdateData({
        tag_name: tag_name,
        content: marked.parse(body),
      });
      setShowUpdateModal(true);
    }
  };

  return (
    <Grid columns={1}>
      <Grid.Column>
        <Form loading={loading}>
          <Header as='h3'>{t('setting.other.notice.title')}</Header>
          <Form.Group widths='equal'>
            <Form.TextArea
              label={t('setting.other.notice.content')}
              placeholder={t('setting.other.notice.content_placeholder')}
              value={inputs.Notice}
              name='Notice'
              onChange={handleInputChange}
              style={{ minHeight: 100, fontFamily: 'JetBrains Mono, Consolas' }}
            />
          </Form.Group>
          <Form.Button onClick={submitNotice}>
            {t('setting.other.notice.buttons.save')}
          </Form.Button>

          <Divider />
          <Header as='h3'>{t('setting.other.broadcast.title')}</Header>
          <Message>
            {t('setting.other.broadcast.hint')}
            <br />
            {t('setting.other.broadcast.recipients', {
              count: broadcastMeta.recipient_count,
            })}
            {!broadcastMeta.smtp_configured && (
              <>
                <br />
                {t('setting.other.broadcast.smtp_missing')}
              </>
            )}
            {broadcastMeta.sending && (
              <>
                <br />
                {t('setting.other.broadcast.sending')}
              </>
            )}
          </Message>
          <Form.Group widths='equal'>
            <Form.Input
              label={t('setting.other.broadcast.id_ranges')}
              placeholder={t('setting.other.broadcast.id_ranges_placeholder')}
              value={broadcast.id_ranges}
              name='id_ranges'
              onChange={handleBroadcastChange}
            />
            <Form.Input
              label={t('setting.other.broadcast.exclude_ids')}
              placeholder={t('setting.other.broadcast.exclude_ids_placeholder')}
              value={broadcast.exclude_ids}
              name='exclude_ids'
              onChange={handleBroadcastChange}
            />
          </Form.Group>
          <Form.Group inline>
            <label>{t('setting.other.broadcast.audience')}</label>
            <Form.Radio
              label={t('setting.other.broadcast.audience_all')}
              name='audience'
              value='all'
              checked={broadcast.audience === 'all'}
              onChange={handleBroadcastChange}
            />
            <Form.Radio
              label={t('setting.other.broadcast.audience_vip')}
              name='audience'
              value='vip'
              checked={broadcast.audience === 'vip'}
              onChange={handleBroadcastChange}
            />
            <Form.Radio
              label={t('setting.other.broadcast.audience_non_vip')}
              name='audience'
              value='non_vip'
              checked={broadcast.audience === 'non_vip'}
              onChange={handleBroadcastChange}
            />
          </Form.Group>
          <Form.Group widths='equal'>
            <Form.Input
              label={t('setting.other.broadcast.subject')}
              placeholder={t('setting.other.broadcast.subject_placeholder')}
              value={broadcast.subject}
              name='subject'
              onChange={handleBroadcastChange}
            />
          </Form.Group>
          <Form.Group widths='equal'>
            <Form.TextArea
              label={t('setting.other.broadcast.content')}
              placeholder={t('setting.other.broadcast.content_placeholder')}
              value={broadcast.content}
              name='content'
              onChange={handleBroadcastChange}
              style={{ minHeight: 150, fontFamily: 'JetBrains Mono, Consolas' }}
            />
          </Form.Group>
          <Form.Group widths='equal'>
            <Form.Input
              label={t('setting.other.broadcast.test_email')}
              placeholder={t(
                'setting.other.broadcast.test_email_placeholder'
              )}
              value={broadcast.test_email}
              name='test_email'
              onChange={handleBroadcastChange}
            />
          </Form.Group>
          <Form.Group>
            <Form.Button
              type='button'
              onClick={loadBroadcastMeta}
              disabled={broadcastLoading}
            >
              {t('setting.other.broadcast.buttons.refresh')}
            </Form.Button>
            <Form.Button
              type='button'
              onClick={() => submitBroadcast(true)}
              loading={broadcastLoading}
            >
              {t('setting.other.broadcast.buttons.test')}
            </Form.Button>
            <Form.Button
              type='button'
              primary
              onClick={() => submitBroadcast(false)}
              loading={broadcastLoading}
              disabled={broadcastMeta.sending}
            >
              {t('setting.other.broadcast.buttons.send')}
            </Form.Button>
          </Form.Group>

          <Divider />
          <Header as='h3'>{t('setting.other.system.title')}</Header>
          <Form.Group widths='equal'>
            <Form.Input
              label={t('setting.other.system.name')}
              placeholder={t('setting.other.system.name_placeholder')}
              value={inputs.SystemName}
              name='SystemName'
              onChange={handleInputChange}
            />
          </Form.Group>
          <Form.Button onClick={submitSystemName}>
            {t('setting.other.system.buttons.save_name')}
          </Form.Button>
          <Form.Group widths='equal'>
            <Form.Input
              label={
                <label>
                  {t('setting.other.system.theme.title')}（
                  <Link to='https://github.com/songquanpeng/one-api/blob/main/web/README.md'>
                    {t('setting.other.system.theme.link')}
                  </Link>
                  ）
                </label>
              }
              placeholder={t('setting.other.system.theme.placeholder')}
              value={inputs.Theme}
              name='Theme'
              onChange={handleInputChange}
            />
          </Form.Group>
          <Form.Button onClick={submitTheme}>
            {t('setting.other.system.buttons.save_theme')}
          </Form.Button>
          <Form.Group widths='equal'>
            <Form.Input
              label={t('setting.other.system.logo')}
              placeholder={t('setting.other.system.logo_placeholder')}
              value={inputs.Logo}
              name='Logo'
              type='url'
              onChange={handleInputChange}
            />
          </Form.Group>
          <Form.Button onClick={submitLogo}>
            {t('setting.other.system.buttons.save_logo')}
          </Form.Button>

          <Divider />
          <Header as='h3'>{t('setting.other.content.title')}</Header>
          <Form.Group widths='equal'>
            <Form.TextArea
              label={t('setting.other.content.homepage.title')}
              placeholder={t('setting.other.content.homepage.placeholder')}
              value={inputs.HomePageContent}
              name='HomePageContent'
              onChange={handleInputChange}
              style={{ minHeight: 150, fontFamily: 'JetBrains Mono, Consolas' }}
            />
          </Form.Group>
          <Form.Button onClick={() => submitOption('HomePageContent')}>
            {t('setting.other.content.buttons.save_homepage')}
          </Form.Button>
          <Form.Group widths='equal'>
            <Form.TextArea
              label={t('setting.other.content.about.title')}
              placeholder={t('setting.other.content.about.placeholder')}
              value={inputs.About}
              name='About'
              onChange={handleInputChange}
              style={{ minHeight: 150, fontFamily: 'JetBrains Mono, Consolas' }}
            />
          </Form.Group>
          <Form.Button onClick={submitAbout}>
            {t('setting.other.content.buttons.save_about')}
          </Form.Button>
          <Message>{t('setting.other.copyright.notice')}</Message>
          <Form.Group widths='equal'>
            <Form.Input
              label={t('setting.other.content.footer.title')}
              placeholder={t('setting.other.content.footer.placeholder')}
              value={inputs.Footer}
              name='Footer'
              onChange={handleInputChange}
            />
          </Form.Group>
          <Form.Button onClick={() => submitOption('Footer')}>
            {t('setting.other.content.buttons.save_footer')}
          </Form.Button>
        </Form>
      </Grid.Column>
      <Modal
        onClose={() => setShowUpdateModal(false)}
        onOpen={() => setShowUpdateModal(true)}
        open={showUpdateModal}
      >
        <Modal.Header>新版本：{updateData.tag_name}</Modal.Header>
        <Modal.Content>
          <Modal.Description>
            <div dangerouslySetInnerHTML={{ __html: updateData.content }}></div>
          </Modal.Description>
        </Modal.Content>
        <Modal.Actions>
          <Button onClick={() => setShowUpdateModal(false)}>关闭</Button>
          <Button
            content='详情'
            onClick={() => {
              setShowUpdateModal(false);
              openGitHubRelease();
            }}
          />
        </Modal.Actions>
      </Modal>
    </Grid>
  );
};

export default OtherSetting;
