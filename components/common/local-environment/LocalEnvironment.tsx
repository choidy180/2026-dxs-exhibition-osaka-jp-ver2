'use client';

import { useEffect } from 'react';
import { applyProps, useThree } from '@react-three/fiber';
import { PMREMGenerator } from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

/** Image-based lighting generated on the GPU without HDR files or network requests. */
export default function LocalEnvironment({ intensity = 1 }: { intensity?: number }) {
  const get = useThree(state => state.get);

  useEffect(() => {
    const { gl, scene, invalidate } = get();
    const room = new RoomEnvironment();
    const generator = new PMREMGenerator(gl);
    const environment = generator.fromScene(room, 0.04);
    const previous = {
      environment: scene.environment,
      environmentIntensity: scene.environmentIntensity,
    };

    applyProps(scene, { environment: environment.texture, environmentIntensity: intensity });
    invalidate();
    room.dispose();
    generator.dispose();

    return () => {
      if (scene.environment === environment.texture) {
        applyProps(scene, previous);
        invalidate();
      }
      environment.dispose();
    };
  }, [get, intensity]);

  return null;
}
