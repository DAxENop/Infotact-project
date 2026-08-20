import { useEffect, useRef } from "react";
import { socket } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export function useTenantSocket(onCreated, onUpdated) {
  const { tenantId } = useAuth();
  const listenersRef = useRef({ onCreated, onUpdated });

  useEffect(() => {
    listenersRef.current = { onCreated, onUpdated };
  }, [onCreated, onUpdated]);

  useEffect(() => {
    if (!tenantId) return;

    socket.connect();
    socket.emit("join", tenantId);

    const handleCreated = (doc) => listenersRef.current.onCreated?.(doc);
    const handleUpdated = (doc) => listenersRef.current.onUpdated?.(doc);

    socket.on("ledger:created", handleCreated);
    socket.on("ledger:updated", handleUpdated);

    return () => {
      socket.off("ledger:created", handleCreated);
      socket.off("ledger:updated", handleUpdated);
      socket.disconnect();
    };
  }, [tenantId]);
}
