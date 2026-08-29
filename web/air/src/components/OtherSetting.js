import React, { useEffect, useState } from 'react';
import { Button, Divider, Form, Grid, Header, Message, Modal } from 'semantic-ui-react';
import { API, showError, showSuccess } from '../helpers';
import { marked } from 'marked';
import { Link } from 'react-router-dom';

const OtherSetting = () => {
  let [inputs, setInputs] = useState({
    Footer: '',
    Notice: '',
    About: '',
    SystemName: '',
    Logo: '',
    HomePageContent: '',
    Theme: ''
  });
  let [loading, setLoading] = useState(false);
  const [broadcast, setBroadcast] = useState({
    subject: '',
    content: '',
    test_email: ''
  });
  const [broadcastMeta, setBroadcastMeta] = useState({
    recipient_count: 0,
    smtp_configured: false,
    sending: false
  });
  const [broadcastLoading, setBroadcastLoading] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateData, setUpdateData] = useState({
    tag_name: '',
    content: ''
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

  const loadBroadcastMeta = async () => {
    const res = await API.get('/api/user/admin/broadcast-email');
    const { success, message, data } = res.data;
    if (success) {
      setBroadcastMeta({
        recipient_count: data.recipient_count || 0,
        smtp_configured: !!data.smtp_configured,
        sending: !!data.sending
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
      showError('主题和正文不能为空');
      return;
    }
    if (testOnly && !broadcast.test_email.trim()) {
      showError('请先填写试发邮箱');
      return;
    }
    if (
      !testOnly &&
      !window.confirm(
        `确认向 ${broadcastMeta.recipient_count} 个邮箱群发这封邮件？发送后无法撤回。`
      )
    ) {
      return;
    }
    setBroadcastLoading(true);
    try {
      const res = await API.post('/api/user/admin/broadcast-email', {
        subject: broadcast.subject,
        content: broadcast.content,
        test_email: testOnly ? broadcast.test_email : ''
      });
      const { success, message, data } = res.data;
      if (success) {
        if (testOnly) {
          showSuccess(message);
        } else {
          showSuccess(`已开始向 ${data?.recipient_count ?? broadcastMeta.recipient_count} 个邮箱发送`);
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
      value
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

  const submitFooter = async () => {
    await updateOption('Footer', inputs.Footer);
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
    window.location =
      'https://github.com/songquanpeng/one-api/releases/latest';
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
        content: marked.parse(body)
      });
      setShowUpdateModal(true);
    }
  };

  return (
    <Grid columns={1}>
      <Grid.Column>
        <Form loading={loading}>
          <Header as='h3'>通用设置</Header>
          <Form.Button onClick={checkUpdate}>检查更新</Form.Button>
          <Form.Group widths='equal'>
            <Form.TextArea
              label='公告'
              placeholder='在此输入新的公告内容，支持 Markdown & HTML 代码'
              value={inputs.Notice}
              name='Notice'
              onChange={handleInputChange}
              style={{ minHeight: 150, fontFamily: 'JetBrains Mono, Consolas' }}
            />
          </Form.Group>
          <Form.Button onClick={submitNotice}>保存公告</Form.Button>
          <Divider />
          <Header as='h3'>群发邮件</Header>
          <Message>
            将向所有未删除用户的真实邮箱逐封发送，自动跳过空邮箱和手机占位邮箱。请先在系统设置中配置 SMTP。
            <br />
            当前可发送 {broadcastMeta.recipient_count} 个邮箱
            {!broadcastMeta.smtp_configured && (
              <>
                <br />
                尚未配置 SMTP，群发前请先填写邮件服务器。
              </>
            )}
            {broadcastMeta.sending && (
              <>
                <br />
                正在发送中，请稍候。
              </>
            )}
          </Message>
          <Form.Group widths='equal'>
            <Form.Input
              label='邮件主题'
              placeholder='请输入邮件主题'
              value={broadcast.subject}
              name='subject'
              onChange={handleBroadcastChange}
            />
          </Form.Group>
          <Form.Group widths='equal'>
            <Form.TextArea
              label='邮件正文'
              placeholder='支持 HTML，例如：<p>您好，这是一封系统通知。</p>'
              value={broadcast.content}
              name='content'
              onChange={handleBroadcastChange}
              style={{ minHeight: 150, fontFamily: 'JetBrains Mono, Consolas' }}
            />
          </Form.Group>
          <Form.Group widths='equal'>
            <Form.Input
              label='试发邮箱'
              placeholder='先发一封到自己的邮箱确认效果'
              value={broadcast.test_email}
              name='test_email'
              onChange={handleBroadcastChange}
            />
          </Form.Group>
          <Form.Group>
            <Form.Button type='button' onClick={loadBroadcastMeta} disabled={broadcastLoading}>
              刷新人数
            </Form.Button>
            <Form.Button type='button' onClick={() => submitBroadcast(true)} loading={broadcastLoading}>
              发送测试邮件
            </Form.Button>
            <Form.Button
              type='button'
              primary
              onClick={() => submitBroadcast(false)}
              loading={broadcastLoading}
              disabled={broadcastMeta.sending}
            >
              群发给所有用户
            </Form.Button>
          </Form.Group>
          <Divider />
          <Header as='h3'>个性化设置</Header>
          <Form.Group widths='equal'>
            <Form.Input
              label='系统名称'
              placeholder='在此输入系统名称'
              value={inputs.SystemName}
              name='SystemName'
              onChange={handleInputChange}
            />
          </Form.Group>
          <Form.Button onClick={submitSystemName}>设置系统名称</Form.Button>
          <Form.Group widths='equal'>
            <Form.Input
              label={<label>主题名称（<Link
                to='https://github.com/songquanpeng/one-api/blob/main/web/README.md'>当前可用主题</Link>）</label>}
              placeholder='请输入主题名称'
              value={inputs.Theme}
              name='Theme'
              onChange={handleInputChange}
            />
          </Form.Group>
          <Form.Button onClick={submitTheme}>设置主题（重启生效）</Form.Button>
          <Form.Group widths='equal'>
            <Form.Input
              label='Logo 图片地址'
              placeholder='在此输入 Logo 图片地址'
              value={inputs.Logo}
              name='Logo'
              type='url'
              onChange={handleInputChange}
            />
          </Form.Group>
          <Form.Button onClick={submitLogo}>设置 Logo</Form.Button>
          <Form.Group widths='equal'>
            <Form.TextArea
              label='首页内容'
              placeholder='在此输入首页内容，支持 Markdown & HTML 代码，设置后首页的状态信息将不再显示。如果输入的是一个链接，则会使用该链接作为 iframe 的 src 属性，这允许你设置任意网页作为首页。'
              value={inputs.HomePageContent}
              name='HomePageContent'
              onChange={handleInputChange}
              style={{ minHeight: 150, fontFamily: 'JetBrains Mono, Consolas' }}
            />
          </Form.Group>
          <Form.Button onClick={() => submitOption('HomePageContent')}>保存首页内容</Form.Button>
          <Form.Group widths='equal'>
            <Form.TextArea
              label='关于'
              placeholder='在此输入新的关于内容，支持 Markdown & HTML 代码。如果输入的是一个链接，则会使用该链接作为 iframe 的 src 属性，这允许你设置任意网页作为关于页面。'
              value={inputs.About}
              name='About'
              onChange={handleInputChange}
              style={{ minHeight: 150, fontFamily: 'JetBrains Mono, Consolas' }}
            />
          </Form.Group>
          <Form.Button onClick={submitAbout}>保存关于</Form.Button>
          <Message>移除 One API
            的版权标识必须首先获得授权，项目维护需要花费大量精力，如果本项目对你有意义，请主动支持本项目。</Message>
          <Form.Group widths='equal'>
            <Form.Input
              label='页脚'
              placeholder='在此输入新的页脚，留空则使用默认页脚，支持 HTML 代码'
              value={inputs.Footer}
              name='Footer'
              onChange={handleInputChange}
            />
          </Form.Group>
          <Form.Button onClick={submitFooter}>设置页脚</Form.Button>
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
