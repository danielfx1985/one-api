package controller

import (
	"strings"
	"testing"

	"github.com/songquanpeng/one-api/model"
)

func TestParseIDRanges(t *testing.T) {
	t.Parallel()
	tests := []struct {
		name    string
		input   string
		want    []model.IDRange
		wantErr string
	}{
		{name: "empty", input: "", want: nil},
		{name: "spaces only", input: "   ", want: nil},
		{
			name:  "single id",
			input: "1000",
			want:  []model.IDRange{{Start: 1000, End: 1000}},
		},
		{
			name:  "single range",
			input: "1-100",
			want:  []model.IDRange{{Start: 1, End: 100}},
		},
		{
			name:  "multiple ranges with commas",
			input: "1-100,200-350,1000",
			want: []model.IDRange{
				{Start: 1, End: 100},
				{Start: 200, End: 350},
				{Start: 1000, End: 1000},
			},
		},
		{
			name:  "chinese comma and spaces around hyphen",
			input: "1 - 100，200-350",
			want: []model.IDRange{
				{Start: 1, End: 100},
				{Start: 200, End: 350},
			},
		},
		{
			name:  "whitespace separated",
			input: "15 88 201-210",
			want: []model.IDRange{
				{Start: 15, End: 15},
				{Start: 88, End: 88},
				{Start: 201, End: 210},
			},
		},
		{name: "start greater than end", input: "20-10", wantErr: "不能大于"},
		{name: "zero id", input: "0", wantErr: "无效"},
		{name: "negative looks like garbage", input: "-5", wantErr: "无效"},
		{name: "non numeric", input: "abc", wantErr: "无效"},
		{name: "mixed garbage", input: "1-10,foo,20", wantErr: "无效"},
	}
	for _, tt := range tests {
		tt := tt
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			got, err := parseIDRanges(tt.input)
			if tt.wantErr != "" {
				if err == nil || !strings.Contains(err.Error(), tt.wantErr) {
					t.Fatalf("parseIDRanges(%q) error = %v, want substring %q", tt.input, err, tt.wantErr)
				}
				return
			}
			if err != nil {
				t.Fatalf("parseIDRanges(%q) unexpected error: %v", tt.input, err)
			}
			if len(got) != len(tt.want) {
				t.Fatalf("parseIDRanges(%q) len = %d, want %d (%v)", tt.input, len(got), len(tt.want), got)
			}
			for i := range got {
				if got[i] != tt.want[i] {
					t.Fatalf("parseIDRanges(%q)[%d] = %+v, want %+v", tt.input, i, got[i], tt.want[i])
				}
			}
		})
	}
}

func TestParseIDRangesTooMany(t *testing.T) {
	t.Parallel()
	parts := make([]string, broadcastMaxRangeCount+1)
	for i := range parts {
		parts[i] = "1"
	}
	_, err := parseIDRanges(strings.Join(parts, ","))
	if err == nil || !strings.Contains(err.Error(), "不能超过") {
		t.Fatalf("expected too-many-ranges error, got %v", err)
	}
}

func TestParseBroadcastFilter(t *testing.T) {
	t.Parallel()
	filter, err := parseBroadcastFilter("1-10,20", "5,8-9", "vip")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if filter.Audience != "vip" {
		t.Fatalf("audience = %q, want vip", filter.Audience)
	}
	if len(filter.IDRanges) != 2 || filter.IDRanges[0] != (model.IDRange{Start: 1, End: 10}) || filter.IDRanges[1] != (model.IDRange{Start: 20, End: 20}) {
		t.Fatalf("IDRanges = %+v", filter.IDRanges)
	}
	if len(filter.ExcludeRanges) != 2 || filter.ExcludeRanges[0] != (model.IDRange{Start: 5, End: 5}) || filter.ExcludeRanges[1] != (model.IDRange{Start: 8, End: 9}) {
		t.Fatalf("ExcludeRanges = %+v", filter.ExcludeRanges)
	}

	empty, err := parseBroadcastFilter("", "", "")
	if err != nil {
		t.Fatalf("empty filter error: %v", err)
	}
	if empty.Audience != "all" || empty.IDRanges != nil || empty.ExcludeRanges != nil {
		t.Fatalf("empty filter = %+v", empty)
	}

	if _, err := parseBroadcastFilter("", "", "staff"); err == nil {
		t.Fatal("expected invalid audience error")
	}
}
