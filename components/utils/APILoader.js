import { getWindow } from '../utils/common'

const DEFAULT_CONFIG = {
    v: '1.4.0',
    hostAndPath: 'webapi.amap.com/maps',
    key: 'f97efc35164149d0c0f299e7a8adb3d2',
    callback: '__amap_init_callback',
    useAMapUI: false
}

let mainPromise = null
let amapuiPromise = null
let amapuiInited = false
export default class APILoader {
    constructor({ key, useAMapUI, version, protocol }) {
        this.config = { ...DEFAULT_CONFIG, useAMapUI, protocol}
        if (typeof getWindow() !== 'undefined') {
            if (key) {
                this.config.key = key
            } else if ('amapkey' in getWindow()) {
                this.config.key = getWindow().amapkey
            }
        }
        if (version) {
            this.config.v = version
        }
        this.protocol = protocol || getWindow().location.protocol
        if (this.protocol.indexOf(':') === -1) {
            this.protocol += ':'
        }
    }

    getScriptSrc(cfg) {
        return `${this.protocol}//${cfg.hostAndPath}?v=${cfg.v}&key=${cfg.key}&callback=${cfg.callback}`
    }

    buildScriptTag(src) {
        const script = getWindow().document.createElement('script')
        script.type = 'text/javascript'
        script.async = true
        script.defer = true
        script.src = src
        return script
    }

    getAmapuiPromise() {
        if (getWindow().AMapUI) {
            return Promise.resolve()
        }
        const script = this.buildScriptTag(`${this.protocol}//webapi.amap.com/ui/1.0/main-async.js`)
        const p = new Promise(resolve => {
            script.onload = () => {
                resolve()
            }
        })
        getWindow().document.body.appendChild(script)
        return p
    }

    getMainPromise() {
        if (getWindow().AMap) {
            return Promise.resolve()
        }
        const script = this.buildScriptTag(this.getScriptSrc(this.config))
        const p = new Promise(resolve => {
            getWindow()[this.config.callback] = () => {
                resolve()
                delete getWindow()[this.config.callback]
            }
        })
        getWindow().document.body.appendChild(script)
        return p
    }

    load() {
        if (typeof getWindow() === 'undefined') {
            return null
        }
        const { useAMapUI } = this.config
        mainPromise = mainPromise || this.getMainPromise()
        if (useAMapUI) {
            amapuiPromise = amapuiPromise || this.getAmapuiPromise()
        }
        return new Promise(resolve => {
            mainPromise.then(() => {
                if (useAMapUI && amapuiPromise) {
                    amapuiPromise.then(() => {
                        if (getWindow().initAMapUI && !amapuiInited) {
                            getWindow().initAMapUI()
                            if (typeof useAMapUI === 'function') {
                                useAMapUI()
                            }
                            amapuiInited = true
                        }
                        resolve()
                    })
                } else {
                    resolve()
                }
            })
        })
    }
}
