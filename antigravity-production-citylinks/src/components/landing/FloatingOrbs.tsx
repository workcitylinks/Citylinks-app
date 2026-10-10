import { motion } from "framer-motion";

const FloatingOrbs = () => {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
      <motion.div
        animate={{
          x: [0, 30, -20, 0],
          y: [0, -40, 20, 0],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[10%] left-[15%] w-72 h-72 rounded-full bg-portal-customer/8 blur-3xl"
      />
      <motion.div
        animate={{
          x: [0, -25, 35, 0],
          y: [0, 30, -25, 0],
        }}
        transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[60%] right-[10%] w-96 h-96 rounded-full bg-portal-labor/6 blur-3xl"
      />
      <motion.div
        animate={{
          x: [0, 20, -30, 0],
          y: [0, -20, 30, 0],
        }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-[20%] left-[40%] w-64 h-64 rounded-full bg-portal-merchant/6 blur-3xl"
      />
    </div>
  );
};

export default FloatingOrbs;
