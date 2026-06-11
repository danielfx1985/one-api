package router

import (
	"embed"
	"fmt"
	"mime"
	"net/http"
	"path/filepath"
	"strings"

	"github.com/gin-contrib/gzip"
	"github.com/gin-gonic/gin"
	"github.com/songquanpeng/one-api/common/config"
	"github.com/songquanpeng/one-api/controller"
	"github.com/songquanpeng/one-api/middleware"
)

func SetWebRouter(router *gin.Engine, buildFS embed.FS) {
	router.Use(gzip.Gzip(gzip.DefaultCompression))
	router.Use(middleware.GlobalWebRateLimit())
	router.Use(middleware.Cache())

	// Serve static assets dynamically — reads config.Theme on every request so
	// theme changes via /api/option/ take effect after a simple page reload.
	router.Use(func(c *gin.Context) {
		path := c.Request.URL.Path
		if path == "/" || strings.HasPrefix(path, "/api") || strings.HasPrefix(path, "/v1") {
			c.Next()
			return
		}
		data, err := buildFS.ReadFile(fmt.Sprintf("web/build/%s%s", config.Theme, path))
		if err != nil {
			c.Next()
			return
		}
		ct := mime.TypeByExtension(filepath.Ext(path))
		if ct == "" {
			ct = http.DetectContentType(data)
		}
		c.Data(http.StatusOK, ct, data)
		c.Abort()
	})

	router.NoRoute(func(c *gin.Context) {
		if strings.HasPrefix(c.Request.RequestURI, "/v1") || strings.HasPrefix(c.Request.RequestURI, "/api") {
			controller.RelayNotFound(c)
			return
		}
		indexData, _ := buildFS.ReadFile(fmt.Sprintf("web/build/%s/index.html", config.Theme))
		c.Header("Cache-Control", "no-cache")
		c.Data(http.StatusOK, "text/html; charset=utf-8", indexData)
	})
}
