import React from 'react';
import {Composition} from 'remotion';
import {AiSidebarIntro} from './Composition';

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="AiSidebarIntro"
      component={AiSidebarIntro}
      durationInFrames={540}
      fps={30}
      width={1920}
      height={1080}
    />
  );
};
