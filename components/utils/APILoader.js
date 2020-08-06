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
    constructor({ key, useAMapUI, version, protocol, iFrameDom, iFrameWindow }) {
        this.config = { ...DEFAULT_CONFIG, useAMapUI, protocol, iFrameDom, iFrameWindow}
        if (typeof window !== 'undefined') {
            if (key) {
                this.config.key = key
            } else if ('amapkey' in this.config.iFrameWindow) {
                this.config.key = this.config.iFrameWindow.amapkey
            }
        }
        if (version) {
            this.config.v = version
        }
        this.protocol = protocol || this.config.iFrameWindow.location.protocol
        if (this.protocol.indexOf(':') === -1) {
            this.protocol += ':'
        }
    }

    getScriptSrc(cfg) {
        return `${this.protocol}//${cfg.hostAndPath}?v=${cfg.v}&key=${cfg.key}&callback=${cfg.callback}`
    }

    buildScriptTag(src) {
        const iFrameDom= this.config.iFrameDom;
        const iFrameWindow= this.config.iFrameWindow;
        console.log(iFrameDom);
        console.log(iFrameWindow);
        console.log(iFrameWindow.document);
        const script = iFrameWindow.document.createElement('script')
        script.type = 'text/javascript'
        script.async = true
        script.defer = true
        script.src = src
        return script
    }

    getAmapuiPromise() {
        if (this.config.iFrameWindow.AMapUI) {
            return Promise.resolve()
        }
        const script = this.buildScriptTag(`${this.protocol}//webapi.amap.com/ui/1.0/main-async.js`)
        const p = new Promise(resolve => {
            script.onload = () => {
                resolve()
            }
        })
        this.config.iFrameWindow.document.body.appendChild(script)
        return p
    }

    getMainPromise() {
        if (this.config.iFrameWindow.AMap) {
            return Promise.resolve()
        }
        const script = this.buildScriptTag(this.getScriptSrc(this.config))
        const p = new Promise(resolve => {
            this.config.iFrameWindow[this.config.callback] = () => {
                resolve()
                delete this.config.iFrameWindow[this.config.callback]
            }
        })
        this.config.iFrameWindow.document.body.appendChild(script)
        return p
    }

    load() {
        if (typeof window === 'undefined') {
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
                        if (this.config.iFrameWindow.initAMapUI && !amapuiInited) {
                            this.config.iFrameWindow.initAMapUI()
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
