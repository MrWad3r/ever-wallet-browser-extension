import '../polyfills'

import safeStringify from 'fast-safe-stringify'
import { EventEmitter } from 'events'
import { Duplex } from 'readable-stream'
import promiseToCallback from 'promise-to-callback'

import {
    JsonRpcEngineNextCallback,
    JsonRpcEngineEndCallback,
    JsonRpcNotification,
    JsonRpcMiddleware,
    JsonRpcRequest,
    PendingJsonRpcResponse,
    JsonRpcEngine,
} from './jrpc'

const MAX = 4294967295

let idCounter = Math.floor(Math.random() * MAX)

export const getUniqueId = (): number => {
    idCounter = (idCounter + 1) % MAX
    return idCounter
}

export enum RpcErrorCode {
    INTERNAL,
    TRY_AGAIN_LATER,
    INVALID_REQUEST,
    RESOURCE_UNAVAILABLE,
    METHOD_NOT_FOUND,
}

export type Maybe<T> = Partial<T> | null | undefined

export type ConsoleLike = Pick<Console, 'log' | 'warn' | 'error' | 'debug' | 'info' | 'trace'>

type Handler = (...args: any[]) => void

interface EventMap {
    [k: string]: Handler | Handler[] | undefined
}

function safeApply<T, A extends any[]>(
    handler: (this: T, ...args: A) => void,
    context: T,
    args: A
): void {
    try {
        Reflect.apply(handler, context, args)
    } catch (err) {
        // Throw error after timeout so as not to interrupt the stack
        setTimeout(() => {
            throw err
        })
    }
}

function arrayClone<T>(arr: T[]): T[] {
    const n = arr.length
    const copy = new Array(n)
    for (let i = 0; i < n; i += 1) {
        copy[i] = arr[i]
    }
    return copy
}

export class SafeEventEmitter extends EventEmitter {
    emit(type: string, ...args: any[]): boolean {
        let doError = type === 'error'

        const events: EventMap = (this as any)._events
        if (events !== undefined) {
            doError = doError && events.error === undefined
        } else if (!doError) {
            return false
        }

        if (doError) {
            let er
            if (args.length > 0) {
                ;[er] = args
            }
            if (er instanceof Error) {
                throw er
            }

            const err = new Error(`Unhandled error.${er ? ` (${er.message})` : ''}`)
            ;(err as any).context = er
            throw err
        }

        const handler = events[type]

        if (handler === undefined) {
            return false
        }

        if (typeof handler === 'function') {
            safeApply(handler, this, args)
        } else {
            const len = handler.length
            const listeners = arrayClone(handler)
            for (let i = 0; i < len; i += 1) {
                safeApply(listeners[i], this, args)
            }
        }

        return true
    }
}

const callbackNoop = (error?: Error) => {
    if (error) {
        throw error
    }
}

export const nodeify = <C>(fn: Function, context: C) => {
    return function (...args: unknown[]) {
        const lastArg = args[args.length - 1]
        const lastArgIsCallback = typeof lastArg === 'function'

        let callback
        if (lastArgIsCallback) {
            callback = lastArg
            args.pop()
        } else {
            callback = callbackNoop
        }

        let result
        try {
            result = Promise.resolve(fn.apply(context, args))
        } catch (e) {
            result = Promise.reject(e)
        }
        promiseToCallback(result)(callback)
    }
}

export class PortDuplexStream extends Duplex {
    private port: chrome.runtime.Port

    constructor(port: chrome.runtime.Port) {
        super({ objectMode: true })
        this.port = port
        this.port.onMessage.addListener((msg: unknown) => this._onMessage(msg))
        this.port.onDisconnect.addListener(() => {
            console.log('onDisconnect')
            this._onDisconnect()
        })
    }

    private _onMessage(msg: unknown) {
        if (Buffer.isBuffer(msg)) {
            const data: Buffer = Buffer.from(msg)
            this.push(data)
        } else {
            this.push(msg)
        }
    }

