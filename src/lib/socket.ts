import { Server as SocketIOServer, Socket } from "socket.io";
import { validateSessionToken } from "./auth";

type SocketUser = NonNullable<Awaited<ReturnType<typeof validateSessionToken>>>;
type SocketSessionValidator = (token: string) => Promise<SocketUser | null>;

/**
 * Parse raw Cookie header into key-value object
 */
function parseCookies(cookieHeader: string): Record<string, string> {
  const list: Record<string, string> = {};
  if (!cookieHeader) return list;
  cookieHeader.split(";").forEach((cookieStr) => {
    const parts = cookieStr.split("=");
    const name = parts.shift()?.trim();
    if (name) {
      try {
        list[name] = decodeURIComponent(parts.join("=").trim());
      } catch {
        list[name] = "";
      }
    }
  });
  return list;
}

export function canAccessSocketRoom(user: SocketUser | null, roomName: unknown): roomName is string {
  if (!user || typeof roomName !== "string" || roomName.length === 0 || roomName.length >= 50) {
    return false;
  }

  const roleName = user.role?.name;
  return roomName === `user_${user.id}` || (Boolean(roleName) && roomName === `role_${roleName}`);
}

export async function authorizeSocketConnection(
  socket: Socket,
  next: (error?: Error) => void,
  validateSession: SocketSessionValidator = validateSessionToken,
): Promise<void> {
  try {
    const cookies = parseCookies(socket.handshake.headers.cookie || "");
    const authToken = socket.handshake.auth?.token;
    const token = cookies.token || (typeof authToken === "string" ? authToken : undefined);

    if (!token) {
      (socket as any).user = null;
      next();
      return;
    }

    const user = await validateSession(token);
    if (!user) {
      next(new Error("unauthorized"));
      return;
    }

    (socket as any).user = user;
    next();
  } catch (error) {
    console.warn("Socket session validation failed:", error);
    next(new Error("unauthorized"));
  }
}

/**
 * Configure Socket.IO Server with session room management
 */
export function setupSocketIO(
  io: SocketIOServer,
  validateSession: SocketSessionValidator = validateSessionToken,
) {
  io.use((socket: Socket, next) => {
    void authorizeSocketConnection(socket, next, validateSession);
  });

  io.on("connection", (socket: Socket) => {
    const user = (socket as any).user;

    if (user) {
      // Join user specific room: user_${id}
      const userRoom = `user_${user.id}`;
      socket.join(userRoom);

      // Join role specific room: role_${roleName}
      if (user.role?.name) {
        const roleRoom = `role_${user.role.name}`;
        socket.join(roleRoom);
      }
    }

    // Keep the existing room events but only allow the socket's own private rooms.
    socket.on("join_room", (roomName: string) => {
      if (canAccessSocketRoom(user || null, roomName)) {
        socket.join(roomName);
      }
    });

    socket.on("leave_room", (roomName: string) => {
      if (canAccessSocketRoom(user || null, roomName)) {
        socket.leave(roomName);
      }
    });
  });
}

/**
 * Emit event strictly to a specific user ID
 */
export function emitToUser(io: SocketIOServer | undefined, userId: number, event: string, data: any) {
  if (io && userId) {
    io.to(`user_${userId}`).emit(event, data);
  }
}

/**
 * Emit event strictly to a specific role ("ADMIN", "REFERIDO", "PROFESSIONAL", etc)
 */
export function emitToRole(io: SocketIOServer | undefined, roleName: string, event: string, data: any) {
  if (io && roleName) {
    io.to(`role_${roleName}`).emit(event, data);
  }
}

/**
 * Emit event to a custom targeted room
 */
export function emitToRoom(io: SocketIOServer | undefined, roomName: string, event: string, data: any) {
  if (io && roomName) {
    io.to(roomName).emit(event, data);
  }
}
