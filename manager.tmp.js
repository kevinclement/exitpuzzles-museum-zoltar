let Manager = require('./manager')

module.exports = class PaintingManager extends Manager {
    constructor(opts) {
        let bt = new (require('./bluetooth'))({
            name: opts.name,
            address: '30:AE:A4:06:48:CA',
            channel: 1,
            logger: opts.logger
        });

        let paintingRef = opts.fb.db.ref('painting')

        let handlers = [
            new (require('./handler.paint.drop'))({ ...opts, bt: bt }),
            new (require('./handler.paint.get.status'))({ ...opts, bt: bt }),
            new (require('./handler.paint.set.enabled'))({ ...opts, bt: bt }),
            new (require('./handler.paint.set.manual'))({ ...opts, bt: bt }),
            new (require('./handler.paint.set.threshold'))({ ...opts, bt: bt }),
            new (require('./handler.paint.set.wait'))({ ...opts, bt: bt }),
            new (require('./handler.paint.state'))({ ...opts, bt: bt, paintingRef: paintingRef}),
        ];

        super({ ...opts, bt: bt, handlers: handlers })

        this.paintingRef = paintingRef
        this.logger = opts.logger;

        // listen for enabled state change in db and update our cache
        this.paintingRef.on('value', (snapshot) => {
            let painting = snapshot.val()
            if (painting == null) return
            
            this.enabled = painting.enabled
        })

        // listen for tnt light state changes and update device
        opts.state.stateChanged(()=> {
            if (this.enabled !== opts.state.lightDetected) {
                if (opts.state.lightDetected) {
                    this.logger.log('manager: painting: light change detected. enabling device')
                    this.bt.write('enable\n', (err) => {});
                }
                else {
                    this.logger.log('manager: painting: light change detected. disabling device')
                    this.bt.write('disable\n', (err) => {});
                }
            }
        })
    }

    activity() {
         this.paintingRef.update({
             lastActivity: (new Date()).toLocaleString()
        })
    }

    connecting() {
        // NOTE: while connecting, mark device as disabled, since it defaults to that
        this.paintingRef.update({
            isConnected: false
        })
    }

    connected() {
        this.paintingRef.update({
            isConnected: true
        })
    }
}