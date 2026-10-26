// Declaraciones mínimas de `ssh2` para el panel.
// El paquete no publica tipos y no se agrega `@types/ssh2` como dependencia;
// esto cubre sólo la superficie que usa `lib/ssh.ts` (provisioning por SSH).

declare module 'ssh2' {
  import { Readable, Writable } from 'node:stream'

  export interface ConnectConfig {
    host: string
    port?: number
    username?: string
    privateKey?: string
    password?: string
    readyTimeout?: number
    keepaliveInterval?: number
  }

  /** Canal de un comando remoto (`conn.exec`). */
  export interface ClientChannel {
    stderr: Readable
    on(event: 'close', listener: (code: number) => void): this
    on(event: 'data', listener: (chunk: Buffer) => void): this
    on(event: 'error', listener: (err: Error) => void): this
  }

  /** Subconjunto de la API SFTP usado para subir archivos. */
  export interface SFTPWrapper {
    createWriteStream(path: string): Writable
  }

  export interface ExecOptions {
    pty?: boolean
  }

  export class Client {
    constructor()
    connect(config: ConnectConfig): void
    on(event: 'ready', listener: () => void): this
    on(event: 'error', listener: (err: Error) => void): this
    exec(
      command: string,
      callback: (err: Error | undefined, channel: ClientChannel) => void
    ): void
    exec(
      command: string,
      options: ExecOptions,
      callback: (err: Error | undefined, channel: ClientChannel) => void
    ): void
    sftp(callback: (err: Error | undefined, sftp: SFTPWrapper) => void): void
    end(): void
  }
}
