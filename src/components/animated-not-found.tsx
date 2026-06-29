import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Compass, ArrowLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AnimatedNotFound() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      <div className="absolute inset-0 bg-grid opacity-40" />
      <div className="absolute -left-32 top-1/4 h-72 w-72 rounded-full bg-coral/20 blur-3xl" />
      <div className="absolute -right-32 bottom-1/4 h-80 w-80 rounded-full bg-teal/20 blur-3xl" />
      <div className="relative z-10 max-w-lg text-center">
        <motion.div
          initial={{ rotate: -45, scale: 0 }}
          animate={{ rotate: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 120, damping: 12 }}
          className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-brand to-coral text-white glow"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          >
            <Compass className="h-12 w-12" />
          </motion.div>
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-7xl font-bold tracking-tight text-gradient"
        >
          404
        </motion.h1>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-3 text-2xl font-semibold"
        >
          You've drifted off course
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-3 text-muted-foreground"
        >
          The page you're looking for doesn't exist — but your career path is still wide open.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-8 flex flex-wrap justify-center gap-3"
        >
          <Button asChild>
            <Link to="/"><Home className="mr-2 h-4 w-4" /> Home</Link>
          </Button>
          <Button variant="outline" onClick={() => history.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Go back
          </Button>
        </motion.div>
      </div>
    </div>
  );
}