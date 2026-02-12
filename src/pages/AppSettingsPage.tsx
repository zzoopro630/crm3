import { useState, useEffect, useRef, useMemo } from 'react';
import { useAppSettings, useUpdateSettings } from '@/hooks/useAppSettings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import {
  LayoutDashboard,
  Users,
  Trash2,
  UsersRound,
  BookUser,
  MessageSquare,
  UserPlus,
  BarChart3,
  Settings,
  Headphones,
} from 'lucide-react';

// ── 앱 설정 항목 정의 ──

interface SettingItem {
  key: string;
  label: string;
  description: string;
  type: 'number';
  suffix: string;
  min: number;
  max: number;
  fallback: number;
  keywords: string[];
}

interface SettingSection {
  title: string;
  items: SettingItem[];
}

const settingSections: SettingSection[] = [
  {
    title: '세션 및 보안',
    items: [
      {
        key: 'app:session_timeout_minutes',
        label: '세션 유지 시간',
        description: '사용자가 활동하지 않으면 자동으로 로그아웃되는 시간',
        type: 'number',
        suffix: '분',
        min: 5,
        max: 480,
        fallback: 60,
        keywords: ['타임아웃', '로그아웃', '비활성', 'session', 'timeout'],
      },
      {
        key: 'app:logout_countdown_seconds',
        label: '로그아웃 카운트다운',
        description: '로그아웃 확인 다이얼로그의 자동 로그아웃 대기 시간',
        type: 'number',
        suffix: '초',
        min: 5,
        max: 120,
        fallback: 30,
        keywords: ['카운트다운', '대기', '확인', 'countdown'],
      },
    ],
  },
  {
    title: '화면 설정',
    items: [
      {
        key: 'app:default_font_scale',
        label: '기본 폰트 크기',
        description: '모든 사용자에게 적용되는 기본 폰트 크기 (개인은 헤더에서 개별 조절 가능)',
        type: 'number',
        suffix: '%',
        min: 80,
        max: 150,
        fallback: 100,
        keywords: ['폰트', '글자', '크기', '텍스트', 'font', 'scale'],
      },
    ],
  },
];

// ── 메뉴 라벨 항목 정의 ──

interface MenuEntry {
  href: string;
  defaultTitle: string;
  icon: React.ComponentType<{ className?: string }>;
}

const menuEntries: MenuEntry[] = [
  { href: '/', defaultTitle: '대시보드', icon: LayoutDashboard },
  { href: '/customers', defaultTitle: '고객리스트', icon: Users },
  { href: '/customers/trash', defaultTitle: '휴지통', icon: Trash2 },
  { href: '/inquiries', defaultTitle: '보험문의', icon: Headphones },
  { href: '/consultant-inquiries', defaultTitle: '더플문의', icon: MessageSquare },
  { href: '/recruit-inquiries', defaultTitle: '입사문의', icon: UserPlus },
  { href: '/team', defaultTitle: '팀 관리', icon: UsersRound },
  { href: '/contacts-direct', defaultTitle: '연락처', icon: BookUser },
  { href: '/ads', defaultTitle: '광고 분석', icon: BarChart3 },
  { href: '/settings', defaultTitle: '설정', icon: Settings },
];

// ── 검색 매칭 ──

function matchesSearch(query: string, texts: string[]): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return texts.some((t) => t.toLowerCase().includes(q));
}

// ── 컴포넌트 ──

