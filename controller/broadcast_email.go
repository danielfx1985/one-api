package controller

import (
	"fmt"
	"net/http"
	"strings"
	"sync/atomic"
	"time"
	"unicode/utf8"

	"github.com/gin-gonic/gin"

	"github.com/songquanpeng/one-api/common"
	"github.com/songquanpeng/one-api/common/logger"
	"github.com/songquanpeng/one-api/common/message"
	"github.com/songquanpeng/one-api/model"
)

var broadcastSending atomic.Bool

const (
	broadcastMinInterval = 200 * time.Millisecond
	broadcastMaxSubject  = 200
	broadcastMaxContent  = 100000
)

type broadcastEmailRequest struct {
	Subject    string `json:"subject"`
	Content    string `json:"content"`
	TestEmail  string `json:"test_email"`
	IDRanges   string `json:"id_ranges"`
	ExcludeIDs string `json:"exclude_ids"`
	Audience   string `json:"audience"`
}

func GetBroadcastEmailRecipients(c *gin.Context) {
	filter, err := parseBroadcastFilter(c.Query("id_ranges"), c.Query("exclude_ids"), c.Query("audience"))
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	emails, err := model.GetBroadcastableEmails(filter)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data": gin.H{
			"recipient_count": len(emails),
			"smtp_configured": message.SMTPConfigured(),
			"sending":         broadcastSending.Load(),
		},
	})
}

func BroadcastEmail(c *gin.Context) {
	var req broadcastEmailRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	req.Subject = strings.TrimSpace(req.Subject)
	req.Content = strings.TrimSpace(req.Content)
	req.TestEmail = strings.TrimSpace(req.TestEmail)
	req.IDRanges = strings.TrimSpace(req.IDRanges)
	req.ExcludeIDs = strings.TrimSpace(req.ExcludeIDs)
	req.Audience = strings.TrimSpace(req.Audience)
	if req.Subject == "" || req.Content == "" {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "主题和正文不能为空",
		})
		return
	}
	if utf8.RuneCountInString(req.Subject) > broadcastMaxSubject {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "主题过长",
		})
		return
	}
	if utf8.RuneCountInString(req.Content) > broadcastMaxContent {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "正文过长",
		})
		return
	}
	if !message.SMTPConfigured() {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "尚未配置 SMTP，请先在系统设置中填写邮件服务器",
		})
		return
	}

	html := message.EmailTemplate(req.Subject, req.Content)

	if req.TestEmail != "" {
		if err := common.Validate.Var(req.TestEmail, "required,email"); err != nil {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": "试发邮箱格式不正确",
			})
			return
		}
		if err := message.SendEmail(req.Subject, req.TestEmail, html); err != nil {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": "试发失败：" + err.Error(),
			})
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": "已向 " + req.TestEmail + " 发送测试邮件",
		})
		return
	}

	filter, err := parseBroadcastFilter(req.IDRanges, req.ExcludeIDs, req.Audience)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	emails, err := model.GetBroadcastableEmails(filter)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	if len(emails) == 0 {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "当前筛选条件下没有可发送的真实邮箱（已排除空邮箱、已删除用户和手机占位邮箱）",
		})
		return
	}
	if !broadcastSending.CompareAndSwap(false, true) {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "已有群发任务正在进行，请稍后再试",
		})
		return
	}

	go runBroadcastEmail(req.Subject, html, emails)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data": gin.H{
			"recipient_count": len(emails),
		},
	})
}

func runBroadcastEmail(subject, html string, emails []string) {
	defer broadcastSending.Store(false)
	success, fail := 0, 0
	for i, email := range emails {
		if i > 0 {
			time.Sleep(broadcastMinInterval)
		}
		if err := message.SendEmail(subject, email, html); err != nil {
			fail++
			logger.SysError(fmt.Sprintf("broadcast email to %s failed: %s", email, err.Error()))
			continue
		}
		success++
	}
	logger.SysLog(fmt.Sprintf("broadcast email finished: subject=%s success=%d fail=%d", subject, success, fail))
}
