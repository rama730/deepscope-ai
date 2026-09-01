"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Bell } from "lucide-react";

interface NotificationRealTimeIndicatorProps {
  show: boolean;
}

export default function NotificationRealTimeIndicator({
  show,
}: NotificationRealTimeIndicatorProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.8 }}
          className="fixed top-20 right-4 z-50 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2"
        >
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ repeat: Infinity, duration: 0.5 }}
          >
            <Bell className="w-4 h-4" />
          </motion.div>
          <span className="text-sm font-medium">New notification</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
