import React from 'react';
import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

const features = [
  'Keep the original page in view',
  'Switch between AI providers fast',
  'Save, export, and revisit history',
  'Local-first workspace data',
];

export const AiSidebarIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const seconds = (time: number) => time * fps;
  const enter = (start: number, duration: number) =>
    interpolate(frame, [seconds(start), seconds(start + duration)], [0, 1], {
      easing: Easing.bezier(0.16, 1, 0.3, 1),
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });

  const titleProgress = enter(0, 1.1);
  const panelProgress = enter(1.2, 1.1);

  const cursorX = interpolate(frame, [seconds(3), seconds(6.3), seconds(10.7), seconds(14.3)], [1120, 1525, 1280, 1510], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.45, 0, 0.55, 1),
  });

  const cursorY = interpolate(frame, [seconds(3), seconds(6.3), seconds(10.7), seconds(14.3)], [296, 292, 466, 650], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.45, 0, 0.55, 1),
  });

  return (
    <AbsoluteFill
      style={{
        background: '#f5f7fb',
        color: '#121826',
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(135deg, rgba(36, 104, 255, 0.10), rgba(0, 0, 0, 0) 42%), linear-gradient(315deg, rgba(24, 181, 132, 0.12), rgba(0, 0, 0, 0) 48%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 120,
          top: 120,
          width: 660,
          opacity: titleProgress,
          transform: `translateY(${interpolate(titleProgress, [0, 1], [24, 0])}px)`,
        }}
      >
        <div
          style={{
            fontSize: 34,
            fontWeight: 700,
            color: '#2468ff',
            marginBottom: 24,
          }}
        >
          AI Sidebar
        </div>
        <div
          style={{
            fontSize: 78,
            lineHeight: 1.04,
            fontWeight: 780,
            letterSpacing: 0,
          }}
        >
          Turn every AI website into one workspace.
        </div>
        <div
          style={{
            marginTop: 34,
            fontSize: 30,
            lineHeight: 1.45,
            color: '#4b5565',
            maxWidth: 590,
          }}
        >
          Search, switch, save, export, and stay in context from the browser side panel.
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          left: 860,
          top: 110,
          width: 880,
          height: 760,
          opacity: panelProgress,
          transform: `translateX(${interpolate(panelProgress, [0, 1], [70, 0])}px)`,
          display: 'flex',
          gap: 22,
        }}
      >
        <div
          style={{
            flex: 1,
            borderRadius: 8,
            background: '#ffffff',
            boxShadow: '0 24px 80px rgba(31, 41, 55, 0.16)',
            border: '1px solid rgba(17, 24, 39, 0.08)',
            padding: 32,
          }}
        >
          <div
            style={{
              height: 22,
              width: 170,
              borderRadius: 999,
              background: '#dce6ff',
              marginBottom: 34,
            }}
          />
          {features.map((feature, index) => {
            const itemProgress = enter(2.3 + index * 0.85, 0.8);

            return (
              <div
                key={feature}
                style={{
                  opacity: itemProgress,
                  transform: `translateY(${interpolate(itemProgress, [0, 1], [18, 0])}px)`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 18,
                  marginBottom: 26,
                  padding: '22px 24px',
                  borderRadius: 8,
                  background: index % 2 === 0 ? '#f7f9fe' : '#f1fbf7',
                  border: '1px solid rgba(17, 24, 39, 0.06)',
                  fontSize: 25,
                  fontWeight: 650,
                }}
              >
                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 18,
                    background: index % 2 === 0 ? '#2468ff' : '#18a779',
                  }}
                />
                {feature}
              </div>
            );
          })}
        </div>

        <div
          style={{
            width: 290,
            borderRadius: 8,
            background: '#101828',
            color: '#ffffff',
            boxShadow: '0 24px 80px rgba(31, 41, 55, 0.22)',
            padding: 24,
          }}
        >
          <div
            style={{
              fontSize: 22,
              fontWeight: 750,
              marginBottom: 28,
            }}
          >
            Providers
          </div>
          {['ChatGPT', 'Gemini', 'Claude', 'NotebookLM', 'DeepSeek'].map((provider, index) => (
            <div
              key={provider}
              style={{
                padding: '18px 16px',
                marginBottom: 14,
                borderRadius: 8,
                background: index === 1 ? '#2468ff' : 'rgba(255,255,255,0.08)',
                fontSize: 21,
                fontWeight: 650,
              }}
            >
              {provider}
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          left: cursorX,
          top: cursorY,
          width: 30,
          height: 30,
          borderRadius: 30,
          background: '#ffffff',
          border: '8px solid #2468ff',
          boxShadow: '0 12px 28px rgba(36, 104, 255, 0.35)',
          opacity: interpolate(frame, [70, 92, 490, 530], [0, 1, 1, 0], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing: Easing.bezier(0.45, 0, 0.55, 1),
          }),
        }}
      />

      <div
        style={{
          position: 'absolute',
          left: 120,
          bottom: 96,
          display: 'flex',
          alignItems: 'center',
          gap: 18,
          fontSize: 24,
          color: '#516071',
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 8,
            background: '#2468ff',
          }}
        />
        Browser side panel for focused AI workflows
      </div>
    </AbsoluteFill>
  );
};
