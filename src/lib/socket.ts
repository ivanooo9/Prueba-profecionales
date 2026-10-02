import { Server as SocketIOServer, Socket } from "socket.io";
import { validateSessionToken } from "./auth";

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
      list[name] = decodeURIComponent(parts.join("=").trim());
    }
  });
  return list;
}

/**
 * Configure Socket.IO Server with session room management
 */
export function setupSocketIO(io: SocketIOServer) {
  io.use(async (socket: Socket, next) => {
    try {
      const rawCookie = socket.handshake.headers.cookie || "";
      const cookies = parseCookies(rawCookie);
      const token = cookies.token || socket.handshake.auth?.token;

      if (token) {
        const user = await validateSessionToken(token);
        if (user) {
          (socket as any).user = user;
        }
      }
      next();
    } catch (err) {
      console.warn("Socket auth middleware fallback:", err);
      next();
    }
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

    // Allow joining specific public rooms (conversatorios, cursos, etc)
    socket.on("join_room", (roomName: string) => {
      if (typeof roomName === "string" && roomName.length < 50) {
        socket.join(roomName);
      }
    });

    socket.on("leave_room", (roomName: string) => {
      if (typeof roomName === "string" && roomName.length < 50) {
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
