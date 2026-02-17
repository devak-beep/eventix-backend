import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ParticleEventixLogo } from "./ParticleEventixLogo";
import { ExplodingEventixLogo } from "./ExplodingEventixLogo";
import { MatrixEventixLogo } from "./MatrixEventixLogo";

interface FullScreenLogoSequenceProps {
  onComplete: () => void;
}

export function FullScreenLogoSequence({ onComplete }: FullScreenLogoSequenceProps) {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setStage(1), 3000),  // Particle -> Exploding
      setTimeout(() => setStage(2), 6000),  // Exploding -> Matrix
      setTimeout(() => onComplete(), 9000)  // Matrix -> Redirect
    ];
    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {stage === 0 && <ParticleEventixLogo width={400} height={400} />}
      {stage === 1 && <ExplodingEventixLogo width={400} height={400} />}
      {stage === 2 && <MatrixEventixLogo width={400} height={400} />}
    </motion.div>
  );
}
