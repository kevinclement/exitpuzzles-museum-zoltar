let Manager = require('./manager')

module.exports = class ClockManager extends Manager {
    constructor(opts) {

        // Bluetooth device name: ExitMuseumClock
        let bt = new (require('./serial.bluetooth'))({
            name: opts.name,
            address: '30:AE:A4:21:0E:BE', // TODO: use proper clock 
            channel: 1,
            logger: opts.logger
        });

        let ref = opts.fb.db.ref('museum/devices/clock')

        let incoming = [];
        let handlers = {};

        super({ ...opts, bt: bt, handlers: handlers, incoming:incoming })

        // setup supported commands
        handlers['clock.open'] = (s,cb) => {
            bt.write('solve', (err) => {
                if (err) {
                    s.ref.update({ 'error': err });
                }
                cb()
            });
        }

        handlers['clock.reboot'] = (s,cb) => {
            bt.write('reboot', (err) => {
                if (err) {
                    s.ref.update({ 'error': err });
                } else {
                    // go ahead and update the db and let it know we're disconnected since we will time out
                    this.ref.child('info').update({ isConnected: false })

                    // tell blootooth to disconnecto make reconnect faster
                    setTimeout(() => {
                        bt.disconnect();
                    }, 10000) 
                }
                cb()
            });
        }

        // setup supported device output parsing
        incoming.push(
            {
                pattern:/.*status=(.*)/,
                match: (m) => {
                    m[1].split(',').forEach((s)=> {
                        let p = s.split(/:(.+)/);
                        switch(p[0]) {
                            case "version": 
                                this.version = p[1]
                                break
                            case "gitDate": 
                                this.gitDate = p[1]
                                break 
                            case "buildDate": 
                                this.buildDate = p[1]
                                break
    
                            case "solved": 
                                this.solved = (p[1] === 'true')
                                break
                            case "hs": 
                                this.lights = (p[1] === 'true')
                                break
                            case "ms": 
                                this.magnet = (p[1] === 'true')
                                break
                        }
                    })
    
                    ref.child('info/build').update({
                        version: this.version,
                        date: this.buildDate,
                        gitDate: this.gitDate
                    })
    
                    ref.update({
                        solved: this.solved,
                        hs: this.hs,
                        ms: this.ms
                    })
                }
            });

        this.ref = ref
        this.serial = bt
        this.logger = opts.logger

        this.enabled = false
        this.hs = false
        this.ms = false
    }
    
    activity() {
        this.ref.child('info').update({
            lastActivity: (new Date()).toLocaleString()
       })
    }

   connecting() {
       // NOTE: while connecting, mark device as disabled, since it defaults to that
       this.ref.child('info').update({
           isConnected: false
       })
   }

   connected() {
        this.bt.write('status')

       this.ref.child('info').update({
           isConnected: true,
           lastActivity: (new Date()).toLocaleString()
       })
    }
}