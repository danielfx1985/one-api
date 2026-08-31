package controller

import (
	"fmt"
	"regexp"
	"strconv"
	"strings"

	"github.com/songquanpeng/one-api/model"
)

const broadcastMaxRangeCount = 100

var (
	broadcastRangeTokenRe = regexp.MustCompile(`(\d+)\s*-\s*(\d+)|(\d+)`)
	broadcastRangeSepRe   = regexp.MustCompile(`[\s,，;]+`)
)

func parseBroadcastFilter(idRanges, excludeIDs, audience string) (model.BroadcastEmailFilter, error) {
	ranges, err := parseIDRanges(idRanges)
	if err != nil {
		return model.BroadcastEmailFilter{}, err
	}
	excludes, err := parseIDRanges(excludeIDs)
	if err != nil {
		return model.BroadcastEmailFilter{}, err
	}
	aud, err := parseBroadcastAudience(audience)
	if err != nil {
		return model.BroadcastEmailFilter{}, err
	}
	return model.BroadcastEmailFilter{
		IDRanges:      ranges,
		ExcludeRanges: excludes,
		Audience:      aud,
	}, nil
}

func parseBroadcastAudience(raw string) (string, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" || raw == "all" {
		return "all", nil
	}
	if raw == "vip" || raw == "non_vip" {
		return raw, nil
	}
	return "", fmt.Errorf("发送对象无效，应为 all、vip 或 non_vip")
}

func parseIDRanges(raw string) ([]model.IDRange, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil, nil
	}
	var ranges []model.IDRange
	rest := raw
	for {
		loc := broadcastRangeTokenRe.FindStringIndex(rest)
		if loc == nil {
			break
		}
		if leftover := strings.TrimSpace(broadcastRangeSepRe.ReplaceAllString(rest[:loc[0]], "")); leftover != "" {
			return nil, fmt.Errorf("无效的用户 ID 号段：%s", leftover)
		}
		r, err := parseOneIDRange(rest[loc[0]:loc[1]])
		if err != nil {
			return nil, err
		}
		ranges = append(ranges, r)
		rest = rest[loc[1]:]
	}
	if leftover := strings.TrimSpace(broadcastRangeSepRe.ReplaceAllString(rest, "")); leftover != "" {
		return nil, fmt.Errorf("无效的用户 ID 号段：%s", leftover)
	}
	if len(ranges) > broadcastMaxRangeCount {
		return nil, fmt.Errorf("号段数量不能超过 %d 个", broadcastMaxRangeCount)
	}
	return ranges, nil
}

func parseOneIDRange(token string) (model.IDRange, error) {
	token = strings.TrimSpace(token)
	hyphen := strings.Index(token, "-")
	if hyphen < 0 {
		id, err := strconv.Atoi(token)
		if err != nil || id <= 0 {
			return model.IDRange{}, fmt.Errorf("无效的用户 ID：%s", token)
		}
		return model.IDRange{Start: id, End: id}, nil
	}
	left := strings.TrimSpace(token[:hyphen])
	right := strings.TrimSpace(token[hyphen+1:])
	if left == "" || right == "" {
		return model.IDRange{}, fmt.Errorf("无效的用户 ID 号段：%s", token)
	}
	start, err1 := strconv.Atoi(left)
	end, err2 := strconv.Atoi(right)
	if err1 != nil || err2 != nil || start <= 0 || end <= 0 {
		return model.IDRange{}, fmt.Errorf("无效的用户 ID 号段：%s", token)
	}
	if start > end {
		return model.IDRange{}, fmt.Errorf("号段起始 ID 不能大于结束 ID：%s", token)
	}
	return model.IDRange{Start: start, End: end}, nil
}
