import assert from "node:assert/strict";
import test from "node:test";
import type { Server as SocketIOServer, Socket } from "socket.io";
import { setupSocketIO } from "../lib/socket";

type Middleware = (socket: Socket, next: (error?: Error) => void) => void;
type ConnectionHandler = (socket: Socket) => void;

function createSocket(handshake: Record<string, any>) {
  const handlers = new Map<string, (value: any) => void>();
  const joined: string[] = [];
  const left: string[] = [];
  const socket = {
    handshake: {
      headers: handshake.headers || {},
      auth: handshake.auth || {},
    },
    join(room: string) {
      joined.push(room);
    },
    leave(room: string) {
      left.push(room);
    },
    on(event: string, handler: (value: any) => void) {
      handlers.set(event, handler);
    },
  } as unknown as Socket;

  return { socket, handlers, joined, left };
}

function setup(validator: (token: string) => Promise<any>) {
  let middleware: Middleware | undefined;
  let connection: ConnectionHandler | undefined;
  const io = {
    use(handler: Middleware) {
      middleware = handler;
    },
    on(event: string, handler: ConnectionHandler) {
      if (event === "connection") connection = handler;
    },
  } as unknown as SocketIOServer;

  setupSocketIO(io, validator);
  assert.ok(middleware);
  assert.ok(connection);
  return { middleware, connection };
}

function runMiddleware(middleware: Middleware, socket: Socket): Promise<Error | undefined> {
  return new Promise((resolve) => middleware(socket, resolve));
}

test("anonymous sockets remain connected but cannot join private rooms", async () => {
  const { middleware, connection } = setup(async () => null);
  const fake = createSocket({});

  assert.equal(await runMiddleware(middleware, fake.socket), undefined);
  connection(fake.socket);
  fake.handlers.get("join_room")?.("user_42");
  fake.handlers.get("join_room")?.("role_ADMIN");

  assert.deepEqual(fake.joined, []);
  assert.equal(fake.handlers.has("join_room"), true);
  assert.equal(fake.handlers.has("leave_room"), true);
});

test("invalid presented sessions are rejected", async () => {
  const { middleware } = setup(async () => null);
  const fake = createSocket({ auth: { token: "revoked-session" } });
  const error = await runMiddleware(middleware, fake.socket);

  assert.equal(error?.message, "unauthorized");
});

test("valid cookie session retains own rooms and cannot select another user's or role's room", async () => {
  const user = { id: 42, role: { name: "REFERIDO" } };
  const validatedTokens: string[] = [];
  const { middleware, connection } = setup(async (token) => {
    validatedTokens.push(token);
    return token === "active-session" ? user : null;
  });
  const fake = createSocket({ headers: { cookie: "other=value; token=active-session" } });

  assert.equal(await runMiddleware(middleware, fake.socket), undefined);
  connection(fake.socket);
  fake.handlers.get("join_room")?.("user_99");
  fake.handlers.get("join_room")?.("role_ADMIN");
  fake.handlers.get("join_room")?.("user_42");
  fake.handlers.get("leave_room")?.("user_99");
  fake.handlers.get("leave_room")?.("user_42");

  assert.deepEqual(validatedTokens, ["active-session"]);
  assert.deepEqual(fake.joined, ["user_42", "role_REFERIDO", "user_42"]);
  assert.deepEqual(fake.left, ["user_42"]);
});

test("socket auth token remains supported and validator errors reject the handshake", async () => {
  const user = { id: 7, role: { name: "ADMIN" } };
  const accepted = setup(async (token) => token === "active-auth-token" ? user : null);
  const acceptedSocket = createSocket({ auth: { token: "active-auth-token" } });
  assert.equal(await runMiddleware(accepted.middleware, acceptedSocket.socket), undefined);

  const failed = setup(async () => {
    throw new Error("database unavailable");
  });
  const failedSocket = createSocket({ auth: { token: "active-auth-token" } });
  const error = await runMiddleware(failed.middleware, failedSocket.socket);
  assert.equal(error?.message, "unauthorized");
});