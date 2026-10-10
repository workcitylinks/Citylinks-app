import { motion } from "framer-motion";

const HeroSection = () => {
  return (
    <div className="text-center mb-16 md:mb-20">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="inline-flex items-center gap-2 glass rounded-full px-4 py-2 mb-6"
      >
        <span className="w-2 h-2 rounded-full bg-portal-merchant animate-pulse-glow" />
        <span className="text-sm font-medium text-muted-foreground">
          Hyperlocal Services Platform
        </span>
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6"
      >
        Welcome to{" "}
        <span className="text-gradient-hero">CityLinks</span>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed"
      >
        Connecting customers, merchants, service providers, and administrators
        in one unified hyperlocal marketplace.
      </motion.p>
    </div>
  );
};

export default HeroSection;
