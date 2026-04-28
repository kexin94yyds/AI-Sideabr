import React from 'react';
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

const clamp = {
  extrapolateLeft: 'clamp' as const,
  extrapolateRight: 'clamp' as const,
};

const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
const easeInOut = Easing.bezier(0.45, 0, 0.55, 1);

type CaptionProps = {
  from: number;
  to: number;
  eyebrow: string;
  title: string;
  body: string;
};

const Caption: React.FC<CaptionProps> = ({from, to, eyebrow, title, body}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const enter = interpolate(frame, [from * fps, (from + 0.6) * fps], [0, 1], {
    ...clamp,
    easing: easeOut,
  });
  const exit = interpolate(frame, [(to - 0.45) * fps, to * fps], [1, 0], {
    ...clamp,
    easing: Easing.in(Easing.cubic),
  });
  const progress = Math.min(enter, exit);

  return (
    <div
      style={{
        position: 'absolute',
        left: 96,
        bottom: 88,
        width: 760,
        padding: '34px 38px 36px',
        borderRadius: 8,
        background: 'rgba(255, 255, 255, 0.92)',
        boxShadow: '0 24px 80px rgba(31, 41, 55, 0.18)',
        opacity: progress,
        transform: `translateY(${interpolate(progress, [0, 1], [26, 0])}px)`,
      }}
    >
      <div
        style={{
          color: '#2468ff',
          fontSize: 24,
          fontWeight: 760,
          marginBottom: 16,
        }}
      >
        {eyebrow}
      </div>
      <div
        style={{
          color: '#111827',
          fontSize: 50,
          fontWeight: 820,
          lineHeight: 1.06,
          letterSpacing: 0,
        }}
      >
        {title}
      </div>
      <div
        style={{
          color: '#4b5565',
          fontSize: 25,
          lineHeight: 1.38,
          marginTop: 18,
        }}
      >
        {body}
      </div>
    </div>
  );
};

type FocusFrameProps = {
  from: number;
  to: number;
  left: number;
  top: number;
  width: number;
  height: number;
};

const FocusFrame: React.FC<FocusFrameProps> = ({from, to, left, top, width, height}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const enter = interpolate(frame, [from * fps, (from + 0.45) * fps], [0, 1], {
    ...clamp,
    easing: easeOut,
  });
  const exit = interpolate(frame, [(to - 0.4) * fps, to * fps], [1, 0], {
    ...clamp,
    easing: Easing.in(Easing.cubic),
  });
  const progress = Math.min(enter, exit);

  return (
    <div
      style={{
        position: 'absolute',
        left,
        top,
        width,
        height,
        borderRadius: 12,
        border: '5px solid #2468ff',
        boxShadow: '0 0 0 999px rgba(8, 13, 23, 0.26), 0 18px 55px rgba(36, 104, 255, 0.28)',
        opacity: progress,
      }}
    />
  );
};

export const AiSidebarIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const seconds = (time: number) => time * fps;

  const camera = interpolate(
    frame,
    [seconds(0), seconds(4.5), seconds(8.2), seconds(12.4), seconds(18)],
    [0, 1, 2, 3, 4],
    {
      ...clamp,
      easing: easeInOut,
    },
  );

  const scale = interpolate(camera, [0, 1, 2, 3, 4], [1, 1.05, 1.18, 1.12, 1.02]);
  const x = interpolate(camera, [0, 1, 2, 3, 4], [0, -70, -330, -210, 0]);
  const y = interpolate(camera, [0, 1, 2, 3, 4], [0, 0, -20, 18, 0]);

  const titleOpacity = interpolate(frame, [seconds(0.2), seconds(1.2), seconds(4.2), seconds(4.9)], [1, 1, 1, 0], {
    ...clamp,
    easing: easeInOut,
  });

  return (
    <AbsoluteFill
      style={{
        background: '#f5f7fb',
        color: '#121826',
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        overflow: 'hidden',
      }}
    >
      <Img
        src={staticFile('remotion/ai-sidebar-google-sidepanel.png')}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: `translate(${x}px, ${y}px) scale(${scale})`,
          transformOrigin: 'center center',
        }}
      />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(90deg, rgba(245, 247, 251, 0.62), rgba(245, 247, 251, 0.18) 38%, rgba(245, 247, 251, 0) 72%)',
          opacity: titleOpacity,
        }}
      />

      <div
        style={{
          position: 'absolute',
          left: 104,
          top: 94,
          opacity: titleOpacity,
        }}
      >
        <div
          style={{
            color: '#2468ff',
            fontSize: 34,
            fontWeight: 780,
            marginBottom: 22,
          }}
        >
          AI Sidebar
        </div>
        <div
          style={{
            color: '#111827',
            fontSize: 74,
            fontWeight: 840,
            lineHeight: 1.04,
            maxWidth: 770,
            letterSpacing: 0,
          }}
        >
          Work with AI without losing your page.
        </div>
      </div>

      <FocusFrame from={4.6} to={8.8} left={1320} top={46} width={505} height={986} />
      <FocusFrame from={8.6} to={12.8} left={1812} top={28} width={96} height={1018} />

      <Caption
        from={4.8}
        to={8.6}
        eyebrow="Side panel workflow"
        title="Ask AI while the original page stays visible."
        body="Your browser page and AI assistant stay side by side, so context is not lost."
      />
      <Caption
        from={8.8}
        to={12.7}
        eyebrow="Fast provider switching"
        title="Jump between AI tools from one rail."
        body="Gemini, ChatGPT, Claude, Perplexity and more stay one click away."
      />
      <Caption
        from={12.9}
        to={17.6}
        eyebrow="AI Sidebar"
        title="One workspace for focused AI browsing."
        body="Search, compare, save and continue your work without constantly switching tabs."
      />
    </AbsoluteFill>
  );
};
