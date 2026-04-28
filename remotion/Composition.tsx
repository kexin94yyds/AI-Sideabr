import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';

export const AiSidebarIntro: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        background: '#ffffff',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Img
        src={staticFile('remotion/ai-sidebar-google-sidepanel.png')}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
        }}
      />
    </AbsoluteFill>
  );
};