    private _onDisconnect() {
        this.destroy()
    }

    _read() {
        return undefined
    }

    _write(message: unknown, _encoding: BufferEncoding, callback: (error?: Error | null) => void) {
        try {
            if (Buffer.isBuffer(message)) {
                const data: Record<string, unknown> = message.toJSON()
                data._isBuffer = true
                this.port.postMessage(data)
            } else {
                this.port.postMessage(message)
            }
        } catch (e) {
            return callback(new Error('PortDuplexStream - disconnected'))
        }
        return callback()
    }
}

export const logStreamDisconnectWarning = (
    log: ConsoleLike,
    remoteLabel: string,
    error: Error | undefined,
    emitter: EventEmitter
) => {
    let warningMsg = `Nekoton: Lost connection to "${remoteLabel}".`
    if (error?.stack) {
        warningMsg += `\n${error.stack}`
    }
    log.warn(warningMsg)
    if (emitter && emitter.listenerCount('error') > 0) {
        emitter.emit('error', warningMsg)
    }
}

export const getRpcPromiseCallback = (
    resolve: (value?: any) => void,
    reject: (error?: Error) => void,
    unwrapResult = true
) => (error: Error, response: PendingJsonRpcResponse<unknown>) => {
    if (error || response.error) {
        reject(error || response.error)
    } else {
        !unwrapResult || Array.isArray(response) ? resolve(response) : resolve(response.result)
    }
}

interface EngineStreamOptions {
    engine: JsonRpcEngine
}

export const createEngineStream = (options: EngineStreamOptions): Duplex => {
    if (!options || !options.engine) {
        throw new Error('Missing engine parameter!')
    }

    const { engine } = options
    const stream = new Duplex({
        objectMode: true,
        read: () => {
            return false
        },
        write: (
            request: JsonRpcRequest<unknown>,
            _encoding: unknown,
            cb: (error?: Error | null) => void
        ) => {
            engine.handle(request, (_err, res) => {
                stream.push(res)
            })
            cb()
        },
    })

    if (engine.on) {
        engine.on('notification', (message) => {
            stream.push(message)
        })
    }

    return stream
}

interface IdMapValue {
    req: JsonRpcRequest<unknown>
    res: PendingJsonRpcResponse<unknown>
    next: JsonRpcEngineNextCallback
    end: JsonRpcEngineEndCallback
}

interface IdMap {
    [requestId: string]: IdMapValue
}

export const createStreamMiddleware = () => {
    const idMap: IdMap = {}
    const stream = new Duplex({
        objectMode: true,
        read: readNoop,
        write: processMessage,
    })

    const events = new SafeEventEmitter()

    const middleware: JsonRpcMiddleware<unknown, unknown> = (req, res, next, end) => {
        stream.push(req)
        idMap[(req.id as unknown) as string] = { req, res, next, end }
    }

    return { events, middleware, stream }

    function readNoop() {
        return false
    }

    function processMessage(
        res: PendingJsonRpcResponse<unknown>,
        _encoding: unknown,
        cb: (error?: Error | null) => void
    ) {
        let err
        try {
            const isNotification = !res.id
            if (isNotification) {
                processNotification((res as unknown) as JsonRpcNotification<unknown>)
            } else {
                processResponse(res)
            }
        } catch (_err) {
            err = _err
        }
        cb(err)
    }

    function processResponse(res: PendingJsonRpcResponse<unknown>) {
        const context = idMap[(res.id as unknown) as string]
        if (!context) {
            throw new Error(`StreamMiddleware: Unknown response id "${res.id}"`)
        }

        delete idMap[(res.id as unknown) as string]
        Object.assign(context.res, res)
        setTimeout(context.end)
    }

    function processNotification(res: JsonRpcNotification<unknown>) {
        events.emit('notification', res)
    }
}

