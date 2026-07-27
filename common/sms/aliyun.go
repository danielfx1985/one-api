package sms

import (
	"errors"
	"fmt"
	"os"
	"regexp"
	"strings"

	openapi "github.com/alibabacloud-go/darabonba-openapi/v2/client"
	dypnsapi "github.com/alibabacloud-go/dypnsapi-20170525/v3/client"
	"github.com/alibabacloud-go/tea/tea"

	"github.com/songquanpeng/one-api/common/config"
)

var cnMobileRegex = regexp.MustCompile(`^1\d{10}$`)

// NormalizePhone strips non-digit characters and a leading country code (86),
// mirroring the logic used by the original frontend SMS integration.
func NormalizePhone(phone string) string {
	var b strings.Builder
	for _, r := range phone {
		if r >= '0' && r <= '9' {
			b.WriteRune(r)
		}
	}
	normalized := b.String()
	if strings.HasPrefix(normalized, "86") && len(normalized) > 11 {
		normalized = normalized[2:]
	}
	return normalized
}

func IsValidCnMobile(phone string) bool {
	return cnMobileRegex.MatchString(NormalizePhone(phone))
}

// PhoneToPlaceholderEmail builds the synthetic email address used to store a
// phone-verified user in the existing users.email column, avoiding any schema change.
func PhoneToPlaceholderEmail(phone string) string {
	domain := config.PhoneEmailDomain
	if domain == "" {
		domain = "phone.local"
	}
	return fmt.Sprintf("%s@%s", NormalizePhone(phone), domain)
}

type aliyunSmsSettings struct {
	AccessKeyId     string
	AccessKeySecret string
	SignName        string
	TemplateCode    string
	TemplateParam   string
	CountryCode     string
	SchemeName      string
}

func firstNonEmpty(values ...string) string {
	for _, v := range values {
		if strings.TrimSpace(v) != "" {
			return strings.TrimSpace(v)
		}
	}
	return ""
}

// resolveSettings reads Aliyun SMS config from admin options, with environment
// variables as fallback (same names as the former Vercel BFF).
func resolveSettings() aliyunSmsSettings {
	settings := aliyunSmsSettings{
		AccessKeyId:     config.AliyunSmsAccessKeyId,
		AccessKeySecret: config.AliyunSmsAccessKeySecret,
		SignName:        config.AliyunSmsSignName,
		TemplateCode:    config.AliyunSmsTemplateCode,
		TemplateParam:   config.AliyunSmsTemplateParam,
		CountryCode:     config.AliyunSmsCountryCode,
		SchemeName:      config.AliyunSmsSchemeName,
	}
	if settings.AccessKeyId == "" {
		settings.AccessKeyId = firstNonEmpty(
			os.Getenv("ALIYUN_ACCESS_KEY_ID"),
			os.Getenv("ALIBABA_CLOUD_ACCESS_KEY_ID"),
		)
	}
	if settings.AccessKeySecret == "" {
		settings.AccessKeySecret = firstNonEmpty(
			os.Getenv("ALIYUN_ACCESS_KEY_SECRET"),
			os.Getenv("ALIBABA_CLOUD_ACCESS_KEY_SECRET"),
		)
	}
	if settings.SignName == "" {
		settings.SignName = os.Getenv("ALIYUN_SMS_SIGN_NAME")
	}
	if settings.TemplateCode == "" {
		settings.TemplateCode = os.Getenv("ALIYUN_SMS_TEMPLATE_CODE")
	}
	if settings.TemplateParam == "" {
		settings.TemplateParam = firstNonEmpty(
			os.Getenv("ALIYUN_SMS_TEMPLATE_PARAM"),
			`{"code":"##code##","min":"5"}`,
		)
	}
	if settings.CountryCode == "" {
		settings.CountryCode = firstNonEmpty(os.Getenv("ALIYUN_SMS_COUNTRY_CODE"), "86")
	}
	if settings.SchemeName == "" {
		settings.SchemeName = os.Getenv("ALIYUN_SMS_SCHEME_NAME")
	}
	return settings
}