export default function AppSettingsPage() {
  const { data: settings = [], isLoading } = useAppSettings();
  const updateSettings = useUpdateSettings();

  const [values, setValues] = useState<Record<string, string>>({});
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');
  const initialized = useRef(false);

  // 설정값 초기화
  useEffect(() => {
    if (initialized.current || settings.length === 0) return;
    initialized.current = true;

    const appValues: Record<string, string> = {};
    const menuLabels: Record<string, string> = {};

    for (const s of settings) {
      if (s.key.startsWith('app:') && s.value) {
        appValues[s.key] = s.value;
      }
      if (s.key.startsWith('menu_label:') && s.value) {
        const href = s.key.replace('menu_label:', '');
        menuLabels[href] = s.value;
      }
    }

    setValues(appValues);
    setLabels(menuLabels);
  }, [settings]);

  // 검색 필터링
  const filteredSections = useMemo(() => {
    if (!search) return settingSections;
    return settingSections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) =>
          matchesSearch(search, [item.label, item.description, ...item.keywords])
        ),
      }))
      .filter((section) => section.items.length > 0);
  }, [search]);

  const showMenuLabels = useMemo(() => {
    if (!search) return true;
    return matchesSearch(search, [
      '메뉴',
      '라벨',
      '이름',
      'menu',
      'label',
      ...menuEntries.map((e) => e.defaultTitle),
    ]);
  }, [search]);

  const handleSave = () => {
    const items: { key: string; value: string | null }[] = [];

    // 앱 설정
    for (const section of settingSections) {
      for (const item of section.items) {
        const val = values[item.key]?.trim();
        items.push({
          key: item.key,
          value: val || null,
        });
      }
    }

    // 메뉴 라벨
    for (const entry of menuEntries) {
      items.push({
        key: `menu_label:${entry.href}`,
        value: labels[entry.href]?.trim() || null,
      });
    }

    updateSettings.mutate(items);
  };

  if (isLoading) return <div className="p-4">로딩 중...</div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-lg font-semibold">앱 설정</h2>
        <p className="text-sm text-muted-foreground">
          세션, 화면, 메뉴 등 앱 전반의 설정을 관리합니다.
        </p>
      </div>

      {/* 검색 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="설정 검색..."
          className="pl-9"
        />
      </div>

      {/* 앱 설정 섹션 */}
      {filteredSections.map((section) => (
        <div key={section.title}>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 border-b pb-2">
            {section.title}
          </h3>
          <div className="space-y-4">
            {section.items.map((item) => {
              const currentValue = values[item.key] || String(item.fallback);
              return (
                <div key={item.key} className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{item.label}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {item.description}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={currentValue}
                      onChange={(e) => {
                        const v = e.target.value.replace(/[^0-9]/g, '');
                        setValues((prev) => ({
                          ...prev,
                          [item.key]: v,
                        }));
                      }}
                      onBlur={() => {
                        setValues((prev) => {
                          const raw = Number(prev[item.key]) || item.fallback;
                          const clamped = Math.max(item.min, Math.min(item.max, raw));
                          return { ...prev, [item.key]: String(clamped) };
                        });
                      }}
                      className="w-20 text-right"
                    />
                    <span className="text-sm text-muted-foreground w-6">
                      {item.suffix}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* 메뉴 라벨 섹션 */}
      {showMenuLabels && (
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 border-b pb-2">
            메뉴 라벨
          </h3>
          <p className="text-xs text-muted-foreground mb-3">
            사이드바에 표시되는 메뉴 이름을 변경합니다. 비워두면 기본 이름이 사용됩니다.
          </p>
          <div className="space-y-2">
            {menuEntries.map((entry) => (
              <div key={entry.href} className="flex items-center gap-3">
                <div className="flex items-center gap-2 w-32 shrink-0">
                  <entry.icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{entry.defaultTitle}</span>
                </div>
                <Input
                  value={labels[entry.href] || ''}
                  onChange={(e) =>
                    setLabels((prev) => ({
                      ...prev,
                      [entry.href]: e.target.value,
                    }))
                  }
                  placeholder={entry.defaultTitle}
                  className="max-w-[200px]"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 저장 */}
      <div className="flex items-center gap-3 pt-2">
        <Button onClick={handleSave} disabled={updateSettings.isPending}>
          {updateSettings.isPending ? '저장 중...' : '저장'}
        </Button>
        {updateSettings.isSuccess && (
          <p className="text-sm text-green-600">저장되었습니다.</p>
        )}
      </div>

      {/* 검색 결과 없음 */}
      {filteredSections.length === 0 && !showMenuLabels && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          "{search}"에 대한 검색 결과가 없습니다.
        </div>
      )}
    </div>
  );
}
