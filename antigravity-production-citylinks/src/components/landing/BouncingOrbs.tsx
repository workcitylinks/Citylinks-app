import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

const BouncingOrbs = () => {
  const constraintsRef = useRef(null);

  return (
    <motion.div
      ref={constraintsRef}
      className="absolute inset-0 overflow-hidden"
    >
      <motion.div
        className="w-32 h-32 bg-blue-500 rounded-full"
        drag
        dragConstraints={constraintsRef}
        animate={{
          x: [0, 100, 0],
          y: [0, -100, 0],
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          repeatType: 'reverse',
        }}
      />
      <motion.div
        className="w-24 h-24 bg-green-500 rounded-full"
        drag
        dragConstraints={constraintsRef}
        animate={{
          x: [0, -150, 0],
          y: [0, 150, 0],
        }}
        transition={{
          duration: 7,
          repeat: Infinity,
          repeatType: 'reverse',
        }}
      />
      <motion.div
        className="w-16 h-16 bg-red-500 rounded-full"
        drag
        dragConstraints={constraintsRef}
        animate={{
          x: [0, 50, 0],
          y: [0, -50, 0],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          repeatType: 'reverse',
        }}
      />
    </motion.div>
  );
};

export default BouncingOrbs;