// Configured reports whether Aliyun SMS is ready (admin options or env fallback).
func Configured() bool {
	settings := resolveSettings()
	return settings.AccessKeyId != "" && settings.AccessKeySecret != "" &&
		settings.SignName != "" && settings.TemplateCode != ""
}

func newClient() (*dypnsapi.Client, error) {
	settings := resolveSettings()
	if settings.AccessKeyId == "" || settings.AccessKeySecret == "" {
		return nil, errors.New("阿里云短信未配置：缺少 AccessKeyId 或 AccessKeySecret")
	}
	clientConfig := &openapi.Config{
		AccessKeyId:     tea.String(settings.AccessKeyId),
		AccessKeySecret: tea.String(settings.AccessKeySecret),
	}
	clientConfig.Endpoint = tea.String("dypnsapi.aliyuncs.com")
	return dypnsapi.NewClient(clientConfig)
}

// SendVerifyCode sends a 6-digit SMS verification code (5 min validity, 60s resend
// interval), generated and held by Aliyun itself so this service never stores the code.
func SendVerifyCode(phone string) error {
	normalized := NormalizePhone(phone)
	if !IsValidCnMobile(normalized) {
		return errors.New("手机号格式不正确")
	}
	settings := resolveSettings()
	if settings.SignName == "" || settings.TemplateCode == "" {
		return errors.New("阿里云短信未配置：缺少签名或模板")
	}
	client, err := newClient()
	if err != nil {
		return err
	}
	request := &dypnsapi.SendSmsVerifyCodeRequest{
		PhoneNumber:      tea.String(normalized),
		SignName:         tea.String(settings.SignName),
		TemplateCode:     tea.String(settings.TemplateCode),
		TemplateParam:    tea.String(settings.TemplateParam),
		CountryCode:      tea.String(settings.CountryCode),
		CodeType:         tea.Int64(1),
		CodeLength:       tea.Int64(6),
		ValidTime:        tea.Int64(300),
		Interval:         tea.Int64(60),
		ReturnVerifyCode: tea.Bool(false),
	}
	if settings.SchemeName != "" {
		request.SchemeName = tea.String(settings.SchemeName)
	}
	response, err := client.SendSmsVerifyCode(request)
	if err != nil {
		return errors.New(extractErrorMessage(err, "发送验证码失败"))
	}
	if response == nil || response.Body == nil || !tea.BoolValue(response.Body.Success) {
		if response != nil && response.Body != nil && tea.StringValue(response.Body.Message) != "" {
			return errors.New(tea.StringValue(response.Body.Message))
		}
		return errors.New("发送验证码失败")
	}
	return nil
}

// CheckVerifyCode validates the code entered by the user against Aliyun's record.
func CheckVerifyCode(phone string, code string) error {
	normalized := NormalizePhone(phone)
	if !IsValidCnMobile(normalized) {
		return errors.New("手机号格式不正确")
	}
	code = strings.TrimSpace(code)
	if code == "" {
		return errors.New("请输入验证码")
	}
	settings := resolveSettings()
	client, err := newClient()
	if err != nil {
		return err
	}
	request := &dypnsapi.CheckSmsVerifyCodeRequest{
		PhoneNumber: tea.String(normalized),
		VerifyCode:  tea.String(code),
		CountryCode: tea.String(settings.CountryCode),
	}
	if settings.SchemeName != "" {
		request.SchemeName = tea.String(settings.SchemeName)
	}
	response, err := client.CheckSmsVerifyCode(request)
	if err != nil {
		message := extractErrorMessage(err, "验证码校验失败")
		if strings.Contains(message, "ValidateFail") || strings.Contains(message, "验证") {
			return errors.New("验证码错误或已过期")
		}
		return errors.New(message)
	}
	if response == nil || response.Body == nil || response.Body.Model == nil ||
		tea.StringValue(response.Body.Model.VerifyResult) != "PASS" {
		return errors.New("验证码错误或已过期")
	}
	return nil
}

func extractErrorMessage(err error, fallback string) string {
	var sdkErr *tea.SDKError
	if errors.As(err, &sdkErr) && tea.StringValue(sdkErr.Message) != "" {
		return tea.StringValue(sdkErr.Message)
	}
	if err.Error() != "" {
		return err.Error()
	}
	return fallback
}