export const createErrorMiddleware = (log: ConsoleLike): JsonRpcMiddleware<unknown, unknown> => {
    return (req, res, next) => {
        if (!req.method) {
            res.error = new NekotonRpcError(
                RpcErrorCode.INVALID_REQUEST,
                "The request 'method' must be a non-empty string."
            )
        }

        next((done) => {
            const { error } = res
            if (!error) {
                return done()
            }
            log.error(`Nekoton: RPC Error: ${error.message}`, error)
            return done()
        })
    }
}

export const createIdRemapMiddleware = (): JsonRpcMiddleware<unknown, unknown> => {
    return (req, res, next, _end) => {
        const originalId = req.id
        const newId = getUniqueId()
        req.id = newId
        res.id = newId
        next((done) => {
            req.id = originalId
            res.id = originalId
            done()
        })
    }
}

export interface JsonRpcError {
    code: number
    message: string
    data?: unknown
    stack?: string
}

export class NekotonRpcError<T> extends Error {
    code: number
    data?: T

    constructor(code: number, message: string, data?: T) {
        if (!Number.isInteger(code)) {
            throw new Error('"code" must be an integer')
        }

        if (!message || (typeof message as any) !== 'string') {
            throw new Error('"message" must be a nonempty string')
        }

        super(message)

        this.code = code
        this.data = data
    }

    serialize(): JsonRpcError {
        const serialized: JsonRpcError = {
            code: this.code,
            message: this.message,
        }
        if (this.data !== undefined) {
            serialized.data = this.data
        }
        if (this.stack) {
            serialized.stack = this.stack
        }
        return serialized
    }

    toString(): string {
        return safeStringify(this.serialize(), stringifyReplacer, 2)
    }
}

const FALLBACK_ERROR: JsonRpcError = {
    code: RpcErrorCode.INTERNAL,
    message: 'Unspecified error message',
}

export const serializeError = (
    error: unknown,
    { fallbackError = FALLBACK_ERROR, shouldIncludeStack = false } = {}
): JsonRpcError => {
    if (
        !fallbackError ||
        !Number.isInteger(fallbackError.code) ||
        (typeof fallbackError.message as any) !== 'string'
    ) {
        throw new Error('Must provide fallback error with integer number code and string message')
    }

    if (error instanceof NekotonRpcError) {
        return error.serialize()
    }

    const serialized: Partial<JsonRpcError> = {}

    if (
        error &&
        typeof error === 'object' &&
        !Array.isArray(error) &&
        hasKey(error as Record<string, unknown>, 'code')
    ) {
        const typedError = error as Partial<JsonRpcError>
        serialized.code = typedError.code

        if (typedError.message && (typeof typedError.message as any) === 'string') {
            serialized.message = typedError.message

            if (hasKey(typedError, 'data')) {
                serialized.data = typedError.data
            }
        } else {
            serialized.message = 'TODO: get message from code'

            serialized.data = { originalError: assignOriginalError(error) }
        }
    } else {
        serialized.code = fallbackError.code

        const message = (error as any)?.message

        serialized.message =
            message && typeof message === 'string' ? message : fallbackError.message
        serialized.data = { originalError: assignOriginalError(error) }
    }

    const stack = (error as any)?.stack

    if (shouldIncludeStack && error && stack && (typeof stack as any) === 'stack') {
        serialized.stack = stack
    }

    return serialized as JsonRpcError
}

export const jsonify = <T extends {}>(request: T): string => {
    return safeStringify(request, stringifyReplacer, 2)
}

const stringifyReplacer = (_: unknown, value: unknown): unknown => {
    if (value === '[Circular]') {
        return undefined
    }
    return value
}

const assignOriginalError = (error: unknown): unknown => {
    if (error && typeof error === 'object' && !Array.isArray(error)) {
        return Object.assign({}, error)
    }
    return error
}

const hasKey = (obj: Record<string, unknown>, key: string) => {
    return Object.prototype.hasOwnProperty.call(obj, key)
}