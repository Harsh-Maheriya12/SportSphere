// src/hooks/useGamesSocket.ts
import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";

type UseGamesSocketOptions = {
  url?: string; // default to window origin + / (set server socket endpoint)
  onGameUpdated?: (game: any) => void;
  onGameCreated?: (game: any) => void;
  onGameDeleted?: (gameId: string) => void;
};

export function useGamesSocket(opts: UseGamesSocketOptions) {
  const socketRef = useRef<Socket | null>(null);
  const url = opts.url || `${window.location.origin}`; // adjust if socket path is different

  useEffect(() => {
    const token = localStorage.getItem("token");
    socketRef.current = io(url, {
      auth: { token },
      path: "/socket.io", // change if you use different path
    });

    const socket = socketRef.current;

    socket.on("connect", () => {
      // console.log("socket connected", socket.id);
    });

    if (opts.onGameUpdated) socket.on("game:updated", opts.onGameUpdated);
    if (opts.onGameCreated) socket.on("game:created", opts.onGameCreated);
    if (opts.onGameDeleted) socket.on("game:deleted", opts.onGameDeleted);

    socket.on("disconnect", () => {
      // console.log("socket disconnected");
    });

    return () => {
      socket.off("game:updated");
      socket.off("game:created");
      socket.off("game:deleted");
      socket.disconnect();
    };
  }, [url]);

  return {
    emit: (event: string, payload?: any) => {
      socketRef.current?.emit(event, payload);
    },
    socket: socketRef.current,
  };
}
