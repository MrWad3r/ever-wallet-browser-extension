import '../polyfills'

import LocalMessageDuplexStream from 'post-message-stream'
import ObjectMultiplex from 'obj-multiplex'
import pump from 'pump'

import { PortDuplexStream } from '@shared/utils'
import { CONTENT_SCRIPT, INPAGE_SCRIPT, NEKOTON_PROVIDER } from '@shared/constants'

const logStreamDisconnectWarning = (remoteLabel: string, error?: Error) => {
    console.debug(`Nekoton: Content script lost connection to "${remoteLabel}"`, error)
}

const checkDoctype = () => {
    const { doctype } = window.document
    if (doctype) {
        return doctype.name === 'html'
    }
    return true
}

const checkSuffix = () => {
    const excludedTypes = [/\.xml$/u, /\.pdf$/u]
    const currentUrl = window.location.pathname
    for (const type of excludedTypes) {
        if (type.test(currentUrl)) {
            return false
        }
    }
    return true
}

const checkDocumentElement = () => {
    const documentElement = document.documentElement.nodeName
    if (documentElement) {
        return documentElement.toLowerCase() === 'html'
    }
    return true
}

const shouldInjectProvider = () => checkDoctype() && checkSuffix() && checkDocumentElement()

const injectScript = () => {
    try {
        const container = document.head || document.documentElement
        const scriptTag = document.createElement('script')
        scriptTag.src = chrome.extension.getURL('inpage.js')
        scriptTag.setAttribute('async', 'false')
        container.insertBefore(scriptTag, container.children[0])
        container.removeChild(scriptTag)
    } catch (e) {
        console.error('Nekoton: Provider injection failed', e)
    }
}

const forwardTrafficBetweenMutexes = (
    channelName: string,
    a: ObjectMultiplex,
    b: ObjectMultiplex
) => {
    const channelA = a.createStream(channelName)
    const channelB = b.createStream(channelName)
    pump(channelA, channelB, channelA, (e) => {
        console.debug(`Nekoton: Muxed traffic for channel "${channelName}" failed`, e)
    })
}

const notifyInpageOfStreamFailure = () => {
    window.postMessage(
        {
            target: INPAGE_SCRIPT,
            data: {
                name: NEKOTON_PROVIDER,
                data: {
                    jsonrpc: '2.0',
                    method: 'NEKOTON_STREAM_FAILURE',
                },
            },
        },
        window.location.origin
    )
}

const setupStreams = () => {
    const pageStream = new LocalMessageDuplexStream({
        name: CONTENT_SCRIPT,
        target: INPAGE_SCRIPT,
    })
    const extensionPort = chrome.runtime.connect({ name: CONTENT_SCRIPT })
    const extensionStream = new PortDuplexStream(extensionPort)

    const pageMux = new ObjectMultiplex()
    pageMux.setMaxListeners(25)
    const extensionMux = new ObjectMultiplex()
    extensionMux.setMaxListeners(25)

    pump(pageMux, pageStream, pageMux, (e) => {
        logStreamDisconnectWarning('Nekoton inpage multiplex', e)
    })
    pump(extensionMux, extensionStream, extensionMux, (e) => {
        logStreamDisconnectWarning('Nekoton background multiplex', e)
        notifyInpageOfStreamFailure()
    })
    forwardTrafficBetweenMutexes(NEKOTON_PROVIDER, pageMux, extensionMux)
}

if (shouldInjectProvider()) {
    injectScript()
    setupStreams()
}
